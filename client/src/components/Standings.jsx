import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2d3748', fontWeight: '700' },
  thRight: { textAlign: 'right' },
  tr: { borderBottom: '1px solid #1a2035' },
  trPlayoff: { background: '#0f1f0f' },
  trBubble: { background: '#1a2010' },
  td: { padding: '0.7rem 0.75rem', fontSize: '0.875rem', color: '#e2e8f0', verticalAlign: 'middle' },
  tdRight: { textAlign: 'right' },
  tdMuted: { color: '#718096' },
  rank: { fontSize: '0.8rem', color: '#4a5568', fontWeight: '700', width: '2rem' },
  teamName: { fontWeight: '700', color: '#e2e8f0' },
  teamNameYou: { color: '#68d391' },
  record: { fontWeight: '600' },
  streak: { padding: '0.15rem 0.45rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' },
  streakW: { background: '#1a3a1a', color: '#68d391' },
  streakL: { background: '#2d1515', color: '#fc8181' },
  streakT: { background: '#1a2035', color: '#718096' },
  playoffLine: { borderTop: '2px dashed #276749' },
  playoffLabel: { fontSize: '0.7rem', color: '#68d391', fontWeight: '700', padding: '0.3rem 0.75rem', background: '#0f1f0f', borderBottom: '1px solid #1a3a1a' },
};

export default function Standings({ leagueId, token, settings, myUserId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/standings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading standings...</div>;

  const standings = data?.standings || [];
  const myTeamId = data?.myTeamId;
  const playoffTeams = settings?.playoffTeams || 4;

  if (standings.length === 0) {
    return (
      <div style={s.empty}>
        No games scored yet. Standings will appear after Week 1 is complete.
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>Team</th>
            <th style={{ ...s.th, ...s.thRight }}>W</th>
            <th style={{ ...s.th, ...s.thRight }}>L</th>
            {standings.some(t => t.ties > 0) && <th style={{ ...s.th, ...s.thRight }}>T</th>}
            <th style={{ ...s.th, ...s.thRight }}>PF</th>
            <th style={{ ...s.th, ...s.thRight }}>PA</th>
            <th style={{ ...s.th, ...s.thRight }}>+/-</th>
            <th style={{ ...s.th, ...s.thRight }}>Streak</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((t, i) => {
            const isPlayoff = i < playoffTeams;
            const isBubble = i === playoffTeams;
            const isMe = t.teamId === myTeamId;
            const diff = t.pf - t.pa;
            const streakLetter = t.streak?.[0];
            const streakStyle = streakLetter === 'W' ? s.streakW : streakLetter === 'L' ? s.streakL : s.streakT;
            const hasTies = standings.some(x => x.ties > 0);

            return (
              <React.Fragment key={t.teamId}>
                {isBubble && (
                  <tr>
                    <td colSpan={hasTies ? 9 : 8} style={{ padding: '0.2rem 0.75rem', fontSize: '0.7rem', color: '#718096', background: '#0a0e1a', borderTop: '2px dashed #2d3748' }}>
                      — Playoff line —
                    </td>
                  </tr>
                )}
                <tr style={{ ...s.tr, ...(isPlayoff ? s.trPlayoff : {}) }}>
                  <td style={{ ...s.td, ...s.rank }}>{i + 1}</td>
                  <td style={s.td}>
                    <span style={{ ...s.teamName, ...(isMe ? s.teamNameYou : {}) }}>{t.teamName}</span>
                    {isMe && <span style={{ fontSize: '0.7rem', color: '#68d391', marginLeft: '0.4rem' }}>(you)</span>}
                    {isPlayoff && <span style={{ fontSize: '0.65rem', color: '#68d391', marginLeft: '0.4rem' }}>✓ Playoff</span>}
                  </td>
                  <td style={{ ...s.td, ...s.tdRight, fontWeight: '700', color: '#68d391' }}>{t.wins}</td>
                  <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{t.losses}</td>
                  {hasTies && <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{t.ties}</td>}
                  <td style={{ ...s.td, ...s.tdRight }}>{t.pf.toFixed(1)}</td>
                  <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{t.pa.toFixed(1)}</td>
                  <td style={{ ...s.td, ...s.tdRight, color: diff >= 0 ? '#68d391' : '#fc8181' }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                  </td>
                  <td style={{ ...s.td, ...s.tdRight }}>
                    {t.streak && <span style={{ ...s.streak, ...streakStyle }}>{t.streak}</span>}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#4a5568' }}>
        Top {playoffTeams} teams qualify for playoffs. Sorted by W, then PF as tiebreaker.
      </div>
    </div>
  );
}
