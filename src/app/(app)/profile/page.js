'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../../../lib/supabase/client';
import { getUser, signOut } from '@/lib/auth';

const inputStyle = {
  width: '100%',
  border: '2px solid #111',
  background: '#fff',
  padding: '12px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  minHeight: 44,
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState(false);
  const [password, setPassword] = useState('');
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setUser(u);
      const storedName = u?.user_metadata?.full_name || localStorage.getItem('fz-identity') || '';
      setName(storedName);
      setLoading(false);
    })();
  }, []);

  function saveName() {
    localStorage.setItem('fz-identity', name.trim());
    if (user) {
      getBrowserSupabase().auth.updateUser({ data: { full_name: name.trim() } });
    }
    setSavedName(true);
    setTimeout(() => setSavedName(false), 2000);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);
    try {
      const { error } = await getBrowserSupabase().auth.updateUser({ password });
      if (error) throw error;
      setPwMessage('Password updated.');
      setPassword('');
    } catch (err) {
      setPwError(err.message);
    }
  }

  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto" style={{ maxWidth: 560, color: '#55524a', fontSize: 13 }}>Loading profile…</div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 560 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>Profile</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 24 }}>
        Your account and grader identity.
      </p>

      <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111', marginBottom: 20 }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Account</h3>
        <table className="fz-table">
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Email</td>
              <td className="fz-match">{user?.email ?? (user ? 'demo (anonymous session)' : '—')}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Status</td>
              <td className="fz-match">{user ? 'SIGNED IN' : '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111', marginBottom: 20 }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Grader identity</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="fz-label" htmlFor="fz-identity-name" style={{ fontSize: 11 }}>Name on reports</label>
            <input
              id="fz-identity-name"
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Rahman"
            />
          </div>
          <button className="fz-btn" style={{ marginTop: 24, fontSize: 12, padding: '10px 18px' }} onClick={saveName}>
            Save
          </button>
        </div>
        {savedName && <p style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginTop: 8 }}>Saved — reports will use this name.</p>}
      </div>

      {user && (
        <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111', marginBottom: 20 }}>
          <h3 className="fz-label" style={{ fontSize: 13 }}>Change password</h3>
          <form onSubmit={changePassword} style={{ display: 'grid', gap: 12 }}>
            <input
              type="password" required minLength={6} autoComplete="new-password"
              style={inputStyle} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="New password (6+ characters)"
              aria-label="New password"
            />
            {pwMessage && <p style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{pwMessage}</p>}
            {pwError && <div className="fz-strip">{pwError}</div>}
            <button type="submit" className="fz-btn" style={{ fontSize: 12, padding: '10px 18px' }}>
              Update password
            </button>
          </form>
        </div>
      )}

      <button className="fz-btn" style={{ background: '#FECACA', fontSize: 12, padding: '10px 18px' }} onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  );
}
