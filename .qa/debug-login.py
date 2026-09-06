"""Debug: what exactly happens on /login bad-creds submit."""
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
console_msgs = []
page_errors = []
requests = []
responses = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('console', lambda m: console_msgs.append(f'[{m.type}] {m.text[:400]}'))
    page.on('pageerror', lambda e: page_errors.append(str(e)[:600]))
    page.on('request', lambda r: requests.append(f'{r.method} {r.url[:160]}'))
    page.on('response', lambda r: responses.append(f'{r.status} {r.url[:160]}'))

    page.goto(BASE + '/login', wait_until='networkidle')
    print('AFTER LOAD body first lines:', page.inner_text('body').split('\n')[:8])
    print('buttons:', [b.inner_text() for b in page.locator('button').all()])

    page.fill('#fz-email', 'nobody@test.invalid')
    page.fill('#fz-password', 'wrongpass')
    page.get_by_role('button', name='Log in').click()
    page.wait_for_timeout(6000)
    print('\nURL after submit:', page.url)
    print('BODY:', page.inner_text('body')[:400])
    print('alert count:', page.locator('[role="alert"]').count())

    print('\n--- CONSOLE ---')
    print('\n'.join(console_msgs) or '(none)')
    print('--- PAGEERRORS ---')
    print('\n'.join(page_errors) or '(none)')
    print('--- REQUESTS (non-static) ---')
    for r in requests:
        if '_next/static' not in r and 'favicon' not in r:
            print(r)
    print('--- RESPONSES (non-static) ---')
    for r in responses:
        if '_next/static' not in r and 'favicon' not in r:
            print(r)
    browser.close()
