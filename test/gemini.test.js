/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { parseApiKeys, isRateLimited, callGeminiWithRotation } = require('../lib/gemini');

function fakeRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

test('parseApiKeys splits comma-separated keys and trims whitespace', () => {
  assert.deepStrictEqual(parseApiKeys('key1, key2 ,key3'), ['key1', 'key2', 'key3']);
});

test('parseApiKeys drops empty entries from stray/trailing commas', () => {
  assert.deepStrictEqual(parseApiKeys('key1,,key2,'), ['key1', 'key2']);
});

test('parseApiKeys returns empty array for undefined/blank input', () => {
  assert.deepStrictEqual(parseApiKeys(undefined), []);
  assert.deepStrictEqual(parseApiKeys(''), []);
});

test('isRateLimited is true only for HTTP 429', () => {
  assert.strictEqual(isRateLimited(429), true);
  assert.strictEqual(isRateLimited(500), false);
  assert.strictEqual(isRateLimited(200), false);
});

test('callGeminiWithRotation returns 500 when no keys are configured', async () => {
  const result = await callGeminiWithRotation({ apiKeys: [], prompt: 'hi', maxOutputTokens: 10 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 500);
  assert.match(result.error, /GEMINI_API_KEY not configured/);
});

test('callGeminiWithRotation succeeds on the first key without rotating', async () => {
  const seenKeys = [];
  const fetchImpl = async (url, opts) => {
    seenKeys.push(opts.headers['x-goog-api-key']);
    return fakeRes(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
  };
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA', 'keyB'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 0,
    fetchImpl,
  });
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(seenKeys, ['keyA']);
  assert.strictEqual(result.nextIndex, 0);
});

test('callGeminiWithRotation moves to the next key when the current one is rate-limited', async () => {
  const seenKeys = [];
  const fetchImpl = async (url, opts) => {
    const key = opts.headers['x-goog-api-key'];
    seenKeys.push(key);
    if (key === 'keyA') return fakeRes(429, 'rate limited');
    return fakeRes(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] });
  };
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA', 'keyB'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 0,
    fetchImpl,
  });
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(seenKeys, ['keyA', 'keyB']);
  assert.strictEqual(result.nextIndex, 1);
});

test('callGeminiWithRotation starts from a given startIndex (sticky rotation)', async () => {
  const seenKeys = [];
  const fetchImpl = async (url, opts) => {
    seenKeys.push(opts.headers['x-goog-api-key']);
    return fakeRes(200, { candidates: [] });
  };
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA', 'keyB', 'keyC'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 1,
    fetchImpl,
  });
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(seenKeys, ['keyB']);
  assert.strictEqual(result.nextIndex, 1);
});

test('callGeminiWithRotation returns 502 immediately on a non-rate-limit error, without trying other keys', async () => {
  const seenKeys = [];
  const fetchImpl = async (url, opts) => {
    seenKeys.push(opts.headers['x-goog-api-key']);
    return fakeRes(500, 'server exploded');
  };
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA', 'keyB'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 0,
    fetchImpl,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 502);
  assert.match(result.error, /server exploded/);
  assert.deepStrictEqual(seenKeys, ['keyA']);
});

test('callGeminiWithRotation returns 502 once every key is rate-limited', async () => {
  const fetchImpl = async () => fakeRes(429, 'rate limited');
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA', 'keyB'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 0,
    fetchImpl,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 502);
  assert.match(result.error, /rate limited/);
});

test('callGeminiWithRotation returns 502 when the fetch itself throws', async () => {
  const fetchImpl = async () => {
    throw new Error('network down');
  };
  const result = await callGeminiWithRotation({
    apiKeys: ['keyA'],
    prompt: 'hi',
    maxOutputTokens: 10,
    startIndex: 0,
    fetchImpl,
  });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.status, 502);
  assert.match(result.error, /network down/);
});
