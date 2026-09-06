import { buildNextActions } from '@/lib/nextActions';

export default function NextActions({ screen, report }) {
  const actions = buildNextActions(screen, report);
  if (actions.length === 0) return null;
  return (
    <div className="fz-card" style={{ boxShadow: '6px 6px 0 #E11D1D', marginTop: 16 }}>
      <h3 className="fz-label" style={{ fontSize: 13, color: '#E11D1D' }}>What to do next</h3>
      <ol style={{ paddingLeft: 20, margin: 0 }}>
        {actions.map((a, i) => (
          <li key={i} style={{ fontSize: 13.5, padding: '5px 0', fontWeight: 600 }}>{a}</li>
        ))}
      </ol>
    </div>
  );
}
