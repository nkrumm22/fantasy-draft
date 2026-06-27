import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  title: { fontSize: '0.7rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.875rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.4rem 0.75rem', borderBottom: '1px solid #2d3748' },
  thRight: { textAlign: 'right' },
  td: { padding: '0.6rem 0.75rem', fontSize: '0.875rem', color: '#e2e8f0', borderBottom: '1px solid #1a2035' },
  tdRight: { textAlign: 'right' },
  rank: { fontSize: '0.75rem', fontWeight: '700', color: '#4a5568', minWidth: '1.5rem' },
  bar: { height: '6px', borderRadius: '3px', background: '#1a2035', overflow: 'hidden', marginTop: '4px', width: '100%', minWidth: '80px' },
  barFill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s' },
  you: { fontSize: '0.65rem', color: '#68d391', marginLeft: '0.4rem', fontWeight: '700' },
  note: { fontSize: '0.72rem', color: '#4a5568', marginTop: '1rem', textAlign: 'center' },
};

function barColor(pct) {
  if (pct < 0.25) return '#68d391';
  if (pct < 0.55) return '#f6ad55';
  return '#fc8181';
}

export default function BenchReport({ leagueId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/bench-report`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load bench report'); setLoading(false); });
  }, [leagueId, token]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Calculating bench report... (this may take a moment)</div>;
  if (error) return <div style={{ color: '#fc8181', padding: '2rem' }}>{error}</div>;

  const report = data?.report || [];
  const myTeamId = data?.myTeamId;

  if (report.length === 0) {
    return <div style={s.empty}>No completed weeks yet — bench report will appear after Week 1 is scored.</div>;
  }

  const maxTotal = Math.max(...report.map(r => r.totalLeft), 1);

  return (
    <div style={s.wrapper}>
      <div style={s.title}>Points Left on Bench — Season Total</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>Team</th>
            <th style={{ ...s.th, ...s.thRight }}>Total Left</th>
            <th style={{ ...s.th, ...s.thRight }}>Avg/Wk</th>
            <th style={s.th}>Waste</th>
          </tr>
        </thead>
        <tbody>
          {report.map((row, i) => {
            const isMe = row.teamId === myTeamId;
            const pct = row.totalLeft / maxTotal;
            return (
              <tr key={row.teamId} style={isMe ? { background: '#0d1f1a' } : {}}>
                <td style={{ ...s.td, ...s.rank }}>{i + 1}</td>
                <td style={s.td}>
                  <span style={isMe ? { color: '#68d391', fontWeight: '700' } : {}}>{row.teamName}</span>
                  {isMe && <span style={s.you}>you</span>}
                </td>
                <td style={{ ...s.td, ...s.tdRight, fontWeight: '700', color: '#fc8181' }}>
                  {row.totalLeft.toFixed(1)}
                </td>
                <td style={{ ...s.td, ...s.tdRight, color: '#a0aec0' }}>
                  {row.avgLeft.toFixed(1)}
                </td>
                <td style={{ ...s.td, minWidth: '100px' }}>
                  <div style={s.bar}>
                    <div style={{ ...s.barFill, width: `${pct * 100}%`, background: barColor(pct) }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={s.note}>
        Points left on bench = optimal lineup score − actual lineup score per week, summed across {data?.weeks?.length || 0} scored week(s).
        Lower is better.
      </div>
    </div>
  );
}
