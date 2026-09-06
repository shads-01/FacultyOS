import { parseTopics, parseExistingSyllabi, buildOverlapPrompt, parseOverlapJSON } from '../../../../lib/overlap';

export async function POST(req) {
  const { proposedSyllabus = '', existingSyllabi = '' } = await req.json();
  if (!proposedSyllabus.trim()) {
    return Response.json({ error: 'Proposed syllabus is required' }, { status: 400 });
  }

  const proposedTopics = parseTopics(proposedSyllabus);
  const existingCourses = parseExistingSyllabi(existingSyllabi);
  const prompt = buildOverlapPrompt({ proposedTopics, existingCourses });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let geminiRes;
  try {
    geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
      }),
    });
  } catch (e) {
    return Response.json({ error: `Gemini API request failed: ${e.message}` }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return Response.json({ error: `Gemini API error: ${errText}` }, { status: 502 });
  }

  const data = await geminiRes.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const result = parseOverlapJSON(rawText);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }
}
