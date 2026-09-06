import { requireUser } from '../../../../lib/supabase/serverClient.js';

export async function GET(req) {
  const { user, supabase, error: authError } = await requireUser(req);
  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('analysis_runs')
    .select('id, created_at, result')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ runs: data });
}
