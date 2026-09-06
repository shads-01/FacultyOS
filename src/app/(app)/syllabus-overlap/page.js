'use client';

import { useState } from 'react';
import Link from 'next/link';

import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import OverlapReport from '@/components/OverlapReport';
import NextActions from '@/components/NextActions';

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
        <button
          type="button"
          className="fz-btn"
          style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          onClick={() => {
            setProposedSyllabus(demoInputs.overlap.proposedSyllabus);
            setExistingSyllabi(demoInputs.overlap.existingSyllabi);
          }}
        >
          Load example
        </button>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
          <div>
            <label className="fz-label" htmlFor="proposed">Proposed Syllabus</label>
            <textarea
              id="proposed"
              className="fz-textarea"
              value={proposedSyllabus}
              onChange={(e) => setProposedSyllabus(e.target.value)}
              placeholder={'Big-O notation\nRecursion\nHash tables'}
            />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>one topic per line</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="existing">Existing Course Syllabi</label>
            <textarea
              id="existing"
              className="fz-textarea"
              value={existingSyllabi}
              onChange={(e) => setExistingSyllabi(e.target.value)}
              placeholder={'Intro to Algorithms\nBig-O notation\nRecursion\n\nData Structures I\nArrays'}
            />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>course-name line, then its topics · blank line between courses</p>
          </div>
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
