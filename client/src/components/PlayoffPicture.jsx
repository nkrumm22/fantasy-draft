import React, { useState, useEffect } from 'react';

const STATUS_CONFIG = {
  clinched:    { label: '✓ Clinched',    bg: '#1a3a1a', fg: '#68d391', border: '#276749' },
  in:          { label: '● In',           bg: '#0c2a1a', fg: '#4ade80', border: '#15803d' },
  contention:  { label: '~ Contention',  bg: '#2d2a0a', fg: '#f6ad55', border: '#975a16' },
  eliminated:  { label: '✗ Eliminated',  bg: '#2d1515', fg: '#fc8181', border: '#742a2a' },
};

const s = {
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  info: { fontSize: '0.82rem', color: '#718096' },
  table: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', overflow: 'hidden', width: '100%' },
  thead: { display: 'grid', gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem 7rem', padding: '0.5rem 1rem', borderBottom: '1px solid #2d3748', fontSize: '0.7rem', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.04em', gap: '0.5rem', alignItems: 'center' },
  row: { display: 'grid', gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem 7rem', padding: '0.6rem 1rem', borderBottom: '1px solid #1a2035', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' },
  cutoff: { borderBottom: '2px dashed #4a5568' },
  rank: { fontSize: '0.8rem', color: '#718096', fontWeight: '700' },
  teamName: { color: '#e2e8f0', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  teamNameYou: { color: '#63b3ed' },
  wl: { color: '#e2e8f0', fontWeight: '600', textAlign: 'center' },
  pf: { color: '#a0aec0', textAlign: 'center', fontSize: '0.82rem' },
  remaining: { color: '#718096', textAlign: 'center', fontSize: '0.82rem' },
  gb: { color: '#718096', textAlign: 'center', fontSize: '0.82rem' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700', border: '1px solid', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '3rem', color: '#4a5568', fontSize: '0.875rem' },
  legend: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#718096' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
};

export default function PlayoffPicture({ leagueId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/playoff-picture`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId, token]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading playoff picture...</div>;
  if (!data?.teams?.length) return <div style={s.empty}>No data available yet. Complete some matchups first.</div>;

  const { teams, playoffTeams, playoffStartWeek, currentWeek, myTeamId } = data;

  return (
    <div>
      <div style={s.header}>
        <span style={s.info}>
          Top {playoffTeams} teams advance · Playoffs begin Week {playoffStartWeek} · Current Week {currentWeek}
        </span>
      </div>

      <div style={s.table}>
        <div style={s.thead}>
          <span>#</span>
          <span>Team</span>
          <span style={{ textAlign: 'center' }}>W-L</span>
          <span style={{ textAlign: 'center' }}>PF</span>
          <span style={{ textAlign: 'center' }}>Rem</span>
          <span style={{ textAlign: 'center' }}>GB</span>
          <span>Status</span>
        </div>
        {teams.map((team, i) => {
          const sc = STATUS_CONFIG[team.status] || STATUS_CONFIG.contention;
          const isLastPlayoff = i === playoffTeams - 1;
          const isMe = team.teamId === myTeamId;
          return (
            <div
              key={team.teamId}
              style={{ ...s.row, ...(isLastPlayoff ? s.cutoff : {}), ...(isMe ? { background: '#0a1520' } : {}) }}
            >
              <span style={s.rank}>{team.rank}</span>
              <span style={{ ...s.teamName, ...(isMe ? s.teamNameYou : {}) }}>
                {team.teamName}
                {isMe && <span style={{ fontSize: '0.65rem', color: '#63b3ed', marginLeft: '0.35rem' }}>(you)</span>}
              </span>
              <span style={s.wl}>{team.wins}-{team.losses}</span>
              <span style={s.pf}>{team.pf.toFixed(0)}</span>
              <span style={s.remaining}>{team.gamesRemaining}</span>
              <span style={s.gb}>{team.gamesBehind === 0 ? '—' : `+${team.gamesBehind}`}</span>
              <span style={{ ...s.badge, background: sc.bg, color: sc.fg, borderColor: sc.border }}>
                {sc.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={s.legend}>
        {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
          <div key={key} style={s.legendItem}>
            <div style={{ ...s.legendDot, background: sc.fg }} />
            {sc.label}
          </div>
        ))}
        <span style={{ fontSize: '0.72rem', color: '#4a5568', marginLeft: 'auto' }}>
          - - - playoff cutoff line · GB = games behind last playoff spot
        </span>
      </div>
    </div>
  );
}
