/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert');
const { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } = require('../src/components/reportTransforms');

test('buildCoverageMatrix flags a CLO with zero covering questions as blank', () => {
  const clos = [{ id: 'CLO1', text: 'a' }, { id: 'CLO2', text: 'b' }];
  const questions = [{ number: 1, text: 'q1' }, { number: 2, text: 'q2' }];
  const analysis = [
    { questionNumber: 1, coveredCLOs: ['CLO1'], bloom: 'Apply', topic: 't', similarity: null },
    { questionNumber: 2, coveredCLOs: ['CLO1'], bloom: 'Apply', topic: 't', similarity: null },
  ];
  const matrix = buildCoverageMatrix(clos, questions, analysis);
  assert.strictEqual(matrix[0].isBlank, false);
  assert.strictEqual(matrix[1].isBlank, true);
});

test('buildRecycledList sorts by similarity percent descending and drops low matches', () => {
  const questions = [{ number: 1, text: 'q1' }, { number: 2, text: 'q2' }, { number: 3, text: 'q3' }];
  const analysis = [
    { questionNumber: 1, similarity: { year: '2024', matchedQuestion: 'Q1', percent: 65, reason: 'r' } },
    { questionNumber: 2, similarity: { year: '2024', matchedQuestion: 'Q2', percent: 92, reason: 'r' } },
    { questionNumber: 3, similarity: null },
  ];
  const result = buildRecycledList(questions, analysis);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].question.number, 2);
});

test('buildBloomDistribution counts every level including zero counts', () => {
  const analysis = [
    { questionNumber: 1, bloom: 'Apply' },
    { questionNumber: 2, bloom: 'Apply' },
    { questionNumber: 3, bloom: 'Remember' },
  ];
  const dist = buildBloomDistribution(analysis);
  const apply = dist.find((d) => d.level === 'Apply');
  const create = dist.find((d) => d.level === 'Create');
  assert.strictEqual(apply.count, 2);
  assert.strictEqual(create.count, 0);
});
