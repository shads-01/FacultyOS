'use client';
import { useEffect, useCallback } from 'react';

export default function Wizard({ steps, step, setStep, onNext, nextLabel, loading, canNext }) {
  const isLast = step === steps.length - 1;
  const next = useCallback(() => {
    if (step < steps.length - 1) {
      if (canNext && !canNext()) return;
      setStep(step + 1);
    }
  }, [step, steps.length, setStep, canNext]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next]);

  return (
    <div>
      <div className="fz-label" style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        STEP {step + 1}/{steps.length} · {steps[step].title}
        {steps.map((_, i) => (
          <span
            key={i}
            style={{
              width: 14, height: 14, display: 'inline-block',
              border: '2px solid #111',
              background: i <= step ? '#111' : '#FAF8F3',
            }}
          />
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>{steps[step].content}</div>
      <div
        style={{
          position: 'sticky', bottom: 0, zIndex: 50,
          background: '#FAF8F3', borderTop: '3px solid #111',
          padding: '12px 0', display: 'flex', gap: 12, alignItems: 'center',
        }}
      >
        {step > 0 && (
          <button className="fz-btn" style={{ background: '#FAF8F3' }} onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {!isLast && (
          <button className="fz-btn" onClick={next}>
            Next step
          </button>
        )}
        {isLast && onNext && (
          <button className="fz-btn" onClick={onNext} disabled={loading}>
            {loading ? 'Working…' : nextLabel}
          </button>
        )}
        <span style={{ fontSize: 11, color: '#55524a', fontFamily: 'var(--font-mono)' }}>Ctrl+Enter</span>
      </div>
    </div>
  );
}
