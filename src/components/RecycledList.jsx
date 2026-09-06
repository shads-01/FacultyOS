export default function RecycledList({ recycled, topRowRef }) {
  if (recycled.length === 0) {
    return <p style={{ color: '#55524a', fontSize: 13 }}>No recycled questions found (≥60% similarity).</p>;
  }
  return (
    <div>
      {recycled.map((item, i) => {
        const pct = item.similarity.percent;
        const high = pct >= 80;
        return (
          <div
            key={item.question.number}
            ref={i === 0 ? topRowRef : undefined}
            className="cursor-pointer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              padding: '10px 0',
              borderBottom: '2px solid #111',
              fontSize: 13,
            }}
          >
            <span>
              <b>Q{item.question.number}</b> · {item.question.text}
            </span>
            <span
              className="fz-match"
              style={{
                color: high ? '#E11D1D' : '#111',
                border: `2px solid ${high ? '#E11D1D' : '#111'}`,
                background: high ? '#FECACA' : '#FAF8F3',
                padding: '3px 10px',
              }}
            >
              {pct}% → {item.similarity.year} {item.similarity.matchedQuestion}
            </span>
          </div>
        );
      })}
    </div>
  );
}
