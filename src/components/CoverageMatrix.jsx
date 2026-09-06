export default function CoverageMatrix({ matrix, questions, blankRowRef }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="fz-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>CLO</th>
            {questions.map((q) => (
              <th key={q.number}>Q{q.number}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr
              key={row.clo.id}
              ref={row.isBlank ? blankRowRef : undefined}
              className={row.isBlank ? 'fz-flag-row' : undefined}
            >
              <td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontWeight: 700, color: row.isBlank ? '#E11D1D' : '#111' }}>
                {row.clo.id}
                {row.isBlank && <span style={{ fontWeight: 600, fontSize: 11 }}> — never tested</span>}
              </td>
              {row.covered.map((covered, j) => (
                <td key={j} className={covered ? 'fz-hit' : undefined}>
                  {covered ? '✓' : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
