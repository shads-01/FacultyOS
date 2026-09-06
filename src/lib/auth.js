'use client';
import { getBrowserSupabase } from '../../lib/supabase/client';

export async function getUser() {
  const { data, error } = await getBrowserSupabase().auth.getUser();
  return error ? null : data.user;
}

export async function signOut() {
  await getBrowserSupabase().auth.signOut();
}
