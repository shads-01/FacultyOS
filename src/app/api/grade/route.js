import { parseNumberedAnswers, parseHumanScores, buildGradePrompt, parseGradeJSON } from '../../../../lib/grade';
import { callGemini } from '../../../../lib/gemini';

export async function POST(req) {
  const { rubric = '', modelAnswer = '', studentAnswers = '', humanScores = '' } = await req.json();
  if (!rubric.trim() || !modelAnswer.trim() || !studentAnswers.trim()) {
    return Response.json({ error: 'Rubric, model answer, and student answers are all required' }, { status: 400 });
  }

  const answers = parseNumberedAnswers(studentAnswers);
  const humanScoreMap = parseHumanScores(humanScores);
  const prompt = buildGradePrompt({ rubric, modelAnswer, answers, humanScores: humanScoreMap });

  const result = await callGemini({ prompt, maxOutputTokens: 2048 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const rawText = result.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed;
  try {
    parsed = parseGradeJSON(rawText);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }

  const sorted = [...parsed.results].sort((a, b) => {
    if (a.delta === null) return 1;
    if (b.delta === null) return -1;
    return Math.abs(b.delta) - Math.abs(a.delta);
  });

  return Response.json({ results: sorted });
}
