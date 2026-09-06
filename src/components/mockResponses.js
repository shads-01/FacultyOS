/**
 * Seeded demo input scenarios — used by the "Load data" dropdown on each feature
 * page to pre-fill textareas. These are input convenience data, NOT fake API
 * responses. Sourced directly from fixtures/ so there's one copy of the data.
 */
import analyzeDefault from '../../fixtures/analyze-example.json';

import overlapDefault from '../../fixtures/overlap-example.json';
import overlapNoOverlap from '../../fixtures/overlap-no-overlap.json';
import overlapHeavyOverlap from '../../fixtures/overlap-heavy-overlap.json';

import consistencyDefault from '../../fixtures/grader-consistency-example.json';
import consistencyCloseAgreement from '../../fixtures/grader-consistency-close-agreement.json';
import consistencyThreeGraders from '../../fixtures/grader-consistency-three-graders.json';

import gradeDefault from '../../fixtures/grade-example.json';
import gradeNoHumanScores from '../../fixtures/grade-no-human-scores.json';
import gradeLargeDisagreement from '../../fixtures/grade-large-disagreement.json';

export const demoInputs = {
  examQuality: [
    { key: 'default', label: 'Default example', data: analyzeDefault },
  ],
  overlap: [
    { key: 'default', label: 'Default example', data: overlapDefault },
    { key: 'no-overlap', label: 'No overlap', data: overlapNoOverlap },
    { key: 'heavy-overlap', label: 'Heavy overlap', data: overlapHeavyOverlap },
  ],
  consistency: [
    { key: 'default', label: 'Default example', data: consistencyDefault },
    { key: 'close-agreement', label: 'Close agreement', data: consistencyCloseAgreement },
    { key: 'three-graders', label: 'Three graders', data: consistencyThreeGraders },
  ],
  grade: [
    { key: 'default', label: 'Default example', data: gradeDefault },
    { key: 'no-human-scores', label: 'No human scores', data: gradeNoHumanScores },
    { key: 'large-disagreement', label: 'Large disagreement', data: gradeLargeDisagreement },
  ],
};
