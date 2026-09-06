'use client';
import { useState } from 'react';
import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import GradingTable from '@/components/GradingTable';
import NextActions from '@/components/NextActions';
import Wizard from '@/components/Wizard';

export default function AiGradingPage() {
  const [step, setStep] = useState(0);
  const [rubric, setRubric] = useState('');
  const [modelAnswer, setModelAnswer] = useState('');
  const [studentAnswers, setStudentAnswers] = useState('');
  const [humanScores, setHumanScores] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parsedAnswers = studentAnswers.split('\n').filter((l) => l.trim()).length;
  const parsedScores = humanScores.split('\n').filter((l) => l.trim()).length;

  const canNext = () => {
    if (step === 0 && (!rubric.trim() || !studentAnswers.trim())) return false;
    return true;
  };

  async function handleScore() {
    setLoading(true);
    setError(null);
    try {
      const res = await runFeature('grade', { rubric, modelAnswer, studentAnswers, humanScores });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    {
      title: 'PASTE',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          <div>
            <label className="fz-label" htmlFor="fz-rubric">Rubric</label>
            <textarea id="fz-rubric" className="fz-textarea" value={rubric} onChange={(e) => setRubric(e.target.value)}
              placeholder="Full credit for..." />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>free text</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="fz-model">Model Answer</label>
            <textarea id="fz-model" className="fz-textarea" value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="The ideal answer..." />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>free text</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="fz-answers">Student Answers</label>
            <textarea id="fz-answers" className="fz-textarea" value={studentAnswers} onChange={(e) => setStudentAnswers(e.target.value)}
              placeholder={'1. Answer...\n2. Answer...'} />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>one numbered answer per line</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="fz-scores">Human Scores (optional)</label>
            <textarea id="fz-scores" className="fz-textarea" value={humanScores} onChange={(e) => setHumanScores(e.target.value)}
              placeholder={'1,8\n2,6'} />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>answerNumber,score per line · leave blank if none</p>
          </div>
        </div>
      ),
    },
    {
      title: 'REVIEW',
      content: (
        <div className="fz-card" style={{ maxWidth: 560 }}>
          <h3 className="fz-label" style={{ fontSize: 13 }}>Parsed input</h3>
          <table className="fz-table">
            <tbody>
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Rubric</td><td className="fz-match">{rubric.length} chars</td></tr>
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Student answers</td><td className="fz-match">{parsedAnswers}</td></tr>
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Human scores lines</td><td className="fz-match">{parsedScores}</td></tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: 'REPORT',
      content: result ? (
        <div>
          <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111' }}>
            <GradingTable results={result.results} />
          </div>
          <NextActions screen="grade" report={result} />
        </div>
      ) : (
        <p style={{ color: '#55524a', fontSize: 13 }}>Run the scoring from step 2 to see the report here.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>AI-Anchored Grading</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 18, maxWidth: 560 }}>
        Paste your rubric, model answer, and student answers. Human scores are optional — the AI gives graders a common anchor and surfaces disagreements when you provide them.
      </p>

      <div style={{ marginBottom: 14 }}>
        <button className="fz-btn" style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          onClick={() => { setRubric(demoInputs.grade.rubric); setModelAnswer(demoInputs.grade.modelAnswer); setStudentAnswers(demoInputs.grade.studentAnswers); setHumanScores(demoInputs.grade.humanScores); }}>
          Load example
        </button>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <Wizard steps={steps} step={step} setStep={setStep} canNext={canNext} onNext={handleScore} nextLabel="Score answers" loading={loading} />
    </div>
  );
}
