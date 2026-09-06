'use client';

import { useState } from 'react';

import { overlapResponse } from '@/components/mockResponses';
import OverlapReport from '@/components/OverlapReport';

export default function SyllabusOverlapPage() {
  const [proposed, setProposed] = useState('');
  const [existing, setExisting] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO(integration): swap for real POST /api/overlap — no auth header
      await new Promise((r) => setTimeout(r, 300));
      setResult(overlapResponse);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="fz-display" style={{ fontSize: 30, marginBottom: 4 }}>Syllabus Overlap</h1>
      <p style={{ color: '#55524a', marginBottom: 24 }}>
        Paste your proposed syllabus and existing course syllabi to see overlapping topics and curriculum gaps.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
          <div>
            <label className="fz-label" htmlFor="proposed" style={{ display: 'block', marginBottom: 6 }}>Proposed Syllabus</label>
            <textarea
              id="proposed"
              className="fz-textarea"
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder={'Big-O notation\nRecursion\nHash tables'}
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="existing" style={{ display: 'block', marginBottom: 6 }}>Existing Course Syllabi</label>
            <textarea
              id="existing"
              className="fz-textarea"
              value={existing}
              onChange={(e) => setExisting(e.target.value)}
              placeholder={'Intro to Algorithms\nBig-O notation\nRecursion\n\nData Structures I\nArrays'}
            />
          </div>
        </div>
        <button type="submit" className="fz-btn" disabled={loading}>
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </form>

      {result && <OverlapReport overlaps={result.overlaps} gaps={result.gaps} />}
    </div>
  );
}
