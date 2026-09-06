'use client';
import Link from 'next/link';
import { useState } from 'react';
import { runsResponse } from '@/components/mockResponses';

const STAGES = [
  {
    stage: 'Stage 1 — Design the course',
    href: '/syllabus-overlap',
    name: 'Syllabus Overlap',
    catches: 'Catches a new syllabus that duplicates existing courses or ignores curriculum gaps.',
    input: 'Proposed topics + existing course syllabi',
    cta: 'Compare syllabi',
  },
  {
    stage: 'Stage 2 — Build the exam',
    href: '/exam-quality',
    name: 'Exam Quality',
    catches: 'Untested learning outcomes, recycled questions from past years, missing Bloom diversity.',
    input: 'CLOs + draft exam + past exams',
    cta: 'Audit the exam',
  },
  {
    stage: 'Stage 3 — Grade fairly',
    hrefs: ['/grader-consistency', '/ai-grading'],
    name: 'Grading',
    catches: 'Graders scoring equivalent answers differently; no common anchor.',
    input: 'Rubric + answers + grader scores',
    cta: 'Check consistency',
  },
];

export default function DashboardPage() {
  // TODO(integration): fetch GET /api/runs with Bearer token in live mode.
  const [runs] = useState(runsResponse.runs);

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 38, marginBottom: 8 }}>Faculty OS</h1>
      <p style={{ color: '#55524a', fontSize: 14.5, marginBottom: 28, maxWidth: 620 }}>
        One journey: design a course that fits, build an exam that measures it, grade it fairly.
        Pick your stage — paste documents, get an AI audit with what to fix.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        {STAGES.map((s) => (
          <div key={s.stage} className="fz-card fz-lift" style={{ boxShadow: '6px 6px 0 #111', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="fz-label" style={{ fontSize: 11, color: '#E11D1D', marginBottom: 0 }}>{s.stage}</div>
            <h2 className="fz-display" style={{ fontSize: 24 }}>{s.name}</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1 }}>{s.catches}</p>
            <p style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: '#55524a' }}>IN: {s.input}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {s.hrefs ? (
                s.hrefs.map((h, i) => (
                  <Link key={h} href={h} className="fz-btn" style={{ fontSize: 12, padding: '10px 16px', background: i === 0 ? '#FFD23F' : '#FAF8F3' }}>
                    {i === 0 ? 'Check consistency' : 'AI anchor'}
                  </Link>
                ))
              ) : (
                <Link href={s.href} className="fz-btn" style={{ fontSize: 12, padding: '10px 16px' }}>
                  {s.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fz-card" style={{ marginTop: 24 }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Recent runs</h3>
        {runs.length === 0 ? (
          <p style={{ color: '#55524a', fontSize: 13 }}>
            No runs yet — start at <Link href="/syllabus-overlap" className="cursor-pointer" style={{ fontWeight: 700, color: '#E11D1D' }}>Stage 1</Link>.
          </p>
        ) : (
          runs.map((run) => (
            <Link
              key={run.id}
              href="/history"
              className="cursor-pointer"
              style={{
                display: 'block', padding: '9px 12px', fontSize: 13,
                fontFamily: 'var(--font-mono)', borderBottom: '2px solid #111',
                background: '#FAF8F3', color: '#111', textDecoration: 'none',
              }}
            >
              {new Date(run.created_at).toLocaleString()} · exam quality audit
            </Link>
          ))
        )}
        <div style={{ marginTop: 12 }}>
          <Link href="/history" className="cursor-pointer" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#111' }}>
            View all history →
          </Link>
        </div>
      </div>
    </div>
  );
}
