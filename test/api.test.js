/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { runFeature } = require('../src/lib/api');

test('runFeature resolves the analyze mock in demo mode', async () => {
  const result = await runFeature('analyze', {}, 'demo');
  assert.ok(Array.isArray(result.clos));
  assert.ok(Array.isArray(result.analysis));
});

test('runFeature routes each screen to its own mock', async () => {
  const overlap = await runFeature('overlap', {}, 'demo');
  assert.ok(Array.isArray(overlap.overlaps));
  const consistency = await runFeature('grader-consistency', {}, 'demo');
  assert.ok(Array.isArray(consistency.flags));
  const grade = await runFeature('grade', {}, 'demo');
  assert.ok(Array.isArray(grade.results));
});

test('runFeature throws in live mode (backend not wired yet)', async () => {
  await assert.rejects(() => runFeature('analyze', {}, 'live'), /live mode not wired/);
});

test('runFeature rejects unknown screens', async () => {
  await assert.rejects(() => runFeature('nope', {}, 'demo'), /unknown screen/);
});
