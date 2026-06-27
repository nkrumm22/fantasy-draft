import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  infoNote: {
    background: '#141824',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    padding: '0.6rem 0.9rem',
    fontSize: '0.78rem',
    color: '#718096',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    fontSize: '0.72rem',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #2d3748',
    fontWeight: '700',
  },
  thRight: { textAlign: 'right' },
  tr: { borderBottom: '1px solid #1a2035' },
  td: { padding: '0.7rem 0.75rem', fontSize: '0.875rem', color: '#e2e8f0', verticalAlign: 'middle' },
  tdRight: { textAlign: 'right' },
  tdMuted: { color: '#718096' },
  rank: { fontSize: '0.8rem', color: '#4a5568', fontWeight: '700', width: '2.2rem' },
  teamName: { fontWeight: '700', color: '#e2e8f0' },
  teamNameYou: { color: '#63b3ed' },
  record: { fontWeight: '600', color: '#e2e8f0' },
  allPlayRecord: { fontWeight: '700', color: '#e2e8f0' },
  allPlayLabel: { display: 'block', fontSize: '0.65rem', color: '#4a5568', fontWeight: '400', marginTop: '0.1rem' },
  pf: { fontWeight: '600', color: '#e2e8f0' },
  pfUnit: { fontSize: '0.72rem', color: '#718096', marginLeft: '0.2rem' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.9rem' },
};

export default function PowerRankings({ leagueId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/power-rankings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading power rankings...</div>;

  const rankings = data?.rankings || [];
  const myTeamId = data?.myTeamId;

  return (
    <div style={s.wrapper}>
      <div style={s.infoNote}>
        All-play ranks each team by how many matchups they'd win if they played every other team each week.
      </div>

      {rankings.length === 0 ? (
        <div style={s.empty}>No games played yet</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Team</th>
              <th style={{ ...s.th, ...s.thRight }}>Record</th>
              <th style={{ ...s.th, ...s.thRight }}>All-Play W-L</th>
              <th style={{ ...s.th, ...s.thRight }}>Total PF</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((team, i) => {
              const isMe = team.teamId === myTeamId;
              return (
                <tr key={team.teamId} style={s.tr}>
                  <td style={{ ...s.td, ...s.rank }}>#{i + 1}</td>
                  <td style={s.td}>
                    <span style={{ ...s.teamName, ...(isMe ? s.teamNameYou : {}) }}>
                      {team.teamName}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '0.7rem', color: '#63b3ed', marginLeft: '0.4rem' }}>(you)</span>
                    )}
                  </td>
                  <td style={{ ...s.td, ...s.tdRight }}>
                    <span style={s.record}>{team.wins}-{team.losses}</span>
                  </td>
                  <td style={{ ...s.td, ...s.tdRight }}>
                    <span style={s.allPlayRecord}>{team.allPlayWins}-{team.allPlayLosses}</span>
                    <span style={s.allPlayLabel}>All-Play W-L</span>
                  </td>
                  <td style={{ ...s.td, ...s.tdRight }}>
                    <span style={s.pf}>{typeof team.totalPF === 'number' ? team.totalPF.toFixed(1) : '–'}</span>
                    <span style={s.pfUnit}>pts</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
