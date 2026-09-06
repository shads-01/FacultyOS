'use client';

import { useState } from 'react';
import Link from 'next/link';
import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import GraderConsistencyTable from '@/components/GraderConsistencyTable';
import NextActions from '@/components/NextActions';
import PdfOrPasteField from '@/components/PdfOrPasteField';

export default function GraderConsistencyPage() {
  const [rubric, setRubric] = useState('');
  const [studentAnswers, setStudentAnswers] = useState('');
  const [graderScores, setGraderScores] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await runFeature('grader-consistency', { rubric, studentAnswers, graderScores });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>Grader Consistency</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 18, maxWidth: 560 }}>
        Different graders may score equivalent answers differently — paste the rubric, the answers, and each grader&apos;s scores to spot the inconsistencies.
      </p>

      <div style={{ marginBottom: 14 }}>
        <select
          className="fz-btn"
          style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          value=""
          onChange={(e) => {
            const scenario = demoInputs.consistency.find((s) => s.key === e.target.value);
            if (!scenario) return;
            setRubric(scenario.data.rubric);
            setStudentAnswers(scenario.data.studentAnswers);
            setGraderScores(scenario.data.graderScores);
          }}
        >
          <option value="">Load data…</option>
          {demoInputs.consistency.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <PdfOrPasteField
            id="gc-rubric"
            label="Rubric"
            value={rubric}
            onChange={setRubric}
            placeholder="Award full credit for..."
            hint="free text · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="gc-answers"
            label="Student Answers"
            value={studentAnswers}
            onChange={setStudentAnswers}
            placeholder={'1. Answer text...\n2. Answer text...'}
            hint="one numbered answer per line · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="gc-scores"
            label="Grader Scores"
            value={graderScores}
            onChange={setGraderScores}
            placeholder={'Alex,1,8\nJordan,1,6'}
            hint="GraderName,answerNumber,score per line · PDF OCR reads first 20 pages of scans"
          />
        </div>

        <button type="submit" className="fz-btn" style={{ marginTop: 24 }} disabled={loading}>
          {loading ? 'Checking…' : 'Check consistency'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24 }}>
          <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111' }}>
            <GraderConsistencyTable flags={result.flags} />
          </div>
          <NextActions screen="grader-consistency" report={result} />
          <p style={{ marginTop: 20, fontSize: 13 }}>
            <Link href="/ai-grading" style={{ fontWeight: 700, textTransform: 'uppercase', color: '#E11D1D' }}>
              Next: AI anchor →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
