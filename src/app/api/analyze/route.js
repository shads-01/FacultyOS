import {
  parseCLOs,
  parseNumberedQuestions,
  parsePastExams,
  buildPrompt,
  parseModelJSON,
} from '../../../../lib/analyze.js';
import { getServerSupabase } from '../../../../lib/supabase/server.js';
import { callGemini } from '../../../../lib/gemini.js';

export async function POST(req) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
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

  const geminiResult = await callGemini({ prompt, maxOutputTokens: 4096 });
  if (!geminiResult.ok) {
    return Response.json({ error: geminiResult.error }, { status: geminiResult.status });
  }
  const rawText = geminiResult.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed;
  try {
    parsed = parseModelJSON(rawText);
  } catch (e) {
    return Response.json({ error: `Could not parse model output: ${e.message}` }, { status: 502 });
  }

  const result = { clos: parsedClos, questions: parsedQuestions, analysis: parsed.questions };

  const { error: insertError } = await supabase.from('analysis_runs').insert({
    user_id: user.id,
    clos_text: clos,
    exam_text: exam,
    past_exams_text: pastExams,
    result,
  });

  if (insertError) {
    return Response.json(
      {
        ...result,
        warning: `Saved result but failed to persist run: ${insertError.message}`,
      },
      { status: 200 },
    );
  }

  return Response.json(result);
}
