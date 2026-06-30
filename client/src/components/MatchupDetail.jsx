import React, { useState, useEffect } from 'react';

const POSITION_STYLES = {
  QB:  { background: '#2c4a6e', color: '#63b3ed' },
  RB:  { background: '#1a3a1a', color: '#68d391' },
  WR:  { background: '#44337a', color: '#b794f4' },
  TE:  { background: '#744210', color: '#f6ad55' },
  K:   { background: '#1a2d48', color: '#90cdf4' },
  DST: { background: '#2d1515', color: '#fc8181' },
  PG:  { background: '#2c4a6e', color: '#63b3ed' },
  SG:  { background: '#1a2d48', color: '#90cdf4' },
  SF:  { background: '#1a3a1a', color: '#68d391' },
  PF:  { background: '#744210', color: '#f6ad55' },
  C:   { background: '#2d1515', color: '#fc8181' },
  P:   { background: '#44337a', color: '#b794f4' },
  '1B': { background: '#1a3a1a', color: '#68d391' },
  '2B': { background: '#2c4a6e', color: '#63b3ed' },
  '3B': { background: '#744210', color: '#f6ad55' },
  SS:  { background: '#2d1515', color: '#fc8181' },
  OF:  { background: '#1a2d48', color: '#90cdf4' },
  LW:  { background: '#1a3a1a', color: '#68d391' },
  RW:  { background: '#2c4a6e', color: '#63b3ed' },
  D:   { background: '#744210', color: '#f6ad55' },
  G:   { background: '#2d1515', color: '#fc8181' },
  GKP: { background: '#44337a', color: '#b794f4' },
  DEF: { background: '#1a3a1a', color: '#68d391' },
  MID: { background: '#2c4a6e', color: '#63b3ed' },
  FWD: { background: '#2d1515', color: '#fc8181' },
};

const STATUS_CHIP = {
  complete:    { label: 'Final',    background: '#1a2d48', color: '#63b3ed' },
  in_progress: { label: 'Live',     background: '#744210', color: '#f6ad55' },
  scheduled:   { label: 'Upcoming', background: '#1a2035', color: '#718096' },
};

const s = {
  wrapper: { padding: '1.25rem 0' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  backBtn: {
    padding: '0.35rem 0.8rem',
    background: 'transparent',
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#718096',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  headingText: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  statusChip: { fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '20px' },
  columns: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  column: {
    flex: 1,
    background: '#141824',
    border: '1px solid #2d3748',
    borderRadius: '10px',
    padding: '1rem 1.1rem',
    minWidth: 0,
  },
  columnHighlight: { borderColor: '#276749' },
  teamName: { fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.2rem' },
  teamNameYou: { color: '#63b3ed' },
  scoreDisplay: { fontSize: '2rem', fontWeight: '800', color: '#e2e8f0', lineHeight: 1.1, marginBottom: '1rem' },
  divider: { borderTop: '1px solid #2d3748', marginBottom: '0.75rem' },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    padding: '0.35rem 0',
    borderBottom: '1px solid #1a2035',
  },
  posBadge: {
    fontSize: '0.6rem',
    fontWeight: '800',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    letterSpacing: '0.03em',
    flexShrink: 0,
    minWidth: '2.2rem',
    textAlign: 'center',
  },
  playerName: { flex: 1, fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  playerScore: { fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0', flexShrink: 0 },
  noScores: { fontSize: '0.82rem', color: '#4a5568', padding: '0.5rem 0' },
  emptyLineup: { fontSize: '0.82rem', color: '#4a5568', padding: '0.5rem 0' },
  vsLabel: { fontSize: '0.9rem', color: '#4a5568', fontWeight: '700', alignSelf: 'flex-start', paddingTop: '1.25rem', flexShrink: 0 },
};

function TeamColumn({ team, isMyTeam }) {
  const starters = team?.starters || [];

  return (
    <div style={{ ...s.column, ...(isMyTeam ? s.columnHighlight : {}) }}>
      <div style={{ ...s.teamName, ...(isMyTeam ? s.teamNameYou : {}) }}>
        {team?.name || '—'}
        {isMyTeam && <span style={{ fontSize: '0.7rem', color: '#63b3ed', marginLeft: '0.4rem' }}>(you)</span>}
      </div>
      <div style={s.scoreDisplay}>
        {typeof team?.score === 'number' ? team.score.toFixed(1) : '–'}
      </div>
      <div style={s.divider} />
      {starters.length === 0 ? (
        <div style={s.emptyLineup}>No lineup set</div>
      ) : (
        starters.map(player => {
          const posStyle = POSITION_STYLES[player.position] || { background: '#1a2035', color: '#718096' };
          return (
            <div key={player.id} style={s.playerRow}>
              <span style={{ ...s.posBadge, ...posStyle }}>{player.position}</span>
              <span style={s.playerName} title={player.name}>{player.name}</span>
              <span style={s.playerScore}>{typeof player.score === 'number' ? player.score.toFixed(1) : '–'}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function MatchupDetail({ leagueId, token, matchupId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/leagues/${leagueId}/matchups/${matchupId}/detail`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load matchup');
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message || 'Connection error'); setLoading(false); });
  }, [leagueId, matchupId, token]);

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading matchup...</div>;
  if (error) return <div style={{ color: '#fc8181', padding: '2rem', fontSize: '0.875rem' }}>{error}</div>;
  if (!data) return null;

  const { week, status, home, away, myTeamId } = data;
  const chipConfig = STATUS_CHIP[status] || STATUS_CHIP.scheduled;

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onClose}>← Back</button>
        <span style={s.headingText}>Week {week}</span>
        <span style={{ ...s.statusChip, background: chipConfig.background, color: chipConfig.color }}>
          {chipConfig.label}
        </span>
      </div>

      <div style={s.columns}>
        <TeamColumn team={home} isMyTeam={home?.teamId === myTeamId} />
        <div style={s.vsLabel}>vs</div>
        <TeamColumn team={away} isMyTeam={away?.teamId === myTeamId} />
      </div>
    </div>
  );
}
