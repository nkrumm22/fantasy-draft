import React, { useState, useEffect } from 'react';
import { PlayerHeadshot } from './PlayerStats';
import { getSportColors } from '../sportTheme';

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

const s = {
  wrapper: { padding: '1.25rem 0' },
  header: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
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
  columns: { display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  column: {
    flex: 1,
    background: '#141824',
    border: '1px solid #2d3748',
    borderRadius: '10px',
    overflow: 'hidden',
    minWidth: 0,
  },
  columnHeader: {
    padding: '0.9rem 1.1rem 0.75rem',
    borderBottom: '1px solid #2d3748',
  },
  columnBody: { padding: '0.75rem 1.1rem 1rem' },
  teamName: { fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.15rem' },
  scoreDisplay: { fontSize: '3rem', fontWeight: '800', lineHeight: 1, color: '#e2e8f0' },
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
  playerName: { fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statLine: { fontSize: '0.7rem', color: '#718096', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  playerScore: { fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0', flexShrink: 0 },
  emptyLineup: { fontSize: '0.82rem', color: '#4a5568', padding: '0.5rem 0' },
  vsLabel: { fontSize: '0.9rem', color: '#4a5568', fontWeight: '700', alignSelf: 'flex-start', paddingTop: '1.5rem', flexShrink: 0 },
  summaryCard: { marginTop: '1.25rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '0.9rem 1.1rem' },
  summaryTitle: { fontSize: '0.78rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' },
  summaryLine: { fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
  summaryDot: { flexShrink: 0, marginTop: '0.35rem', width: 5, height: 5, borderRadius: '50%', background: '#4a5568' },
};

// Builds a plain-language explanation of why a completed matchup went the way it did,
// using only the box-score data already fetched (top scorers + biggest same-position gap).
function buildMatchupSummary(myTeam, oppTeam, myWon, margin) {
  const mine = (myTeam.starters || []).filter(p => typeof p.score === 'number');
  const opp = (oppTeam.starters || []).filter(p => typeof p.score === 'number');
  if (mine.length === 0 || opp.length === 0) return [];

  const topMine = [...mine].sort((a, b) => b.score - a.score)[0];
  const lines = [`${topMine.name} was your top scorer with ${topMine.score.toFixed(1)} pts.`];

  let bestGap = null;
  mine.forEach(mp => {
    const op = opp.find(o => o.position === mp.position);
    if (!op) return;
    const diff = mp.score - op.score;
    if (!bestGap || Math.abs(diff) > Math.abs(bestGap.diff)) bestGap = { mine: mp, opp: op, diff };
  });

  if (bestGap) {
    if (myWon && bestGap.diff > 0) {
      lines.push(`Your ${bestGap.mine.position}, ${bestGap.mine.name}, outscored their ${bestGap.opp.name} by ${bestGap.diff.toFixed(1)} pts — that was the difference-maker.`);
    } else if (!myWon && bestGap.diff < 0) {
      lines.push(`Their ${bestGap.opp.position}, ${bestGap.opp.name}, outscored your ${bestGap.mine.name} by ${Math.abs(bestGap.diff).toFixed(1)} pts — that swing hurt.`);
    }
  }

  lines.push(`Final margin: ${Math.abs(margin).toFixed(1)} pts.`);
  return lines;
}

function TeamColumn({ team, isMyTeam, isWinner, sc, isLive }) {
  const starters = team?.starters || [];
  const score = typeof team?.score === 'number' ? team.score : null;

  const headerBg = isMyTeam
    ? `linear-gradient(135deg, ${sc.dim} 0%, #141824 60%)`
    : '#141824';

  const scoreColor = isWinner
    ? sc.soft
    : score !== null
    ? '#e2e8f0'
    : '#4a5568';

  return (
    <div style={{ ...s.column, ...(isMyTeam ? { borderColor: sc.accent } : {}) }}>
      <div style={{ ...s.columnHeader, background: headerBg }}>
        <div style={{ ...s.teamName, ...(isMyTeam ? { color: sc.soft } : {}) }}>
          {team?.name || '—'}
          {isMyTeam && <span style={{ fontSize: '0.7rem', color: sc.soft, marginLeft: '0.4rem', opacity: 0.75 }}>(you)</span>}
        </div>
        <div style={{
          ...s.scoreDisplay,
          color: scoreColor,
          animation: isLive && score !== null ? 'score-pop 0.4s ease' : 'none',
        }}>
          {score !== null ? score.toFixed(1) : '–'}
        </div>
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#f6ad55',
              animation: 'pulse-live 1.4s ease-in-out infinite',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: '0.65rem', color: '#f6ad55', fontWeight: '700' }}>LIVE</span>
          </div>
        )}
      </div>

      <div style={s.columnBody}>
        <div style={s.divider} />
        {starters.length === 0 ? (
          <div style={s.emptyLineup}>No lineup set</div>
        ) : (
          starters.map(player => {
            const posStyle = POSITION_STYLES[player.position] || { background: '#1a2035', color: '#718096' };
            return (
              <div key={player.id} style={s.playerRow}>
                <PlayerHeadshot url={player.headshotUrl} size={28} />
                <span style={{ ...s.posBadge, ...posStyle }}>{player.position}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.playerName} title={player.name}>{player.name}</div>
                  {player.statLine && <div style={s.statLine}>{player.statLine}</div>}
                </div>
                <span style={s.playerScore}>{typeof player.score === 'number' ? player.score.toFixed(1) : '–'}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function MatchupDetail({ leagueId, token, matchupId, onClose, sport = 'nfl' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sc = getSportColors(sport);

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
  const isLive = status === 'in_progress';
  const isDone = status === 'complete';
  const hs = typeof home?.score === 'number' ? home.score : null;
  const as_ = typeof away?.score === 'number' ? away.score : null;
  const homeWon = isDone && hs !== null && as_ !== null && hs > as_;
  const awayWon = isDone && hs !== null && as_ !== null && as_ > hs;

  const myTeam = home?.teamId === myTeamId ? home : away?.teamId === myTeamId ? away : null;
  const oppTeam = myTeam === home ? away : myTeam === away ? home : null;
  const myScore = typeof myTeam?.score === 'number' ? myTeam.score : null;
  const oppScore = typeof oppTeam?.score === 'number' ? oppTeam.score : null;
  const summaryLines = isDone && myTeam && oppTeam && myScore !== null && oppScore !== null
    ? buildMatchupSummary(myTeam, oppTeam, myScore > oppScore, myScore - oppScore)
    : [];

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onClose}>← Back</button>
        <span style={s.headingText}>Week {week}</span>
        {isLive && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '20px', background: '#744210', color: '#f6ad55' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f6ad55', animation: 'pulse-live 1.4s ease-in-out infinite', display: 'inline-block' }} />
            LIVE
          </span>
        )}
        {isDone && (
          <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '20px', background: '#1a2d48', color: '#63b3ed' }}>
            FINAL
          </span>
        )}
        {!isLive && !isDone && (
          <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.55rem', borderRadius: '20px', background: '#1a2035', color: '#718096' }}>
            UPCOMING
          </span>
        )}
      </div>

      <div style={s.columns}>
        <TeamColumn team={home} isMyTeam={home?.teamId === myTeamId} isWinner={homeWon} sc={sc} isLive={isLive} />
        <div style={s.vsLabel}>vs</div>
        <TeamColumn team={away} isMyTeam={away?.teamId === myTeamId} isWinner={awayWon} sc={sc} isLive={isLive} />
      </div>

      {summaryLines.length > 0 && (
        <div style={s.summaryCard}>
          <div style={s.summaryTitle}>{myScore > oppScore ? 'Why you won' : 'Why you lost'}</div>
          {summaryLines.map((line, i) => (
            <div key={i} style={{ ...s.summaryLine, marginBottom: i < summaryLines.length - 1 ? '0.5rem' : 0 }}>
              <span style={s.summaryDot} />
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
