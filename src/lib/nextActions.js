function buildNextActions(screen, report) {
  if (!report) return [];
  if (screen === 'analyze') {
    const actions = [];
    const covered = new Set((report.analysis || []).flatMap((a) => a.coveredCLOs || []));
    for (const clo of report.clos || []) {
      if (!covered.has(clo.id)) {
        actions.push(`${clo.id} untested — add a question at Analyze level`);
      }
    }
    for (const a of report.analysis || []) {
      if (a.similarity && a.similarity.percent >= 80) {
        actions.push(`rewrite Q${a.questionNumber} or retire it — ${a.similarity.percent}% match to ${a.similarity.year} ${a.similarity.matchedQuestion}`);
      }
    }
    return actions;
  }
  if (screen === 'overlap') {
    const actions = [];
    for (const o of report.overlaps || []) {
      if (o.overlapPercent >= 80) actions.push(`differentiate or drop ${o.topic} — ${o.overlapPercent}% overlap with ${o.existingCourse}`);
    }
    for (const gap of report.gaps || []) actions.push(`gap: ${gap} not covered — add or justify`);
    return actions;
  }
  if (screen === 'grader-consistency') {
    const n = (report.flags || []).length;
    return n === 0 ? ['graders are aligned — no action needed'] : [`${n} divergent pairs — recalibrate with the grader`];
  }
  if (screen === 'grade') {
    const actions = [];
    for (const r of report.results || []) {
      if (r.delta !== null && r.delta !== undefined && Math.abs(r.delta) >= 3) {
        const id = (r.answer || '').split(':')[0] || 'answer';
        actions.push(`align rubric wording on ${id} — human ${r.humanScore ?? '—'} vs AI ${r.aiScore}`);
      }
    }
    return actions;
  }
  return [];
}

if (typeof module !== 'undefined') {
  module.exports = { buildNextActions };
}
