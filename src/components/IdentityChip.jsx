'use client';
import { useEffect, useRef, useState } from 'react';

export default function IdentityChip() {
  // ponytail: localStorage read in the initializer is the whole feature —
  // suppressHydrationWarning covers the SSR text mismatch on first paint.
  const [name, setName] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('fz-identity') : null
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function save() {
    const clean = draft.trim();
    if (clean) localStorage.setItem('fz-identity', clean);
    else localStorage.removeItem('fz-identity');
    setName(clean || null);
    setEditing(false);
    setDraft('');
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Your name"
          aria-label="Your name"
          style={{
            border: '2px solid #111', padding: '8px 10px', fontSize: 12,
            fontFamily: 'var(--font-mono)', width: 150, background: '#fff',
          }}
        />
        <button className="fz-btn" style={{ padding: '8px 12px', fontSize: 11, boxShadow: '3px 3px 0 #111' }} onClick={save}>
          Set
        </button>
      </span>
    );
  }

  return (
    <button
      suppressHydrationWarning
      onClick={() => { setDraft(name || ''); setEditing(true); }}
      aria-label="Set your grader identity"
      className="cursor-pointer"
      style={{
        border: '2px solid #111', background: name ? '#86EFAC' : '#FFD23F',
        padding: '9px 14px', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        minHeight: 44, cursor: 'pointer', fontFamily: 'var(--font-sans)',
      }}
    >
      {name ? `Who's grading: ${name}` : "Who's grading? + set name"}
    </button>
  );
}
