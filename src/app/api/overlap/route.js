import { parseTopics, buildOverlapPrompt, parseOverlapJSON } from '../../../../lib/overlap';
import { existingCourses } from '../../../../lib/courseCatalog';
import { callGemini } from '../../../../lib/gemini';

export async function POST(req) {
  const { proposedSyllabus = '' } = await req.json();
  if (!proposedSyllabus.trim()) {
    return Response.json({ error: 'Proposed syllabus is required' }, { status: 400 });
  }

  const proposedTopics = parseTopics(proposedSyllabus);
  const prompt = buildOverlapPrompt({ proposedTopics, existingCourses });

  const result = await callGemini({ prompt, maxOutputTokens: 2048 });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const rawText = result.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const parsed = parseOverlapJSON(rawText);
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }
}
