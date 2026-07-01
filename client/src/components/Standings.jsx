import React, { useState, useEffect } from 'react';
import { getSportColors } from '../sportTheme';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2d3748', fontWeight: '700' },
  thRight: { textAlign: 'right' },
  tr: { borderBottom: '1px solid #1a2035' },
  td: { padding: '0.7rem 0.75rem', fontSize: '0.875rem', color: '#e2e8f0', verticalAlign: 'middle' },
  tdRight: { textAlign: 'right' },
  tdMuted: { color: '#718096' },
  rank: { fontSize: '0.8rem', color: '#4a5568', fontWeight: '700', width: '2rem' },
  teamName: { fontWeight: '700', color: '#e2e8f0' },
  streak: { padding: '0.15rem 0.45rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700' },
  streakW: { background: '#1a3a1a', color: '#68d391' },
  streakL: { background: '#2d1515', color: '#fc8181' },
  streakT: { background: '#1a2035', color: '#718096' },
  luckyBadge: { padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' },
  tabs: { display: 'flex', gap: '0.35rem', marginBottom: '1rem' },
  tabBtn: { padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
};

export default function Standings({ leagueId, token, settings, sport = 'nfl' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('standings');

  const sc = getSportColors(sport);

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
  const hasTies = standings.some(t => t.ties > 0);

  if (standings.length === 0) {
    return <div style={s.empty}>No games scored yet. Standings will appear after Week 1 is complete.</div>;
  }

  const leader = standings[0];
  const hasLuckyData = standings.some(t => t.medianWins + t.medianLosses > 0);

  const getGB = (team) => {
    if (team.teamId === leader.teamId) return '–';
    const gb = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
    return gb === 0 ? '–' : gb % 1 === 0 ? gb.toString() : gb.toFixed(1);
  };

  const luckyList = [...standings].sort((a, b) => {
    const aLuck = a.luckyWins - a.unluckyLosses;
    const bLuck = b.luckyWins - b.unluckyLosses;
    return bLuck - aLuck;
  });

  const tabBtnActive = { background: sc.dim, border: `1px solid ${sc.accent}`, color: sc.soft };

  return (
    <div style={s.wrapper}>
      {hasLuckyData && (
        <div style={s.tabs}>
          <button style={{ ...s.tabBtn, ...(view === 'standings' ? tabBtnActive : {}) }} onClick={() => setView('standings')}>Standings</button>
          <button style={{ ...s.tabBtn, ...(view === 'lucky' ? tabBtnActive : {}) }} onClick={() => setView('lucky')}>Lucky / Unlucky</button>
        </div>
      )}

      {view === 'standings' && (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Team</th>
                <th style={{ ...s.th, ...s.thRight }}>W</th>
                <th style={{ ...s.th, ...s.thRight }}>L</th>
                {hasTies && <th style={{ ...s.th, ...s.thRight }}>T</th>}
                <th style={{ ...s.th, ...s.thRight }}>GB</th>
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
                const colSpan = hasTies ? 10 : 9;
                const gb = getGB(t);

                const rowStyle = {
                  ...s.tr,
                  ...(isMe
                    ? { background: sc.dim, borderLeft: `3px solid ${sc.accent}` }
                    : isPlayoff
                    ? { background: '#0f1f0f' }
                    : {}),
                };

                return (
                  <React.Fragment key={t.teamId}>
                    {isBubble && (
                      <tr>
                        <td colSpan={colSpan} style={{ padding: '0.2rem 0.75rem', fontSize: '0.7rem', color: '#718096', background: '#0a0e1a', borderTop: '2px dashed #2d3748' }}>
                          — Playoff line —
                        </td>
                      </tr>
                    )}
                    <tr style={rowStyle}>
                      <td style={{ ...s.td, ...s.rank }}>{i + 1}</td>
                      <td style={s.td}>
                        <span style={{ ...s.teamName, ...(isMe ? { color: sc.soft } : {}) }}>{t.teamName}</span>
                        {isMe && <span style={{ fontSize: '0.7rem', color: sc.soft, marginLeft: '0.4rem', opacity: 0.75 }}>(you)</span>}
                        {isPlayoff && !isMe && <span style={{ fontSize: '0.65rem', color: '#68d391', marginLeft: '0.4rem' }}>✓</span>}
                      </td>
                      <td style={{ ...s.td, ...s.tdRight, fontWeight: '700', color: '#68d391' }}>{t.wins}</td>
                      <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{t.losses}</td>
                      {hasTies && <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{t.ties}</td>}
                      <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted, fontSize: '0.8rem' }}>{gb}</td>
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
        </>
      )}

      {view === 'lucky' && (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Team</th>
                <th style={{ ...s.th, ...s.thRight }}>Actual</th>
                <th style={{ ...s.th, ...s.thRight }}>vs Median</th>
                <th style={{ ...s.th, ...s.thRight }}>Lucky W</th>
                <th style={{ ...s.th, ...s.thRight }}>Unlucky L</th>
                <th style={{ ...s.th, ...s.thRight }}>Luck</th>
              </tr>
            </thead>
            <tbody>
              {luckyList.map((t, i) => {
                const isMe = t.teamId === myTeamId;
                const luck = t.luckyWins - t.unluckyLosses;
                return (
                  <tr key={t.teamId} style={{ ...s.tr, ...(isMe ? { background: sc.dim, borderLeft: `3px solid ${sc.accent}` } : {}) }}>
                    <td style={{ ...s.td, ...s.rank }}>{i + 1}</td>
                    <td style={s.td}>
                      <span style={{ ...s.teamName, ...(isMe ? { color: sc.soft } : {}) }}>{t.teamName}</span>
                      {isMe && <span style={{ fontSize: '0.7rem', color: sc.soft, marginLeft: '0.4rem', opacity: 0.75 }}>(you)</span>}
                    </td>
                    <td style={{ ...s.td, ...s.tdRight }}>{t.wins}–{t.losses}</td>
                    <td style={{ ...s.td, ...s.tdRight }}>{t.medianWins}–{t.medianLosses}</td>
                    <td style={{ ...s.td, ...s.tdRight }}>
                      {t.luckyWins > 0
                        ? <span style={{ ...s.luckyBadge, background: '#744210', color: '#f6ad55' }}>{t.luckyWins}</span>
                        : <span style={s.tdMuted}>–</span>}
                    </td>
                    <td style={{ ...s.td, ...s.tdRight }}>
                      {t.unluckyLosses > 0
                        ? <span style={{ ...s.luckyBadge, background: '#1a2d48', color: '#63b3ed' }}>{t.unluckyLosses}</span>
                        : <span style={s.tdMuted}>–</span>}
                    </td>
                    <td style={{ ...s.td, ...s.tdRight, fontWeight: '700', color: luck > 0 ? '#f6ad55' : luck < 0 ? '#63b3ed' : '#718096' }}>
                      {luck > 0 ? `+${luck}` : luck === 0 ? '0' : luck}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#4a5568' }}>
            <strong style={{ color: '#f6ad55' }}>Lucky W</strong> = won but scored below the week's median.&nbsp;
            <strong style={{ color: '#63b3ed' }}>Unlucky L</strong> = lost but scored above the week's median.&nbsp;
            <strong>Luck</strong> = Lucky W − Unlucky L.
            <br />vs Median = record if each team played the median scorer that week.
          </div>
        </>
      )}
    </div>
  );
}
