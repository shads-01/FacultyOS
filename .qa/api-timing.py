"""Direct API test: sign in via UI, then POST /api/grade and /api/grader-consistency, time them."""
import time, json
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(BASE + '/login', wait_until='networkidle')
    page.get_by_role('button', name='Explore the demo account').click()
    page.wait_for_url('**/dashboard', timeout=20000)
    cookies = page.context.cookies(BASE)
    cookie_header = '; '.join(f"{c['name']}={c['value']}" for c in cookies)

    # grab demo inputs from the page source via mockResponses
    import subprocess
    payload_src = open(r'D:\Projects\carnival-hackathon-8.0\src\components\mockResponses.js', encoding='utf-8').read()

    for route, keys in [('grade', ['rubric', 'modelAnswer', 'studentAnswers', 'humanScores']),
                        ('grader-consistency', ['rubric', 'studentAnswers', 'graderScores'])]:
        # extract demoInputs.<key> from mockResponses.js
        import re
        m = re.search(rf"{route.replace('-', '-')}\s*:\s*\{{(.*?)\n  \}}", payload_src, re.S)
        # simpler: eval in node
        node = subprocess.run(['node', '-e', f'''
            const {{ demoInputs }} = require("D:/Projects/carnival-hackathon-8.0/src/components/mockResponses.js");
            const key = {json.dumps({'grade': 'grade', 'grader-consistency': 'consistency'}[route])};
            console.log(JSON.stringify(demoInputs[key]));
        '''], capture_output=True, text=True)
        if node.returncode != 0:
            print('node err', node.stderr[:300]); continue
        payload = json.loads(node.stdout)
        t0 = time.time()
        resp = page.request.post(BASE + f'/api/{route}', data=json.dumps(payload),
                                 headers={'content-type': 'application/json'})
        dt = time.time() - t0
        body = resp.text()[:300]
        print(f'API {route}: {resp.status} in {dt:.1f}s -> {body}')
    browser.close()
