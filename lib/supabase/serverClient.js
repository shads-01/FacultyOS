const { createClient } = require('@supabase/supabase-js');

function parseAuthHeader(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireUser(req) {
  const token = parseAuthHeader(req.headers.get('authorization'));
  if (!token) {
    return { user: null, supabase: null, error: 'Missing Authorization: Bearer token' };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { user: null, supabase: null, error: 'Supabase credentials not configured' };
  }

  // This client forwards the caller's own access token to PostgREST (not the anon
  // key alone), so auth.uid() resolves to this user inside RLS policies.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, supabase: null, error: error?.message || 'Invalid session' };
  }
  return { user: data.user, supabase, error: null };
}

module.exports = { parseAuthHeader, requireUser };
