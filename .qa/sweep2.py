"""Focused: GC + Grade full UI flows (retry on Gemini 503), signup + no-data empty states."""
import time, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUT = r'D:\Projects\carnival-hackathon-8.0\.qa\screens'
console_errors = []
results = []

def check(name, ok, detail=''):
    results.append(f'{"PASS" if ok else "FAIL"} | {name} | {detail}')
    print(f'{"PASS" if ok else "FAIL"} | {name} | {detail}')

def wait_for_any(page, texts, timeout_ms=120000):
    waited = 0
    while waited < timeout_ms:
        body = page.inner_text('body').lower()
        for t in texts:
            if t.lower() in body:
                return t
        page.wait_for_timeout(1000)
        waited += 1000
    return None

def watch(page, tag):
    page.on('console', lambda m: console_errors.append(f'[{tag}] {m.text[:200]}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(f'[{tag}][pageerror] {str(e)[:200]}'))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    watch(page, 'main')

    page.goto(BASE + '/login', wait_until='networkidle')
    page.get_by_role('button', name='Explore the demo account').click()
    page.wait_for_url('**/dashboard', timeout=20000)
    check('auth.demo-signin', True)

    # ---- GRADER CONSISTENCY (retry up to 3x on 503) ----
    for attempt in range(3):
        page.goto(BASE + '/grader-consistency', wait_until='networkidle')
        page.get_by_role('button', name='Load example').click()
        page.locator('button[type="submit"]').click()
        found = wait_for_any(page, ['Answer A', 'Internal', 'API error', 'Gemini API error', 'divergen'], 120000)
        if found == 'Answer A':
            check(f'gc.report-renders', True, f'attempt {attempt+1}')
            break
        if found is None:
            check(f'gc.report-renders', False, f'attempt {attempt+1}: timeout, no marker')
            break
        print(f'gc attempt {attempt+1}: got error ({found}), retrying...')
        page.wait_for_timeout(5000)
    else:
        check('gc.report-renders', False, 'all 3 attempts got upstream 503')
    page.screenshot(path=OUT + r'\f3b-gc-final.png', full_page=True)
    print('GC BODY:', page.inner_text('body')[:350].replace('\n', ' | '))

    # ---- AI GRADING (retry up to 3x) ----
    for attempt in range(3):
        page.goto(BASE + '/ai-grading', wait_until='networkidle')
        page.get_by_role('button', name='Load example').click()
        page.get_by_role('button', name='Next step').click()
        page.wait_for_timeout(300)
        page.get_by_role('button', name='Next step').click()
        page.wait_for_timeout(300)
        page.get_by_role('button', name='Score answers').click()
        found = wait_for_any(page, ['AI Score', 'API error', 'Gemini API error', 'Internal'], 120000)
        if found == 'AI Score':
            check('grade.report-renders', True, f'attempt {attempt+1}, table=' + str(page.locator('table').count()))
            break
        if found is None:
            check('grade.report-renders', False, f'attempt {attempt+1}: timeout')
            break
        print(f'grade attempt {attempt+1}: got error ({found}), retrying...')
        page.wait_for_timeout(5000)
    else:
        check('grade.report-renders', False, 'all 3 attempts got upstream 503')
    page.screenshot(path=OUT + r'\f4b-grade-final.png', full_page=True)

    # ---- SIGNUP + NO-DATA (correct selectors) ----
    ctx2 = browser.new_context(viewport={'width': 1440, 'height': 900})
    p2 = ctx2.new_page()
    watch(p2, 'nodata')
    p2.goto(BASE + '/signup', wait_until='networkidle')
    email = f'qa-sweep-{int(time.time())}@test.facultyos.app'
    p2.fill('#fz-name', 'QA Tester')
    p2.fill('#fz-email', email)
    p2.fill('#fz-password', 'qatest1234')
    p2.locator('button[type="submit"]').click()
    try:
        p2.wait_for_url('**/dashboard', timeout=25000)
        check('nodata.signup-lands-dashboard', True, p2.url)
    except Exception:
        check('nodata.signup-lands-dashboard', False, 'still at ' + p2.url + ' | alert: ' + (p2.locator('[role=alert]').inner_text()[:120] if p2.locator('[role=alert]').count() else 'none'))
    p2.wait_for_load_state('networkidle')
    p2.wait_for_timeout(1500)
    dbody = p2.inner_text('body')
    check('nodata.dashboard-empty-state', 'Application error' not in dbody and 'Internal Server Error' not in dbody, 'no crash; has empty-state text: ' + str('no runs' in dbody.lower() or 'history' in dbody.lower()))
    p2.screenshot(path=OUT + r'\f7b-nodata-dashboard.png', full_page=True)
    p2.goto(BASE + '/history', wait_until='networkidle')
    p2.wait_for_timeout(1500)
    hbody = p2.inner_text('body')
    check('nodata.history-empty-state', 'Application error' not in hbody and 'Internal Server Error' not in hbody, 'no crash on empty history')
    p2.screenshot(path=OUT + r'\f8b-nodata-history.png', full_page=True)
    print('NODATA HISTORY:', hbody[:300].replace('\n', ' | '))

    # ---- SIGNUP back-link + logout ----
    p2.goto(BASE + '/profile', wait_until='networkidle')
    p2.wait_for_timeout(1000)
    check('profile.renders', 'Application error' not in p2.inner_text('body'))
    p2.screenshot(path=OUT + r'\f9-profile.png', full_page=True)

    browser.close()

print('\n=== SUMMARY ===')
print('\n'.join(results))
