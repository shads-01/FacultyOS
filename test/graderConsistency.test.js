/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON } = require('../lib/graderConsistency');

test('parseNumberedAnswers strips numbering', () => {
  const result = parseNumberedAnswers('1. The answer is 42.\n2) It depends on the input size.');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'The answer is 42.' },
    { number: 2, text: 'It depends on the input size.' },
  ]);
});

test('parseGraderScores parses grader,answerNumber,score triples', () => {
  const result = parseGraderScores('Alex,1,8\nJordan,1,6\nAlex,2,9');
  assert.deepStrictEqual(result, [
    { grader: 'Alex', answerNumber: 1, score: 8 },
    { grader: 'Jordan', answerNumber: 1, score: 6 },
    { grader: 'Alex', answerNumber: 2, score: 9 },
  ]);
});

test('buildGraderConsistencyPrompt embeds rubric, answers, and scores', () => {
  const prompt = buildGraderConsistencyPrompt({
    rubric: 'Award full credit for a correct time complexity with justification.',
    answers: [{ number: 1, text: 'O(log n) because it halves the search space.' }],
    scores: [{ grader: 'Alex', answerNumber: 1, score: 8 }],
  });
  assert.match(prompt, /Award full credit/);
  assert.match(prompt, /A1: O\(log n\)/);
  assert.match(prompt, /Alex scored A1: 8/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('parseConsistencyJSON parses flags', () => {
  const result = parseConsistencyJSON('{"flags":[{"answerA":"A1","answerB":"A3","scoreA":8,"scoreB":5,"grader":"Alex"}]}');
  assert.strictEqual(result.flags.length, 1);
  assert.strictEqual(result.flags[0].grader, 'Alex');
});

test('parseConsistencyJSON throws on missing flags array', () => {
  assert.throws(() => parseConsistencyJSON('{"foo":1}'), /missing "flags" array/);
});
