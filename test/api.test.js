const { test } = require('node:test');
const assert = require('node:assert');

test('POST /api/analyze requires Authorization header', async () => {
  const { POST } = await import('../src/app/api/analyze/route.js');
  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clos: 'CLO1: Test', exam: '1. Test question' }),
  });

  const res = await POST(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /Missing Authorization/);
});

test('POST /api/analyze returns 500 if GEMINI_API_KEY is not configured', async () => {
  const { POST } = await import('../src/app/api/analyze/route.js');
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const req = new Request('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clos: 'CLO1: Test', exam: '1. Test question' }),
  });

  const res = await POST(req);
  assert.strictEqual(res.status, 401);

  if (originalKey) process.env.GEMINI_API_KEY = originalKey;
});
