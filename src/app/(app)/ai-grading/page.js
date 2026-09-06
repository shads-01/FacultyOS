'use client';

import { useState } from 'react';
import { gradeResponse } from '@/components/mockResponses';
import GradingTable from '@/components/GradingTable';

export default function AiGradingPage() {
  const [rubric, setRubric] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [answers, setAnswers] = useState('');
  const [humanScores, setHumanScores] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    // TODO(integration): swap for real POST /api/grade — no auth header
    await new Promise((r) => setTimeout(r, 300));
    setResult(gradeResponse);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="fz-display" style={{ fontSize: 30, marginBottom: 4 }}>
        AI-Anchored Grading
      </h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        Paste your rubric, model answer, and student answers. Human scores are optional — add them to surface grading disagreements.
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            marginBottom: 24,
          }}
        >
          <div>
            <label className="fz-label" htmlFor="rubric">Rubric</label>
            <textarea
              id="rubric"
              className="fz-textarea"
              placeholder="Full credit for..."
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="model-answer">Model Answer</label>
            <textarea
              id="model-answer"
              className="fz-textarea"
              placeholder="The ideal answer..."
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="answers">Student Answers</label>
            <textarea
              id="answers"
              className="fz-textarea"
              placeholder={'1. Answer...\n2. Answer...'}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
            />
          </div>
          <div>
            <label className="fz-label" htmlFor="human-scores">Human Scores (optional)</label>
            <textarea
              id="human-scores"
              className="fz-textarea"
              placeholder={'1,8\n2,6'}
              value={humanScores}
              onChange={(e) => setHumanScores(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="fz-btn" disabled={loading}>
          {loading ? 'Scoring...' : 'Score'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 24 }}>
          <GradingTable results={result.results} />
        </div>
      )}
    </div>
  );
}
