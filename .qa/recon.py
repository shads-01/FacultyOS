"""Recon pass: auth flow + page states. Captures console errors and screenshots."""
import sys, json, re
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUT = r'D:\Projects\carnival-hackathon-8.0\.qa\screens'
errors = []

def on_console(msg):
    if msg.type in ('error',):
        errors.append(f'[{msg.type}] {msg.text[:300]}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('console', on_console)
    page.on('pageerror', lambda e: errors.append(f'[pageerror] {e}'))

    # 1. signed-out visitor -> should land on /login
    page.goto(BASE + '/', wait_until='networkidle')
    print('STEP1 signed-out / ->', page.url)
    page.screenshot(path=OUT + r'\01-login.png')

    # 2. bad credentials -> error shown, no crash
    page.fill('#fz-email', 'nobody@test.invalid')
    page.fill('#fz-password', 'wrongpass')
    page.get_by_role('button', name='Log in').click()
    page.wait_for_timeout(3000)
    alert = page.locator('[role="alert"]')
    print('STEP2 bad-creds alert visible:', alert.count() > 0, '| url:', page.url)
    page.screenshot(path=OUT + r'\02-bad-creds.png')

    # 3. demo sign-in
    page.get_by_role('button', name='Explore the demo account').click()
    try:
        page.wait_for_url('**/dashboard', timeout=20000)
        print('STEP3 demo signin ->', page.url)
    except Exception:
        print('STEP3 demo signin FAILED, still at', page.url)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    page.screenshot(path=OUT + r'\03-dashboard.png', full_page=True)
    print('STEP3 dashboard text head:', ' | '.join(page.inner_text('body').split('\n')[:25]))

    # nav to each screen signed in
    for route in ['/exam-quality', '/syllabus-overlap', '/grader-consistency', '/ai-grading', '/history', '/profile']:
        page.goto(BASE + route, wait_until='networkidle')
        page.wait_for_timeout(800)
        body = page.inner_text('body')
        print(f'NAV {route}: title-snippet={body.splitlines()[0][:60]!r} lines={len(body.splitlines())}')
        page.screenshot(path=OUT + r'\nav' + route.replace('/', '-') + '.png', full_page=True)

    browser.close()

print('\n--- CONSOLE ERRORS ---')
print('\n'.join(errors) if errors else '(none)')
