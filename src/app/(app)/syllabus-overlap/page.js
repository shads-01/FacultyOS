'use client';

import { useState } from 'react';
import Link from 'next/link';

import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import OverlapReport from '@/components/OverlapReport';
import NextActions from '@/components/NextActions';
import PdfOrPasteField from '@/components/PdfOrPasteField';

export default function SyllabusOverlapPage() {
  const [proposedSyllabus, setProposedSyllabus] = useState('');
  const [existingSyllabi, setExistingSyllabi] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await runFeature('overlap', { proposedSyllabus, existingSyllabi });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>Syllabus Overlap</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 18, maxWidth: 560 }}>
        Paste your proposed syllabus and the existing course syllabi — the audit flags overlapping topics and curriculum gaps.
      </p>

      <div style={{ marginBottom: 14 }}>
        <select
          className="fz-btn"
          style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          value=""
          onChange={(e) => {
            const scenario = demoInputs.overlap.find((s) => s.key === e.target.value);
            if (!scenario) return;
            setProposedSyllabus(scenario.data.proposedSyllabus);
            setExistingSyllabi(scenario.data.existingSyllabi);
          }}
        >
          <option value="">Load data…</option>
          {demoInputs.overlap.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
          <PdfOrPasteField
            id="proposed"
            label="Proposed Syllabus"
            value={proposedSyllabus}
            onChange={setProposedSyllabus}
            placeholder={'Big-O notation\nRecursion\nHash tables'}
            hint="one topic per line · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="existing"
            label="Existing Course Syllabi"
            value={existingSyllabi}
            onChange={setExistingSyllabi}
            placeholder={'Intro to Algorithms\nBig-O notation\nRecursion\n\nData Structures I\nArrays'}
            hint="course-name line, then its topics · blank line between courses · PDF OCR reads first 20 pages of scans"
          />
        </div>

        <button type="submit" className="fz-btn" disabled={loading}>
          {loading ? 'Comparing…' : 'Compare syllabi'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24 }}>
          <OverlapReport overlaps={result.overlaps} gaps={result.gaps} />
          <NextActions screen="overlap" report={result} />
          <p style={{ marginTop: 20, fontSize: 13 }}>
            <Link href="/exam-quality" className="cursor-pointer" style={{ fontWeight: 700, textTransform: 'uppercase', color: '#E11D1D' }}>
              Next stage: build the exam →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
