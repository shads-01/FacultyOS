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

export default function SignupPage() {
  const [name, setName] = useState('');
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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (authError) throw authError;
      if (data.user) localStorage.setItem('fz-identity', name.trim() || email.split('@')[0]);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h1 className="fz-display" style={{ fontSize: 40, marginBottom: 6 }}>Sign up</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 28 }}>
        One account, every audit — exam quality, syllabus fit, fair grading.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label className="fz-label" htmlFor="fz-name">Your name</label>
          <input id="fz-name" type="text" style={inputStyle}
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Rahman" />
          <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>shown on grader flags and reports</p>
        </div>
        <div>
          <label className="fz-label" htmlFor="fz-email">Email</label>
          <input id="fz-email" type="email" required autoComplete="email" style={inputStyle}
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
        </div>
        <div>
          <label className="fz-label" htmlFor="fz-password">Password</label>
          <input id="fz-password" type="password" required minLength={6} autoComplete="new-password" style={inputStyle}
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" />
        </div>
        {error && <div className="fz-strip" role="alert">{error}</div>}
        <button type="submit" className="fz-btn" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div style={{ marginTop: 22 }}>
        <Link href="/login" style={{ fontSize: 13, color: '#111', fontWeight: 700 }}>
          Already registered? Log in →
        </Link>
      </div>
    </div>
  );
}
