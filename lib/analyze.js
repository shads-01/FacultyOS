function parseCLOs(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(CLO\s*\d+)\s*[:\-]\s*(.+)$/i);
      return m
        ? { id: m[1].replace(/\s+/g, '').toUpperCase(), text: m[2] }
        : { id: `CLO${i + 1}`, text: line };
    });
}

function parseNumberedQuestions(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      return { number: i + 1, text: m ? m[1] : line };
    });
}

function parsePastExams(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const years = [];
  let current = null;
  for (const line of lines) {
    if (!line) continue;
    const yearMatch = line.match(/^(\d{4})$/);
    if (yearMatch) {
      current = { year: yearMatch[1], questions: [] };
      years.push(current);
      continue;
    }
    const qMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
    if (current) current.questions.push(qMatch ? qMatch[1] : line);
  }
  return years;
}

function buildPrompt({ clos, questions, pastExams }) {
  const cloList = clos.map((c) => `${c.id}: ${c.text}`).join('\n');
  const questionList = questions.map((q) => `Q${q.number}: ${q.text}`).join('\n');
  const pastList = pastExams
    .map((y) => `Year ${y.year}:\n${y.questions.map((q, i) => `Q${i + 1}: ${q}`).join('\n')}`)
    .join('\n\n');

  return `You are auditing a university exam before it is published.

COURSE LEARNING OUTCOMES:
${cloList}

DRAFT EXAM (this year):
${questionList}

PAST EXAMS (for recycling check):
${pastList || '(none provided)'}

For each draft-exam question, determine:
1. Which CLO id(s) it tests (use the exact ids given above; empty array if none apply)
2. Its Bloom's Taxonomy level: one of Remember, Understand, Apply, Analyze, Evaluate, Create
3. A short topic tag (2-4 words)
4. Whether it closely matches any past-exam question. If yes, report the matched year, the matched question number, an estimated similarity percent (0-100, where 100 = identical meaning even if reworded), and a one-sentence reason. If no close match, omit this field.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "questions": [
    {
      "questionNumber": <question number>,
      "coveredCLOs": ["CLO1"],
      "bloom": "Apply",
      "topic": "short tag",
      "similarity": { "year": "2024", "matchedQuestion": "Q7", "percent": 92, "reason": "..." }
    }
  ]
}
Omit the "similarity" key entirely for questions with no notable past match (below 60%).`;
}

function parseModelJSON(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error('Model response missing "questions" array');
  }
  const questions = parsed.questions.map((q) => ({
    questionNumber: q.questionNumber,
    coveredCLOs: q.coveredCLOs || [],
    topic: q.topic,
    bloom: q.bloom,
    similarity: q.similarity || null,
  }));
  return { questions };
}

module.exports = { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON };
