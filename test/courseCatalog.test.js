/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { existingCourses } = require('../lib/courseCatalog');

test('existingCourses is a non-empty list of {course, topics}', () => {
  assert.ok(Array.isArray(existingCourses));
  assert.ok(existingCourses.length > 0);
  for (const entry of existingCourses) {
    assert.strictEqual(typeof entry.course, 'string');
    assert.ok(Array.isArray(entry.topics));
    assert.ok(entry.topics.every((t) => typeof t === 'string'));
  }
});
