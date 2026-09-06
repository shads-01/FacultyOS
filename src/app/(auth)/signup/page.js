'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '../../../../lib/supabase/client';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#F0FDFA] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#99F6E4] rounded-xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#134E4A]">Faculty OS</h1>
          <p className="text-sm text-[#475569] mt-1">Create your faculty account</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 text-sm text-[#DC2626] bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#134E4A] mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="faculty@university.edu"
              className="w-full px-3 py-2 text-sm text-[#134E4A] bg-white border border-[#99F6E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#134E4A] mb-1.5" htmlFor="password">
              Password (6+ characters)
            </label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm text-[#134E4A] bg-white border border-[#99F6E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer py-2.5 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#475569]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0D9488] hover:underline font-semibold cursor-pointer">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
