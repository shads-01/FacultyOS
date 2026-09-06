'use client';
import { useState } from 'react';
import { extractTextFromPdfs } from '@/lib/pdfExtract';

export default function PdfOrPasteField({ id, label, value, onChange, placeholder, hint }) {
  const [mode, setMode] = useState('paste');
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState([]);
  const [busy, setBusy] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    setFailed([]);
    setStatus('Reading…');
    try {
      const { text, failed: fileFailures } = await extractTextFromPdfs(files, {
        onProgress: (name, s) => setStatus(`${name}: ${s}`),
      });
      onChange(text);
      setFailed(fileFailures);
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  const toggleBtn = (m, text) => (
    <button
      type="button"
      className="fz-btn"
      style={{
        fontSize: 10,
        padding: '4px 8px',
        background: mode === m ? '#111' : '#FAF8F3',
        color: mode === m ? '#FAF8F3' : '#111',
      }}
      onClick={() => setMode(m)}
    >
      {text}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <label className="fz-label" htmlFor={id}>{label}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {toggleBtn('paste', 'Paste text')}
          {toggleBtn('upload', 'Upload PDF')}
        </div>
      </div>

      {mode === 'paste' ? (
        <textarea
          id={id}
          className="fz-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="fz-textarea" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, height: 'auto' }}>
          <input id={id} type="file" accept="application/pdf" multiple disabled={busy} onChange={handleFiles} />
          {busy && <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{status}</p>}
          {!busy && value && <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>{value.length} chars extracted</p>}
          {failed.map((f) => (
            <p key={f.name} style={{ fontSize: 11, color: '#E11D1D', fontFamily: 'var(--font-mono)' }}>
              {f.name} — {f.reason}, try pasting instead
            </p>
          ))}
        </div>
      )}
      {hint && <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{hint}</p>}
    </div>
  );
}
