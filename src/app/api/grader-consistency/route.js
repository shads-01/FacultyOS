import { parseNumberedAnswers, parseGraderScores, buildGraderConsistencyPrompt, parseConsistencyJSON } from '../../../../lib/graderConsistency';
import { callGemini } from '../../../../lib/gemini';

export async function POST(req) {
  const { rubric = '', studentAnswers = '', graderScores = '' } = await req.json();
  if (!rubric.trim() || !studentAnswers.trim() || !graderScores.trim()) {
    return Response.json({ error: 'Rubric, student answers, and grader scores are all required' }, { status: 400 });
  }

  const answers = parseNumberedAnswers(studentAnswers);
  const scores = parseGraderScores(graderScores);
  const prompt = buildGraderConsistencyPrompt({ rubric, answers, scores });

  const result = await callGemini({ prompt, maxOutputTokens: 2048 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const rawText = result.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const parsed = parseConsistencyJSON(rawText);
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }
}
