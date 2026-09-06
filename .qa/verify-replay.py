"""Verify: history run expands (replay)."""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(BASE + '/login', wait_until='networkidle')
    page.get_by_role('button', name='Explore the demo account').click()
    page.wait_for_url('**/dashboard', timeout=20000)
    page.goto(BASE + '/history', wait_until='networkidle')
    page.wait_for_timeout(1500)
    rows = page.locator('button, [role="button"], .cursor-pointer')
    # click first run row
    page.get_by_text('CLOs').first.click()
    page.wait_for_timeout(1500)
    body = page.inner_text('body')
    print('expanded has matrix:', 'coverage' in body.lower())
    print('expanded has recycled:', 'recycled' in body.lower())
    page.screenshot(path=r'D:\Projects\carnival-hackathon-8.0\.qa\screens\f10-history-replay.png', full_page=True)
    browser.close()
