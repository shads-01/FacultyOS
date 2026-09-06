import { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } from '../../../../lib/analyze.js';
import { requireUser } from '../../../../lib/supabase/serverClient.js';

export async function POST(req) {
  const { user, supabase, error: authError } = await requireUser(req);
  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  const { clos = '', exam = '', pastExams = '' } = await req.json();
  if (!clos.trim() || !exam.trim()) {
    return Response.json({ error: 'CLOs and exam text are required' }, { status: 400 });
  }

  const parsedClos = parseCLOs(clos);
  const parsedQuestions = parseNumberedQuestions(exam);
  const parsedPastExams = parsePastExams(pastExams);
  const prompt = buildPrompt({ clos: parsedClos, questions: parsedQuestions, pastExams: parsedPastExams });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  let geminiRes;
  try {
    geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
        }),
      },
    );
  } catch (e) {
    return Response.json({ error: `Gemini API request failed: ${e.message}` }, { status: 502 });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return Response.json({ error: `Gemini API error: ${errText}` }, { status: 502 });
  }

  const data = await geminiRes.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let parsed;
  try {
    parsed = parseModelJSON(rawText);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }

  const result = { clos: parsedClos, questions: parsedQuestions, analysis: parsed.questions };

  const { error: insertError } = await supabase
    .from('analysis_runs')
    .insert({ user_id: user.id, clos_text: clos, exam_text: exam, past_exams_text: pastExams, result });

  if (insertError) {
    return Response.json({ ...result, warning: `Saved result but failed to persist run: ${insertError.message}` }, { status: 200 });
  }

  return Response.json(result);
}
