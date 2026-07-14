import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.9rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2d3748', fontWeight: '700' },
  thRight: { textAlign: 'right' },
  tr: { borderBottom: '1px solid #1a2035' },
  td: { padding: '0.7rem 0.75rem', fontSize: '0.875rem', color: '#e2e8f0', verticalAlign: 'middle' },
  tdRight: { textAlign: 'right' },
  tdMuted: { color: '#718096' },
  rank: { fontSize: '0.8rem', color: '#4a5568', fontWeight: '700', width: '2rem' },
  owner: { fontWeight: '700', color: '#e2e8f0' },
  trophies: { color: '#f6ad55', fontSize: '0.8rem' },
  seasonCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' },
  seasonHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' },
  seasonName: { fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0' },
  statusChip: { fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px' },
  champion: { fontSize: '0.83rem', color: '#f6ad55' },
  noChampion: { fontSize: '0.83rem', color: '#4a5568', fontStyle: 'italic' },
};

const STATUS_STYLE = {
  pre_draft: { background: '#1a2035', color: '#718096' },
  drafting: { background: '#744210', color: '#f6ad55' },
  in_season: { background: '#1a3a1a', color: '#68d391' },
  complete: { background: '#2d1515', color: '#fc8181' },
};

export default function LeagueHistory({ leagueId, token, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/leagues/${leagueId}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed to load history'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || 'Connection error'); setLoading(false); });
  }, [leagueId, token]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading history...</div>;
  if (error) return <div style={{ color: '#fc8181', padding: '2rem', fontSize: '0.875rem' }}>{error}</div>;
  if (!data) return null;

  const seasons = data.seasons || [];
  const allTime = data.allTime || [];
  const isSingleSeason = seasons.length <= 1;

  return (
    <div style={s.wrapper}>
      <div style={s.sectionTitle}>All-Time Standings</div>
      {allTime.length === 0 ? (
        <div style={s.empty}>No completed games yet.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Owner</th>
              <th style={{ ...s.th, ...s.thRight }}>Seasons</th>
              <th style={{ ...s.th, ...s.thRight }}>Titles</th>
              <th style={{ ...s.th, ...s.thRight }}>W</th>
              <th style={{ ...s.th, ...s.thRight }}>L</th>
              <th style={{ ...s.th, ...s.thRight }}>T</th>
              <th style={{ ...s.th, ...s.thRight }}>PF</th>
              <th style={{ ...s.th, ...s.thRight }}>PA</th>
            </tr>
          </thead>
          <tbody>
            {allTime.map((a, i) => (
              <tr key={a.userId} style={s.tr}>
                <td style={{ ...s.td, ...s.rank }}>{i + 1}</td>
                <td style={s.td}>
                  <span style={s.owner}>{a.email}</span>
                  {a.userId === user?.id && <span style={{ fontSize: '0.7rem', color: '#4a5568', marginLeft: '0.4rem' }}>(you)</span>}
                </td>
                <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{a.seasons}</td>
                <td style={{ ...s.td, ...s.tdRight, ...s.trophies }}>{a.championships > 0 ? '🏆'.repeat(a.championships) : <span style={s.tdMuted}>–</span>}</td>
                <td style={{ ...s.td, ...s.tdRight, fontWeight: '700', color: '#68d391' }}>{a.wins}</td>
                <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{a.losses}</td>
                <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{a.ties}</td>
                <td style={{ ...s.td, ...s.tdRight }}>{a.pf.toFixed(1)}</td>
                <td style={{ ...s.td, ...s.tdRight, ...s.tdMuted }}>{a.pa.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={s.sectionTitle}>Seasons</div>
      {isSingleSeason && (
        <div style={{ fontSize: '0.8rem', color: '#4a5568', marginBottom: '0.85rem' }}>
          This is your first season — history builds up here as the commissioner starts new seasons from the Commissioner tab.
        </div>
      )}
      {seasons.map(season => {
        const statusStyle = STATUS_STYLE[season.status] || STATUS_STYLE.pre_draft;
        return (
          <div key={season.leagueId} style={s.seasonCard}>
            <div style={s.seasonHeader}>
              <span style={s.seasonName}>{season.name} — {season.season}</span>
              <span style={{ ...s.statusChip, ...statusStyle }}>{season.status.replace('_', ' ')}</span>
            </div>
            {season.champion ? (
              <div style={s.champion}>🏆 {season.champion.teamName} ({season.champion.email}) — {season.champion.wins}-{season.champion.losses}{season.champion.ties ? `-${season.champion.ties}` : ''}, {season.champion.pf.toFixed(1)} PF</div>
            ) : (
              <div style={s.noChampion}>No completed games yet this season</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
