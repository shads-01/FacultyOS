"""Full sweep: 4 features end-to-end on demo account + empty inputs + slow network + no-data fresh account."""
import sys, json
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUT = r'D:\Projects\carnival-hackathon-8.0\.qa\screens'
console_errors = []
results = []

def check(name, ok, detail=''):
    results.append(f'{"PASS" if ok else "FAIL"} | {name} | {detail}')
    print(f'{"PASS" if ok else "FAIL"} | {name} | {detail}')

def watch(page, tag):
    page.on('console', lambda m: console_errors.append(f'[{tag}][console.{m.type}] {m.text[:250]}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(f'[{tag}][pageerror] {str(e)[:250]}'))

def wait_for_text(page, text, timeout_ms=90000):
    page.wait_for_timeout(500)
    waited = 500
    while waited < timeout_ms:
        body = page.inner_text('body')
        if text.lower() in body.lower():
            return True
        page.wait_for_timeout(1000)
        waited += 1000
    return False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    watch(page, 'main')

    # ---------- sign in via demo ----------
    page.goto(BASE + '/login', wait_until='networkidle')
    page.get_by_role('button', name='Explore the demo account').click()
    page.wait_for_url('**/dashboard', timeout=20000)
    page.wait_for_load_state('networkidle')
    check('auth.demo-signin', True, page.url)

    # ---------- FEATURE 1: EXAM QUALITY ----------
    page.goto(BASE + '/exam-quality', wait_until='networkidle')

    # empty-input: wizard must NOT advance past step 0
    nxt = page.get_by_role('button', name='Next step')
    nxt.click()
    page.wait_for_timeout(400)
    step_txt = page.inner_text('body')
    check('exam.empty-input-blocked', 'STEP 1/3' in step_txt, 'still on step 1 after clicking Next with empty fields')

    # load example, walk wizard
    page.get_by_role('button', name='Load example').click()
    page.get_by_role('button', name='Next step').click()
    page.wait_for_timeout(300)
    body = page.inner_text('body')
    check('exam.review-step', 'STEP 2/3' in body, 'parsed input visible: ' + ('Parsed input' in body and 'chars' in body).__str__())
    page.get_by_role('button', name='Next step').click()
    page.wait_for_timeout(300)
    # now on report step, run audit
    run_btn = page.get_by_role('button', name='Run audit')
    check('exam.run-audit-button', run_btn.count() == 1)
    run_btn.click()
    loading_seen = wait_for_text(page, 'Working', 5000)
    check('exam.loading-state', loading_seen, 'Working… indicator appears')
    got_report = wait_for_text(page, 'CLO Coverage Matrix', 100000)
    check('exam.report-renders', got_report, 'CLO Coverage Matrix heading present')
    page.screenshot(path=OUT + r'\f1-exam-report.png', full_page=True)
    if got_report:
        # wow moment: blank row + recycled badge above the fold at 1440x900
        page.wait_for_timeout(1500)  # gsap reveal
        above_fold = page.evaluate('''() => {
            const els = [...document.querySelectorAll('.fz-match, [class*=match]')];
            return els.filter(e => e.getBoundingClientRect().top < 900 && e.getBoundingClientRect().top > 0).length;
        }''')
        body = page.inner_text('body')
        has_recycled = 'recycled questions' in body.lower()
        has_bloom = 'bloom' in body.lower()
        check('exam.report-sections', has_recycled and has_bloom, f'recycled={has_recycled} bloom={has_bloom}')
        print('WOW above-fold match elements:', above_fold)
    else:
        check('exam.report-renders', False, 'NO REPORT after 100s')
        print('BODY:', page.inner_text('body')[:600])

    # ---------- slow-network on overlap (delay API by 4s) ----------
    page.goto(BASE + '/syllabus-overlap', wait_until='networkidle')
    # empty submit -> expect error strip, no crash
    page.get_by_role('button', name='Compare syllabi').click()
    got_err = wait_for_text(page, 'required', 20000) or wait_for_text(page, 'error', 3000) or page.locator('.fz-strip').count() > 0
    check('overlap.empty-submit-error', page.locator('.fz-strip').count() > 0, 'error strip: ' + (page.locator('.fz-strip').first.inner_text()[:120] if page.locator('.fz-strip').count() else 'NONE'))

    import threading
    delayed = {'n': 0}
    def delay_route(route):
        delayed['n'] += 1
        if delayed['n'] == 1:
            t = threading.Timer(4.0, lambda: route.continue_())
            t.daemon = True
            t.start()
        else:
            route.continue_()

    page.route('**/api/overlap', delay_route)
    page.get_by_role('button', name='Load example').click()
    page.get_by_role('button', name='Compare syllabi').click()
    page.wait_for_timeout(500)
    btn_txt = page.get_by_role('button', name='Comparing…')
    check('overlap.slow-network-loading', btn_txt.count() == 1 and btn_txt.is_disabled(), 'button shows Comparing… and is disabled during 4s delay')
    got_overlap = wait_for_text(page, 'overlap', 100000)
    check('overlap.report-renders', got_overlap, 'Overlaps section present')
    page.screenshot(path=OUT + r'\f2-overlap.png', full_page=True)

    # ---------- FEATURE 3: GRADER CONSISTENCY ----------
    page.goto(BASE + '/grader-consistency', wait_until='networkidle')
    submit = page.locator('button[type="submit"]')
    submit.click()
    page.wait_for_timeout(800)
    check('gc.empty-submit-error', page.locator('.fz-strip').count() > 0, 'error strip: ' + (page.locator('.fz-strip').first.inner_text()[:120] if page.locator('.fz-strip').count() else 'NONE'))
    page.get_by_role('button', name='Load example').click()
    submit.click()
    got_gc = wait_for_text(page, 'Consistency', 100000) or wait_for_text(page, 'divergen', 3000) or wait_for_text(page, 'flag', 3000)
    page.screenshot(path=OUT + r'\f3-gc.png', full_page=True)
    body = page.inner_text('body')
    check('gc.report-or-error', got_gc or page.locator('.fz-strip').count() > 0, 'body snippet: ' + ' / '.join(body.split('\n')[:3]))
    print('GC BODY:', body[:400].replace('\n', ' | '))

    # ---------- FEATURE 4: AI GRADING ----------
    page.goto(BASE + '/ai-grading', wait_until='networkidle')
    page.get_by_role('button', name='Next step').click()
    page.wait_for_timeout(300)
    check('grade.empty-input-blocked', 'STEP 1/3' in page.inner_text('body'))
    page.get_by_role('button', name='Load example').click()
    page.get_by_role('button', name='Next step').click()
    page.wait_for_timeout(300)
    page.get_by_role('button', name='Next step').click()
    page.wait_for_timeout(300)
    page.get_by_role('button', name='Score answers').click()
    got_grade = wait_for_text(page, 'anchor', 100000) or wait_for_text(page, 'Score', 3000)
    # GradingTable marker: check table rendered
    page.screenshot(path=OUT + r'\f4-grade.png', full_page=True)
    body = page.inner_text('body')
    check('grade.report-renders', 'AI-Anchored Grading' in body and ('delta' in body.lower() or 'anchor' in body.lower() or page.locator('table').count() > 1), 'tables=' + str(page.locator('table').count()))
    print('GRADE BODY:', body[:400].replace('\n', ' | '))

    # ---------- HISTORY + DASHBOARD (run persisted) ----------
    page.goto(BASE + '/history', wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT + r'\f5-history.png', full_page=True)
    body = page.inner_text('body')
    has_run = 'exam-quality' in body.lower() or 'exam quality' in body.lower() or 'run' in body.lower()
    check('history.shows-runs', 'No runs' not in body and 'no runs' not in body.lower(), 'empty-state? ' + ('empty' if 'no runs' in body.lower() else 'has content'))
    print('HISTORY BODY:', body[:300].replace('\n', ' | '))
    page.goto(BASE + '/dashboard', wait_until='networkidle')
    page.wait_for_timeout(1000)
    check('dashboard.renders', 'FACULTY OS' in page.inner_text('body'))

    # ---------- NO-DATA: fresh signup account ----------
    ctx2 = browser.new_context(viewport={'width': 1440, 'height': 900})
    p2 = ctx2.new_page()
    watch(p2, 'nodata')
    p2.goto(BASE + '/signup', wait_until='networkidle')
    p2.screenshot(path=OUT + r'\f6-signup.png')
    email = f'qa-sweep-{int(__import__("time").time())}@test.facultyos.app'
    pw = 'qatest1234'
    # discover signup form fields
    inputs = p2.locator('input')
    print('signup inputs:', inputs.count())
    inputs.nth(0).fill(email)
    inputs.nth(1).fill(pw)
    # optional name field?
    if inputs.count() > 2:
        inputs.nth(2).fill('QA Tester')
    p2.locator('button[type="submit"]').click()
    try:
        p2.wait_for_url('**/dashboard', timeout=20000)
        check('nodata.signup-lands-dashboard', True, p2.url)
    except Exception as e:
        check('nodata.signup-lands-dashboard', False, str(e)[:150])
    p2.wait_for_load_state('networkidle')
    p2.wait_for_timeout(1500)
    p2.screenshot(path=OUT + r'\f7-nodata-dashboard.png', full_page=True)
    dbody = p2.inner_text('body')
    check('nodata.dashboard-empty-state', 'FACULTY OS' in dbody and 'Internal Server Error' not in dbody and 'Application error' not in dbody, 'no crash on empty dashboard')
    p2.goto(BASE + '/history', wait_until='networkidle')
    p2.wait_for_timeout(1500)
    p2.screenshot(path=OUT + r'\f8-nodata-history.png', full_page=True)
    hbody = p2.inner_text('body')
    check('nodata.history-empty-state', 'Application error' not in hbody and 'Internal Server Error' not in hbody, 'no crash on empty history')
    print('NODATA HISTORY:', hbody[:300].replace('\n', ' | '))

    browser.close()

print('\n=== SWEEP SUMMARY ===')
print('\n'.join(results))
print('\n=== CONSOLE ERRORS (deduped) ===')
seen = set()
for e in console_errors:
    if e not in seen:
        seen.add(e)
        print(e)
if not console_errors:
    print('(none)')
