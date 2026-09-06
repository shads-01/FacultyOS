function buildCoverageMatrix(clos, questions, analysis) {
  const analysisByNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return clos.map((clo) => {
    const covered = questions.map((q) => {
      const a = analysisByNumber.get(q.number);
      return !!(a && a.coveredCLOs && a.coveredCLOs.includes(clo.id));
    });
    return { clo, covered, isBlank: covered.every((c) => !c) };
  });
}

function buildRecycledList(questions, analysis) {
  const analysisByNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return questions
    .map((q) => ({ question: q, similarity: (analysisByNumber.get(q.number) || {}).similarity || null }))
    .filter((item) => item.similarity && item.similarity.percent >= 60)
    .sort((a, b) => b.similarity.percent - a.similarity.percent);
}

function buildBloomDistribution(analysis) {
  const levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const counts = Object.fromEntries(levels.map((l) => [l, 0]));
  for (const a of analysis) {
    if (counts[a.bloom] !== undefined) counts[a.bloom]++;
  }
  return levels.map((level) => ({ level, count: counts[level] }));
}

if (typeof module !== 'undefined') {
  module.exports = { buildCoverageMatrix, buildRecycledList, buildBloomDistribution };
}
