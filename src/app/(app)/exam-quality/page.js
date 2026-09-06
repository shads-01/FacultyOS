'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { analyzeResponse, runsResponse } from '@/components/mockResponses';
import { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } from '@/components/reportTransforms';
import CoverageMatrix from '@/components/CoverageMatrix';
import RecycledList from '@/components/RecycledList';
import TagChips from '@/components/TagChips';

const TA_STYLE = { fontFamily: 'var(--font-mono)', fontSize: 12 };

export default function ExamQualityPage() {
  const [clos, setClos] = useState('');
  const [exam, setExam] = useState('');
  const [pastExams, setPastExams] = useState('');
  const [report, setReport] = useState(null);
  const [runs] = useState(runsResponse.runs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const blankRowRef = useRef(null);
  const topRecycledRef = useRef(null);

  useEffect(() => {
    if (!report) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [blankRowRef.current, topRecycledRef.current].filter(Boolean);
    if (els.length) gsap.from(els, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out' });
  }, [report]);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      // TODO(integration): swap for real POST /api/analyze with Bearer token.
      await new Promise((r) => setTimeout(r, 300));
      setReport(analyzeResponse);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 1160 }}>
      <h1 className="fz-display" style={{ fontSize: 34, marginBottom: 6 }}>Exam Quality</h1>
      <p style={{ color: '#55524a', fontSize: 13.5, marginBottom: 24, maxWidth: 560 }}>
        Paste your Course Learning Outcomes, this year&apos;s draft exam, and past exams.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div>
          <label className="fz-label" htmlFor="fz-clos">Course Learning Outcomes</label>
          <textarea
            id="fz-clos"
            className="fz-textarea"
            style={TA_STYLE}
            value={clos}
            onChange={(e) => setClos(e.target.value)}
            placeholder={'CLO1: Explain time complexity\nCLO2: Implement recursive algorithms'}
          />
        </div>
        <div>
          <label className="fz-label" htmlFor="fz-exam">Draft Exam (this year)</label>
          <textarea
            id="fz-exam"
            className="fz-textarea"
            style={TA_STYLE}
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            placeholder={'1. Question text...\n2. Question text...'}
          />
        </div>
        <div>
          <label className="fz-label" htmlFor="fz-past">Past Exams</label>
          <textarea
            id="fz-past"
            className="fz-textarea"
            style={TA_STYLE}
            value={pastExams}
            onChange={(e) => setPastExams(e.target.value)}
            placeholder={'2024\n1. Question...\n2. Question...\n\n2022\n1. Question...'}
          />
        </div>
      </div>

      <button className="fz-btn" style={{ marginTop: 20 }} onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>

      {error && <div className="fz-strip" style={{ marginTop: 16 }}>{error}</div>}

      <div style={{ marginTop: 24 }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>History</h3>
        {runs.length === 0 ? (
          <p style={{ color: '#55524a', fontSize: 13 }}>No past runs yet.</p>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="cursor-pointer"
              style={{
                padding: '9px 12px',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                borderBottom: '2px solid #111',
                background: '#fff',
              }}
              onClick={() => setReport(run.result)}
            >
              {new Date(run.created_at).toLocaleString()}
            </div>
          ))
        )}
      </div>

      {report && <ExamQualityReport report={report} blankRowRef={blankRowRef} topRecycledRef={topRecycledRef} />}
    </div>
  );
}

function ExamQualityReport({ report, blankRowRef, topRecycledRef }) {
  const matrix = buildCoverageMatrix(report.clos, report.questions, report.analysis);
  const recycled = buildRecycledList(report.questions, report.analysis);
  const bloom = buildBloomDistribution(report.analysis);
  const blankCount = matrix.filter((r) => r.isBlank).length;
  const bloomMax = Math.max(...bloom.map((b) => b.count), 1);

  return (
    <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
      <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111' }}>
        <h3 className="fz-label" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          CLO Coverage Matrix
          <span className="fz-chip" style={blankCount > 0 ? { background: '#FECACA', color: '#E11D1D' } : undefined}>
            {blankCount} untested
          </span>
        </h3>
        <CoverageMatrix matrix={matrix} questions={report.questions} blankRowRef={blankRowRef} />
      </div>
      <div className="fz-card" style={{ boxShadow: '6px 6px 0 #111' }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Recycled Questions</h3>
        <RecycledList recycled={recycled} topRowRef={topRecycledRef} />
      </div>
      <div className="fz-card" style={{ gridColumn: '1 / -1', boxShadow: '6px 6px 0 #111' }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Bloom Distribution</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
          {bloom.map((b) => (
            <div key={b.level} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.count}</div>
              <div
                style={{
                  height: Math.round((b.count / bloomMax) * 56),
                  background: b.count === 0 ? '#F0EDE4' : '#86EFAC',
                  border: '2px solid #111',
                }}
              />
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>{b.level}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fz-card" style={{ gridColumn: '1 / -1', boxShadow: '6px 6px 0 #111' }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Per-Question Tags</h3>
        <TagChips questions={report.questions} analysis={report.analysis} />
      </div>
    </div>
  );
}
