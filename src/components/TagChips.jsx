export default function TagChips({ questions, analysis }) {
  const byNumber = new Map(analysis.map((a) => [a.questionNumber, a]));
  return (
    <div>
      {questions.map((q) => {
        const a = byNumber.get(q.number);
        if (!a) return null;
        return (
          <div key={q.number} style={{ marginBottom: 10 }}>
            <b style={{ fontSize: 12 }}>Q{q.number}</b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
              <span className="fz-chip">{a.topic}</span>
              <span className="fz-chip" style={{ background: '#FFD23F' }}>{a.bloom}</span>
              {a.coveredCLOs.map((c) => (
                <span key={c} className="fz-chip" style={{ background: '#86EFAC' }}>{c}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
