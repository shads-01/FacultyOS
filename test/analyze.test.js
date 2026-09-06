const { test } = require('node:test');
const assert = require('node:assert');
const { parseCLOs, parseNumberedQuestions, parsePastExams } = require('../lib/analyze');

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
