export default function GraderConsistencyTable({ flags }) {
  if (flags.length === 0) {
    return (
      <p style={{ color: '#55524a', fontSize: 13 }}>No inconsistencies found.</p>
    );
  }

  return (
    <div className="fz-card" style={{ padding: 0, overflowX: 'auto' }}>
      <table className="fz-table">
        <thead>
          <tr>
            <th>Answer A</th>
            <th>Score A</th>
            <th>Answer B</th>
            <th>Score B</th>
            <th>Grader</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f, i) => (
            <tr key={i}>
              <td>{f.answerA}</td>
              <td>{f.scoreA}</td>
              <td>{f.answerB}</td>
              <td>{f.scoreB}</td>
              <td>{f.grader}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
