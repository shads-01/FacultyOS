'use client';

import { useState } from 'react';
import { consistencyResponse } from '@/components/mockResponses';
import GraderConsistencyTable from '@/components/GraderConsistencyTable';

export default function GraderConsistencyPage() {
  const [rubric, setRubric] = useState('');
  const [answers, setAnswers] = useState('');
  const [scores, setScores] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const gridStyle = {
    display: 'grid',
    gap: 24,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    // TODO(integration): swap for real POST /api/grader-consistency — no auth header
    await new Promise((r) => setTimeout(r, 300));
    setResult(consistencyResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="fz-display" style={{ fontSize: 30, marginBottom: 4 }}>
        Grader Consistency
      </h1>
      <p style={{ color: '#55524a', marginTop: 0, marginBottom: 24 }}>
        Paste a rubric, the student answers, and each grader&apos;s scores to
        spot grading inconsistencies.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={gridStyle}>
          <div>
            <label className="fz-label" htmlFor="gc-rubric">
              Rubric
            </label>
            <textarea
              id="gc-rubric"
              className="fz-textarea"
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              placeholder="Award full credit for..."
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="gc-answers">
              Student Answers
            </label>
            <textarea
              id="gc-answers"
              className="fz-textarea"
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder={'1. Answer text...\n2. Answer text...'}
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="gc-scores">
              Grader Scores
            </label>
            <textarea
              id="gc-scores"
              className="fz-textarea"
              value={scores}
              onChange={(e) => setScores(e.target.value)}
              placeholder={'Alex,1,8\nJordan,1,6'}
            />
          </div>
        </div>

        <button
          type="submit"
          className="fz-btn"
          style={{ marginTop: 24 }}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24 }}>
          <GraderConsistencyTable flags={result.flags} />
        </div>
      )}
    </div>
  );
}
