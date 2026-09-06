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

function parseHumanScores(text) {
  const map = new Map();
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [answerNumber, score] = line.split(',').map((s) => s.trim());
      map.set(Number(answerNumber), Number(score));
    });
  return map;
}

function buildGradePrompt({ rubric, modelAnswer, answers, humanScores }) {
  const answerList = answers
    .map((a) => {
      const human = humanScores.get(a.number);
      const humanLine = human !== undefined ? `\nHuman score for A${a.number}: ${human}` : '';
      return `A${a.number}: ${a.text}${humanLine}`;
    })
    .join('\n');

  return `You are anchoring student answers against a rubric and a model answer.

RUBRIC:
${rubric}

MODEL ANSWER:
${modelAnswer}

STUDENT ANSWERS:
${answerList}

For each student answer, assign an AI anchor score (0-10) against the rubric and model answer, and give a one-sentence reason. If a human score was given for that answer, include it verbatim; otherwise use null.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "results": [
    { "answer": "A1: O(log n).", "humanScore": 6, "aiScore": 9, "reason": "Correct and justified, slightly terse." }
  ]
}`;
}

function parseGradeJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error('Model response missing "results" array');
  }
  const results = parsed.results.map((r) => ({
    answer: r.answer,
    humanScore: r.humanScore ?? null,
    aiScore: r.aiScore,
    delta: r.humanScore == null ? null : r.aiScore - r.humanScore,
    reason: r.reason,
  }));
  return { results };
}

module.exports = { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON };
