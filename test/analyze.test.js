/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } = require('../lib/analyze');

test('parseCLOs extracts explicit CLO ids', () => {
  const result = parseCLOs('CLO1: Explain time complexity\nCLO2: Implement recursion');
  assert.deepStrictEqual(result, [
    { id: 'CLO1', text: 'Explain time complexity' },
    { id: 'CLO2', text: 'Implement recursion' },
  ]);
});

test('parseCLOs auto-numbers lines with no CLO prefix', () => {
  const result = parseCLOs('Explain time complexity\nImplement recursion');
  assert.deepStrictEqual(result, [
    { id: 'CLO1', text: 'Explain time complexity' },
    { id: 'CLO2', text: 'Implement recursion' },
  ]);
});

test('parseNumberedQuestions strips numbering and uses "number" as the key', () => {
  const result = parseNumberedQuestions('1. What is Big-O?\n2) Define recursion');
  assert.deepStrictEqual(result, [
    { number: 1, text: 'What is Big-O?' },
    { number: 2, text: 'Define recursion' },
  ]);
});

test('parsePastExams groups questions under year headers', () => {
  const result = parsePastExams('2024\n1. Old question A\n2. Old question B\n\n2022\n1. Older question');
  assert.deepStrictEqual(result, [
    { year: '2024', questions: ['Old question A', 'Old question B'] },
    { year: '2022', questions: ['Older question'] },
  ]);
});

test('buildPrompt embeds CLOs, questions (by number), and past exams', () => {
  const prompt = buildPrompt({
    clos: [{ id: 'CLO1', text: 'Explain recursion' }],
    questions: [{ number: 1, text: 'Define recursion' }],
    pastExams: [{ year: '2024', questions: ['Define recursion in your own words'] }],
  });
  assert.match(prompt, /CLO1: Explain recursion/);
  assert.match(prompt, /Q1: Define recursion/);
  assert.match(prompt, /Year 2024:/);
  assert.match(prompt, /Respond with ONLY valid JSON/);
});

test('buildPrompt handles no past exams', () => {
  const prompt = buildPrompt({ clos: [], questions: [], pastExams: [] });
  assert.match(prompt, /\(none provided\)/);
});

test('parseModelJSON parses raw JSON using questionNumber/coveredCLOs keys', () => {
  const result = parseModelJSON('{"questions":[{"questionNumber":1,"coveredCLOs":["CLO1"],"bloom":"Apply","topic":"Recursion"}]}');
  assert.strictEqual(result.questions.length, 1);
  assert.strictEqual(result.questions[0].questionNumber, 1);
  assert.deepStrictEqual(result.questions[0].coveredCLOs, ['CLO1']);
});

test('parseModelJSON normalizes a missing similarity to null and missing coveredCLOs to []', () => {
  const result = parseModelJSON('{"questions":[{"questionNumber":1,"bloom":"Apply","topic":"t"}]}');
  assert.strictEqual(result.questions[0].similarity, null);
  assert.deepStrictEqual(result.questions[0].coveredCLOs, []);
});

test('parseModelJSON strips markdown code fences', () => {
  const result = parseModelJSON('```json\n{"questions":[]}\n```');
  assert.deepStrictEqual(result.questions, []);
});

test('parseModelJSON throws on missing questions array', () => {
  assert.throws(() => parseModelJSON('{"foo":1}'), /missing "questions" array/);
});

