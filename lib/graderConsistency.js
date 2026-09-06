function parseNumberedAnswers(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parseGraderScores(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [grader, answerNumber, score] = line.split(',').map((s) => s.trim());
      return { grader, answerNumber: Number(answerNumber), score: Number(score) };
    });
}

function buildGraderConsistencyPrompt({ rubric, answers, scores }) {
  const answerList = answers.map((a) => `A${a.number}: ${a.text}`).join('\n');
  const scoreList = scores.map((s) => `${s.grader} scored A${s.answerNumber}: ${s.score}`).join('\n');

  return `You are checking for grading consistency across multiple graders on the same set of student answers.

RUBRIC:
${rubric}

STUDENT ANSWERS:
${answerList}

GRADER SCORES:
${scoreList}

Find pairs of answers that are substantively equivalent (same correctness and quality relative to the rubric, even if worded differently) but were scored differently by the same grader, OR the same answer scored very differently by different graders. For each such case, report the two answer labels, their scores, and which grader's scoring is in question (use the grader for a same-grader inconsistency; if it's cross-grader, use the grader who gave the outlier score).

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "flags": [
    { "answerA": "A1", "answerB": "A3", "scoreA": 8, "scoreB": 5, "grader": "Alex" }
  ]
}
Return an empty "flags" array if you find no inconsistencies.`;
}

function parseConsistencyJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.flags)) {
    throw new Error('Model response missing "flags" array');
  }
  return { flags: parsed.flags };
}

module.exports = { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON };
