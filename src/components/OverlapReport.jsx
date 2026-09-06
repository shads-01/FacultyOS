const MUTED = { color: '#55524a', fontSize: 13 };

function OverlapRow({ topic, overlapPercent, existingCourse }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 16,
        padding: '10px 12px',
        borderTop: '2px solid #111',
        fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
        fontSize: 13,
      }}
    >
      <span>
        {topic} — {existingCourse}
      </span>
      <span className="fz-match">{overlapPercent}%</span>
    </div>
  );
}

export default function OverlapReport({ overlaps = [], gaps = [] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
        marginTop: 32,
      }}
    >
      <div className="fz-card">
        <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Overlaps</h2>
        {overlaps.length === 0 ? (
          <p style={MUTED}>No overlaps found.</p>
        ) : (
          <div style={{ border: '2px solid #111' }}>
            {overlaps.map((o) => (
              <OverlapRow key={o.topic} {...o} />
            ))}
          </div>
        )}
      </div>

      <div className="fz-card">
        <h2 style={{ margin: '0 0 12px', fontSize: 15 }}>Curriculum Gaps</h2>
        {gaps.length === 0 ? (
          <p style={MUTED}>No gaps found.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {gaps.map((gap) => (
              <li key={gap} style={{ marginBottom: 8, fontSize: 14 }}>
                {gap}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
