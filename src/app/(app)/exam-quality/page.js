'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Link from 'next/link';
import { runFeature } from '@/lib/api';
import { demoInputs } from '@/components/mockResponses';
import ExamQualityReport from '@/components/ExamQualityReport';
import Wizard from '@/components/Wizard';

export default function ExamQualityPage() {
  const [step, setStep] = useState(0);
  const [clos, setClos] = useState('');
  const [exam, setExam] = useState('');
  const [pastExams, setPastExams] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const blankRowRef = useRef(null);
  const topRecycledRef = useRef(null);

  useEffect(() => {
    if (!report || step !== 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [blankRowRef.current, topRecycledRef.current].filter(Boolean);
    if (els.length) gsap.from(els, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out' });
  }, [report, step]);

  const parsedClos = clos.split('\n').filter((l) => l.trim()).length;
  const parsedQuestions = exam.split('\n').filter((l) => l.trim()).length;

  const canNext = () => {
    if (step === 0 && (!clos.trim() || !exam.trim())) return false;
    return true;
  };

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await runFeature('analyze', { clos, exam, pastExams });
      setReport(result);
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div>
            <label className="fz-label" htmlFor="fz-clos">Course Learning Outcomes</label>
            <textarea id="fz-clos" className="fz-textarea" value={clos} onChange={(e) => setClos(e.target.value)}
              placeholder={'CLO1: Explain time complexity\nCLO2: Implement recursive algorithms'} />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>one per line · CLOn: prefix optional</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="fz-exam">Draft Exam (this year)</label>
            <textarea id="fz-exam" className="fz-textarea" value={exam} onChange={(e) => setExam(e.target.value)}
              placeholder={'1. Question text...\n2. Question text...'} />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>one numbered question per line</p>
          </div>
          <div>
            <label className="fz-label" htmlFor="fz-past">Past Exams</label>
            <textarea id="fz-past" className="fz-textarea" value={pastExams} onChange={(e) => setPastExams(e.target.value)}
              placeholder={'2024\n1. Question...\n\n2022\n1. Question...'} />
            <p style={{ fontSize: 11, color: '#55524a', marginTop: 4, fontFamily: 'var(--font-mono)' }}>bare 4-digit year starts a new year block</p>
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
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Course Learning Outcomes</td><td className="fz-match">{parsedClos}</td></tr>
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Draft exam questions</td><td className="fz-match">{parsedQuestions}</td></tr>
              <tr><td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>Past exam text</td><td className="fz-match">{pastExams.length} chars</td></tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      title: 'REPORT',
      content: report ? (
        <div>
          <ExamQualityReport report={report} blankRowRef={blankRowRef} topRecycledRef={topRecycledRef} />
          <p style={{ marginTop: 20, fontSize: 13 }}>
            <Link href="/grader-consistency" className="cursor-pointer" style={{ fontWeight: 700, textTransform: 'uppercase', color: '#E11D1D' }}>
              Next stage: grade fairly →
            </Link>
          </p>
        </div>
      ) : (
        <p style={{ color: '#55524a', fontSize: 13 }}>Run the audit from step 2 to see the report here.</p>
      ),
    },
  ];

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>Exam Quality</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 18, maxWidth: 560 }}>
        Paste your outcomes, this year&apos;s draft, and past exams — the audit flags untested outcomes, recycled questions, and Bloom gaps.
      </p>

      <div style={{ marginBottom: 14 }}>
        <button className="fz-btn" style={{ fontSize: 11, padding: '10px 16px', boxShadow: '3px 3px 0 #111', background: '#FAF8F3' }}
          onClick={() => { setClos(demoInputs.examQuality.clos); setExam(demoInputs.examQuality.exam); setPastExams(demoInputs.examQuality.pastExams); }}>
          Load example
        </button>
      </div>

      {error && <div className="fz-strip" style={{ marginBottom: 14 }}>{error}</div>}

      <Wizard steps={steps} step={step} setStep={setStep} canNext={canNext} onNext={handleAnalyze} nextLabel="Run audit" loading={loading} />
    </div>
  );
}
