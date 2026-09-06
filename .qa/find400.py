"""Capture the URL behind the 400 console error during demo session."""
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('response', lambda r: print(f'{r.status} {r.url[:140]}') if r.status >= 400 else None)
    page.goto(BASE + '/login', wait_until='networkidle')
    page.get_by_role('button', name='Explore the demo account').click()
    page.wait_for_url('**/dashboard', timeout=20000)
    page.wait_for_timeout(2000)
    for route in ['/exam-quality', '/history', '/profile']:
        page.goto(BASE + route, wait_until='networkidle')
        page.wait_for_timeout(1500)
    browser.close()
