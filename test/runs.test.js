const { test } = require('node:test');
const assert = require('node:assert');

test('GET /api/runs requires Authorization header', async () => {
  const { GET } = await import('../src/app/api/runs/route.js');
  const req = new Request('http://localhost:3000/api/runs', {
    method: 'GET',
    headers: {},
  });

  const res = await GET(req);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /Missing Authorization/);
});
