import { getServerSupabase } from '../../../../lib/supabase/server.js';

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  // ponytail: no explicit .eq('user_id', user.id) filter here — RLS (auth.uid() = user_id)
  // already restricts every row this connection can see, so re-filtering client-side would
  // be redundant, not defense-in-depth. RLS is the actual trust boundary.
  const { data, error } = await supabase
    .from('analysis_runs')
    .select('id, created_at, result')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ runs: data });
}
