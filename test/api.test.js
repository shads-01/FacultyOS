/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { runFeature } = require('../src/lib/api');

test('runFeature posts payload to /api/<screen> and returns json', async () => {
  const originalFetch = global.fetch;
  let calledUrl = '';
  let calledOptions = null;
  global.fetch = async (url, options) => {
    calledUrl = url;
    calledOptions = options;
    return {
      ok: true,
      json: async () => ({ success: true, clos: ['CLO1'] }),
    };
  };

  try {
    const result = await runFeature('analyze', { test: 123 });
    assert.strictEqual(calledUrl, '/api/analyze');
    assert.strictEqual(calledOptions.method, 'POST');
    assert.strictEqual(calledOptions.headers['content-type'], 'application/json');
    assert.strictEqual(calledOptions.body, JSON.stringify({ test: 123 }));
    assert.deepStrictEqual(result, { success: true, clos: ['CLO1'] });
  } finally {
    global.fetch = originalFetch;
  }
});

test('runFeature throws error when response is not ok', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: 'Missing required field' }),
  });

  try {
    await assert.rejects(
      () => runFeature('analyze', {}),
      /Missing required field/
    );
  } finally {
    global.fetch = originalFetch;
  }
});

