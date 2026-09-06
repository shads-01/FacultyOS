const { test } = require('node:test');
const assert = require('node:assert');
const { parseAuthHeader } = require('../lib/supabase/serverClient');

test('parseAuthHeader extracts the token from a Bearer header', () => {
  assert.strictEqual(parseAuthHeader('Bearer abc123'), 'abc123');
});

test('parseAuthHeader is case-insensitive on the Bearer keyword', () => {
  assert.strictEqual(parseAuthHeader('bearer xyz'), 'xyz');
});

test('parseAuthHeader returns null for a missing or malformed header', () => {
  assert.strictEqual(parseAuthHeader(null), null);
  assert.strictEqual(parseAuthHeader(undefined), null);
  assert.strictEqual(parseAuthHeader('Basic abc123'), null);
});
