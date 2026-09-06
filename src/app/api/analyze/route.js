import { parseCLOs, parseNumberedQuestions, parsePastExams, buildPrompt, parseModelJSON } from '../../../../lib/analyze.js';
import { requireUser } from '../../../../lib/supabase/serverClient.js';

async function callModelWithRetry(prompt, apiKey, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const geminiRes = await fetch(
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

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { rawText, error: null, status: 200 };
      }

      const errText = await geminiRes.text();
      // Retry ONLY on 5xx server errors (not on 4xx client errors)
      if (geminiRes.status >= 500 && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 500 : 1000));
        continue;
      }

      return { rawText: null, error: `Gemini API error: ${errText}`, status: 502 };
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 500 : 1000));
        continue;
      }
    }
  }
  return { rawText: null, error: `Gemini API request failed: ${lastError?.message || 'Unknown network error'}`, status: 502 };
}

export async function POST(req) {
  const { user, supabase, error: authError } = await requireUser(req);
  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const clos = body?.clos ?? body?.closText ?? '';
  const exam = body?.exam ?? body?.questionsText ?? body?.examText ?? '';
  const pastExams = body?.pastExams ?? body?.pastExamsText ?? '';

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

  const { rawText, error: modelError, status: modelStatus } = await callModelWithRetry(prompt, apiKey);
  if (modelError) {
    return Response.json({ error: modelError }, { status: modelStatus || 502 });
  }

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
