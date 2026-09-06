const { test } = require('node:test');
const assert = require('node:assert');
const { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON } = require('../lib/grade');

test('parseNumberedAnswers strips numbering', () => {
  const result = parseNumberedAnswers('1. The answer is 42.\n2) It depends on the input size.');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'The answer is 42.' },
    { number: 2, text: 'It depends on the input size.' },
  ]);
});

test('parseHumanScores maps answerNumber to score', () => {
  const result = parseHumanScores('1,8\n2,6');
  assert.strictEqual(result.get(1), 8);
  assert.strictEqual(result.get(2), 6);
});

test('parseHumanScores returns an empty map for empty input', () => {
  const result = parseHumanScores('');
  assert.strictEqual(result.size, 0);
});

test('buildGradePrompt embeds rubric, model answer, student answers, and human scores when present', () => {
  const prompt = buildGradePrompt({
    rubric: 'Full credit for O(log n) with justification.',
    modelAnswer: 'O(log n), because the search space halves each step.',
    answers: [{ number: 1, text: 'O(log n).' }],
    humanScores: new Map([[1, 6]]),
  });
  assert.match(prompt, /Full credit for O\(log n\)/);
  assert.match(prompt, /O\(log n\), because the search space halves/);
  assert.match(prompt, /A1: O\(log n\)\./);
  assert.match(prompt, /Human score for A1: 6/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('buildGradePrompt omits human-score lines when none are given', () => {
  const prompt = buildGradePrompt({
    rubric: 'r', modelAnswer: 'm', answers: [{ number: 1, text: 'a' }], humanScores: new Map(),
  });
  assert.doesNotMatch(prompt, /Human score for/);
});

test('parseGradeJSON parses results and computes delta when a human score exists', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1: O(log n).","humanScore":6,"aiScore":9,"reason":"Correct and justified."}]}');
  assert.strictEqual(result.results[0].delta, 3);
});

test('parseGradeJSON sets delta to null when there is no human score', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1: O(log n).","humanScore":null,"aiScore":9,"reason":"Correct and justified."}]}');
  assert.strictEqual(result.results[0].delta, null);
});

test('parseGradeJSON throws on missing results array', () => {
  assert.throws(() => parseGradeJSON('{"foo":1}'), /missing "results" array/);
});

test('parseHumanScores ignores blank lines', () => {
  const result = parseHumanScores('1,8\n\n2,6\n');
  assert.strictEqual(result.size, 2);
});

test('parseGradeJSON handles a result with an explicit null humanScore', () => {
  const result = parseGradeJSON('{"results":[{"answer":"A1","humanScore":null,"aiScore":7,"reason":"r"}]}');
  assert.strictEqual(result.results[0].delta, null);
});
