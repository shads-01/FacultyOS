export default function GradingTable({ results }) {
  return (
    <div className="fz-card">
      <table className="fz-table">
        <thead>
          <tr>
            <th>Answer</th>
            <th>Human Score</th>
            <th>AI Score</th>
            <th>Delta</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const flag = r.delta !== null && Math.abs(r.delta) >= 3;
            return (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{r.humanScore ?? '—'}</td>
                <td>{r.aiScore}</td>
                <td style={flag ? { fontWeight: 'bold', color: '#E11D1D' } : undefined}>
                  {r.delta ?? '—'}
                </td>
                <td>{r.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
