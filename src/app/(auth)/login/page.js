'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../../lib/supabase/client';

const inputStyle = {
  width: '100%',
  border: '2px solid #111',
  background: '#fff',
  padding: '12px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  minHeight: 44,
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  const DEMO_ACCOUNT = { email: 'demo@facultyos.app', password: 'demo1234' };

  async function handleDemoSignIn() {
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserSupabase();
      let { error: authError } = await supabase.auth.signInWithPassword(DEMO_ACCOUNT);
      if (authError) {
        // first run: the demo account doesn't exist yet — create it, then sign in
        await supabase.auth.signUp(DEMO_ACCOUNT);
        const { error: retryError } = await supabase.auth.signInWithPassword(DEMO_ACCOUNT);
        if (retryError) throw retryError;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h1 className="fz-display" style={{ fontSize: 40, marginBottom: 6 }}>Log in</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 28 }}>
        Faculty accounts are free — sign up in ten seconds.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label className="fz-label" htmlFor="fz-email">Email</label>
          <input id="fz-email" type="email" required autoComplete="email" style={inputStyle}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
        </div>
        <div>
          <label className="fz-label" htmlFor="fz-password">Password</label>
          <input id="fz-password" type="password" required autoComplete="current-password" style={inputStyle}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="fz-strip" role="alert">{error}</div>}
        <button type="submit" className="fz-btn" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button
          type="button"
          onClick={handleDemoSignIn}
          disabled={loading}
          className="cursor-pointer"
          style={{
            border: '3px solid #111', background: '#FAF8F3', color: '#111',
            padding: '11px 18px', minHeight: 44, fontSize: 12, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            boxShadow: '4px 4px 0 #111', cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          Explore the demo account →
        </button>
        <Link href="/signup" style={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
          Need an account? Sign up →
        </Link>
      </div>
    </div>
  );
}
