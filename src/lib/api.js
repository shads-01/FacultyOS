const mockResponses = require('../components/mockResponses');

const MOCKS = {
  analyze: () => mockResponses.analyzeResponse,
  overlap: () => mockResponses.overlapResponse,
  'grader-consistency': () => mockResponses.consistencyResponse,
  grade: () => mockResponses.gradeResponse,
};

function isDemoMode() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('fz-demo') !== 'off';
}

async function runFeature(screen, payload, mode) {
  const resolvedMode = mode || (isDemoMode() ? 'demo' : 'live');
  const mock = MOCKS[screen];
  if (!mock) throw new Error(`unknown screen: ${screen}`);
  if (resolvedMode !== 'demo') throw new Error('live mode not wired — backend routes pending');
  await new Promise((r) => setTimeout(r, 400));
  return mock();
}

if (typeof module !== 'undefined') {
  module.exports = { runFeature, isDemoMode };
}
