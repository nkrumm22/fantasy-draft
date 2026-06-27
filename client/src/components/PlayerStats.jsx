import React, { useState, useEffect } from 'react';

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181', DST: '#b794f4', K: '#4fd1c5',
  PG: '#63b3ed', SG: '#76e4f7', SF: '#68d391', PF: '#f6ad55', C: '#fc8181',
  P: '#9f7aea', '1B': '#68d391', '2B': '#63b3ed', '3B': '#f6ad55', SS: '#fc8181', OF: '#76e4f7', UTIL: '#4fd1c5',
  LW: '#68d391', RW: '#63b3ed', D: '#f6ad55', G: '#fc8181',
  GKP: '#9f7aea', DEF: '#68d391', MID: '#63b3ed', FWD: '#fc8181',
};

const STAT_LABELS = {
  gamesPlayed: 'Games', passYards: 'Pass Yds', passTDs: 'Pass TDs', ints: 'INTs',
  rushYards: 'Rush Yds', rushAttempts: 'Carries', rushTDs: 'Rush TDs',
  receptions: 'Rec', recYards: 'Rec Yds', recTDs: 'Rec TDs', targets: 'Targets',
  fgMade: 'FG Made', fgAttempts: 'FG Att', fgLong: 'FG Long', xpMade: 'XP Made',
  sacks: 'Sacks', fumblesRecovered: 'Fum Rec', defensiveTDs: 'Def TDs',
  ptsAllowedPerGame: 'Pts Allowed/G', fantasyPts: 'Fantasy Pts',
};

const SOURCE_LABEL = {
  sleeper: { text: 'via Sleeper', color: '#68d391' },
  custom:  { text: 'custom import', color: '#63b3ed' },
  estimated: { text: 'estimated', color: '#4a5568' },
  unavailable: { text: 'not available', color: '#4a5568' },
  not_found: { text: 'not available', color: '#4a5568' },
};

const s = {
  panel: { borderTop: '1px solid #2d3748', background: '#0f1420', padding: '1rem', flexShrink: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' },
  nameBlock: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  pos: { fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#1a2035' },
  name: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  sub: { fontSize: '0.8rem', color: '#718096' },
  fpts: { marginLeft: '0.75rem', textAlign: 'center' },
  fptsVal: { fontSize: '1.1rem', fontWeight: '800', color: '#68d391' },
  fptsLabel: { fontSize: '0.65rem', color: '#718096' },
  close: { background: 'transparent', border: 'none', color: '#4a5568', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 },
  tabs: { display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' },
  tab: { padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', border: '1px solid #2d3748', background: 'transparent', color: '#718096' },
  tabActive: { background: '#276749', borderColor: '#276749', color: '#fff' },
  meta: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' },
  season: { fontSize: '0.7rem', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.4rem' },
  stat: { background: '#141824', borderRadius: '6px', padding: '0.45rem 0.6rem' },
  statVal: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  statLabel: { fontSize: '0.65rem', color: '#718096', marginTop: '0.1rem' },
  loading: { color: '#4a5568', fontSize: '0.85rem', fontStyle: 'italic' },
};

export default function PlayerStats({ player, onClose, scoringFormat = 'ppr' }) {
  const [view, setView] = useState('stats');
  const [statsData, setStatsData] = useState(null);
  const [projData, setProjData] = useState(null);

  useEffect(() => {
    if (!player) return;
    setStatsData(null);
    setProjData(null);
    setView('stats');
    fetch(`/api/players/${player.id}/stats?format=${scoringFormat}`).then(r => r.json()).then(setStatsData).catch(console.error);
    fetch(`/api/players/${player.id}/projections?format=${scoringFormat}`).then(r => r.json()).then(setProjData).catch(console.error);
  }, [player?.id]);

  if (!player) return null;

  const isStats = view === 'stats';
  const data = isStats ? statsData : projData;
  const rawValues = isStats ? data?.stats : data?.projections;
  const entries = rawValues ? Object.entries(rawValues).filter(([k]) => k !== 'fantasyPts') : null;
  const fantasyPts = rawValues?.fantasyPts;
  const sourceInfo = SOURCE_LABEL[data?.source] ?? SOURCE_LABEL.estimated;
  const noData = data && (data.source === 'unavailable' || data.source === 'not_found');

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.nameBlock}>
          <span style={{ ...s.pos, color: POS_COLORS[player.position] }}>{player.position}</span>
          <div>
            <div style={s.name}>{player.name}</div>
            <div style={s.sub}>{player.team} &bull; ADP #{player.adp}</div>
          </div>
          {fantasyPts != null && (
            <div style={s.fpts}>
              <div style={s.fptsVal}>{fantasyPts}</div>
              <div style={s.fptsLabel}>FPTS</div>
            </div>
          )}
        </div>
        <button style={s.close} onClick={onClose}>✕</button>
      </div>

      {(player.injuryStatus || player.byeWeek) && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {player.injuryStatus && (
            <span style={{
              fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '6px',
              background: player.injuryStatus === 'Questionable' ? '#2d2007' : '#2d1515',
              color: player.injuryStatus === 'Questionable' ? '#f6ad55' : '#fc8181',
            }}>
              {player.injuryStatus}{player.injuryBodyPart ? ` — ${player.injuryBodyPart}` : ''}
            </span>
          )}
          {player.byeWeek && (
            <span style={{ fontSize: '0.75rem', color: '#718096', background: '#1a2035', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              Bye Week {player.byeWeek}
            </span>
          )}
        </div>
      )}

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(isStats ? s.tabActive : {}) }} onClick={() => setView('stats')}>2025 Stats</button>
        <button style={{ ...s.tab, ...(!isStats ? s.tabActive : {}) }} onClick={() => setView('projections')}>2026 Projections</button>
      </div>

      {!data
        ? <div style={s.loading}>Loading...</div>
        : (noData || !entries || entries.length === 0)
          ? <div style={s.loading}>No {isStats ? 'stats' : 'projections'} available</div>
          : <>
              <div style={s.meta}>
                <span style={s.season}>{isStats ? '2025 Season Stats' : '2026 Season Projections'}</span>
                <span style={{ fontSize: '0.7rem', color: sourceInfo.color }}>{sourceInfo.text}</span>
              </div>
              <div style={s.grid}>
                {entries.map(([key, val]) => (
                  <div key={key} style={s.stat}>
                    <div style={s.statVal}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
                    <div style={s.statLabel}>{STAT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>
            </>
      }
    </div>
  );
}
