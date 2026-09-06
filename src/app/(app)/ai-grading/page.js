'use client';
import { useState } from 'react';
import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import GradingTable from '@/components/GradingTable';
import NextActions from '@/components/NextActions';
import Wizard from '@/components/Wizard';
import PdfOrPasteField from '@/components/PdfOrPasteField';

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
          <PdfOrPasteField
            id="fz-rubric"
            label="Rubric"
            value={rubric}
            onChange={setRubric}
            placeholder="Full credit for..."
            hint="free text · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="fz-model"
            label="Model Answer"
            value={modelAnswer}
            onChange={setModelAnswer}
            placeholder="The ideal answer..."
            hint="free text · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="fz-answers"
            label="Student Answers"
            value={studentAnswers}
            onChange={setStudentAnswers}
            placeholder={'1. Answer...\n2. Answer...'}
            hint="one numbered answer per line · PDF OCR reads first 20 pages of scans"
          />
          <PdfOrPasteField
            id="fz-scores"
            label="Human Scores (optional)"
            value={humanScores}
            onChange={setHumanScores}
            placeholder={'1,8\n2,6'}
            hint="answerNumber,score per line · leave blank if none · PDF OCR reads first 20 pages of scans"
          />
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
        <select className="fz-btn" style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          value="" onChange={(e) => {
            const scenario = demoInputs.grade.find((s) => s.key === e.target.value);
            if (!scenario) return;
            setRubric(scenario.data.rubric); setModelAnswer(scenario.data.modelAnswer);
            setStudentAnswers(scenario.data.studentAnswers); setHumanScores(scenario.data.humanScores);
          }}>
          <option value="">Load data…</option>
          {demoInputs.grade.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <Wizard steps={steps} step={step} setStep={setStep} canNext={canNext} onNext={handleScore} nextLabel="Score answers" loading={loading} />
    </div>
  );
}
