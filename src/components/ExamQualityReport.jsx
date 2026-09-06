'use client';
import { buildCoverageMatrix, buildRecycledList, buildBloomDistribution } from '@/components/reportTransforms';
import CoverageMatrix from '@/components/CoverageMatrix';
import RecycledList from '@/components/RecycledList';
import TagChips from '@/components/TagChips';
import NextActions from '@/components/NextActions';

export default function ExamQualityReport({ report, blankRowRef, topRecycledRef }) {
  const matrix = buildCoverageMatrix(report.clos, report.questions, report.analysis);
  const recycled = buildRecycledList(report.questions, report.analysis);
  const bloom = buildBloomDistribution(report.analysis);
  const blankCount = matrix.filter((r) => r.isBlank).length;
  const bloomMax = Math.max(...bloom.map((b) => b.count), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
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
      <div className="fz-card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Bloom Distribution</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
          {bloom.map((b) => (
            <div key={b.level} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.count}</div>
              <div style={{ height: Math.round((b.count / bloomMax) * 56), background: b.count === 0 ? '#F0EDE4' : '#86EFAC', border: '2px solid #111' }} />
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>{b.level}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="fz-card" style={{ gridColumn: '1 / -1' }}>
        <h3 className="fz-label" style={{ fontSize: 13 }}>Per-Question Tags</h3>
        <TagChips questions={report.questions} analysis={report.analysis} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <NextActions screen="analyze" report={report} />
      </div>
    </div>
  );
}
