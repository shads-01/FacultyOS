/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { buildNextActions } = require('../src/lib/nextActions');

test('analyze: blank CLO produces add-question action', () => {
  const report = {
    clos: [{ id: 'CLO4', text: 'hash tables' }],
    questions: [{ number: 1, text: 'q' }],
    analysis: [{ questionNumber: 1, coveredCLOs: [], bloom: 'Apply', similarity: null }],
  };
  const actions = buildNextActions('analyze', report);
  assert.ok(actions.some((a) => a.includes('CLO4 untested') && a.includes('add a question')));
});

test('analyze: similarity >=80% produces rewrite action', () => {
  const report = {
    clos: [],
    questions: [{ number: 2, text: 'q2' }],
    analysis: [{ questionNumber: 2, coveredCLOs: [], bloom: 'Apply', similarity: { year: '2024', matchedQuestion: 'Q1', percent: 92, reason: 'r' } }],
  };
  const actions = buildNextActions('analyze', report);
  assert.ok(actions.some((a) => a.includes('rewrite Q2') && a.includes('92%')));
});

test('analyze: similarity <80% produces no rewrite action', () => {
  const report = {
    clos: [],
    questions: [{ number: 1, text: 'q1' }],
    analysis: [{ questionNumber: 1, coveredCLOs: [], bloom: 'Apply', similarity: { year: '2023', matchedQuestion: 'Q4', percent: 67, reason: 'r' } }],
  };
  const actions = buildNextActions('analyze', report);
  assert.strictEqual(actions.length, 0);
});

test('overlap: high overlap and gaps each produce an action', () => {
  const report = {
    overlaps: [{ topic: 'Recursion', overlapPercent: 90, existingCourse: 'Intro to Algorithms' }],
    gaps: ['Hash tables'],
  };
  const actions = buildNextActions('overlap', report);
  assert.strictEqual(actions.length, 2);
  assert.ok(actions[0].includes('differentiate or drop Recursion'));
  assert.ok(actions[1].includes('Hash tables'));
});

test('grader-consistency: flags produce recalibrate action', () => {
  const report = { flags: [{}, {}] };
  const actions = buildNextActions('grader-consistency', report);
  assert.strictEqual(actions.length, 1);
  assert.ok(actions[0].includes('2 divergent pairs'));
});

test('grade: |delta| >=3 produces rubric action', () => {
  const report = {
    results: [
      { answer: 'A3: Logarithmic.', humanScore: 10, aiScore: 6, delta: -4 },
      { answer: 'A1: fine.', humanScore: 9, aiScore: 9, delta: 0 },
    ],
  };
  const actions = buildNextActions('grade', report);
  assert.strictEqual(actions.length, 1);
  assert.ok(actions[0].includes('A3') && actions[0].includes('align rubric'));
});
