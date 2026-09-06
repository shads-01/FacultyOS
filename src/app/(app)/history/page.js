'use client';
import { useState } from 'react';
import { runsResponse } from '@/components/mockResponses';
import ExamQualityReport from '@/components/ExamQualityReport';

export default function HistoryPage() {
  // TODO(integration): fetch GET /api/runs with Bearer token in live mode.
  const [runs] = useState(runsResponse.runs);
  const [openId, setOpenId] = useState(null);

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>History</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 24, maxWidth: 560 }}>
        Every exam-quality audit you have run. Click a run to replay its full report — no re-analysis needed.
      </p>

      {runs.length === 0 ? (
        <div className="fz-card">
          <p style={{ color: '#55524a', fontSize: 13 }}>No past runs yet — run an audit on the Exam Quality screen first.</p>
        </div>
      ) : (
        runs.map((run) => {
          const open = openId === run.id;
          const clos = run.result?.clos?.length ?? 0;
          const questions = run.result?.questions?.length ?? 0;
          return (
            <div key={run.id} style={{ marginBottom: 12 }}>
              <button
                onClick={() => setOpenId(open ? null : run.id)}
                aria-expanded={open}
                className="cursor-pointer"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  width: '100%', textAlign: 'left',
                  border: '3px solid #111', background: open ? '#111' : '#fff',
                  color: open ? '#FAF8F3' : '#111',
                  padding: '12px 16px', minHeight: 44, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                  {new Date(run.created_at).toLocaleString()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {clos} CLOs · {questions} questions {open ? '▲' : '▼'}
                </span>
              </button>
              {open && (
                <div style={{ padding: '16px 0' }}>
                  <ExamQualityReport report={run.result} />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
