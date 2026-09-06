/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { parseTopics, buildOverlapPrompt, parseOverlapJSON } = require('../lib/overlap');

test('parseTopics splits one topic per line', () => {
  const result = parseTopics('Big-O notation\nRecursion\nSorting');
  assert.deepStrictEqual(result, ['Big-O notation', 'Recursion', 'Sorting']);
});

test('buildOverlapPrompt embeds the proposed topics and existing courses', () => {
  const prompt = buildOverlapPrompt({
    proposedTopics: ['Recursion'],
    existingCourses: [{ course: 'Intro to Algorithms', topics: ['Recursion', 'Sorting'] }],
  });
  assert.match(prompt, /Recursion/);
  assert.match(prompt, /Intro to Algorithms/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('parseOverlapJSON parses overlaps and gaps', () => {
  const result = parseOverlapJSON('{"overlaps":[{"topic":"Recursion","overlapPercent":90,"existingCourse":"Intro to Algorithms"}],"gaps":["Hash tables"]}');
  assert.strictEqual(result.overlaps.length, 1);
  assert.deepStrictEqual(result.gaps, ['Hash tables']);
});

test('parseOverlapJSON strips markdown fences and throws on missing keys', () => {
  const result = parseOverlapJSON('```json\n{"overlaps":[],"gaps":[]}\n```');
  assert.deepStrictEqual(result, { overlaps: [], gaps: [] });
  assert.throws(() => parseOverlapJSON('{"overlaps":[]}'), /missing "gaps" array/);
});

test('parseTopics ignores blank lines between topics', () => {
  assert.deepStrictEqual(parseTopics('Recursion\n\nSorting\n'), ['Recursion', 'Sorting']);
});
