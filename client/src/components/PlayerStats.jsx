import React, { useState, useEffect } from 'react';

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181',
  DST: '#b794f4', K: '#4fd1c5',
};

const STAT_LABELS = {
  gamesPlayed:       'Games',
  passYards:         'Pass Yds',
  passTDs:           'Pass TDs',
  ints:              'INTs',
  rushYards:         'Rush Yds',
  rushAttempts:      'Carries',
  rushTDs:           'Rush TDs',
  receptions:        'Rec',
  recYards:          'Rec Yds',
  recTDs:            'Rec TDs',
  targets:           'Targets',
  fgMade:            'FG Made',
  fgAttempts:        'FG Att',
  fgLong:            'FG Long',
  xpMade:            'XP Made',
  sacks:             'Sacks',
  fumblesRecovered:  'Fum Rec',
  defensiveTDs:      'Def TDs',
  ptsAllowedPerGame: 'Pts Allowed/G',
  fantasyPts:        'Fantasy Pts',
};

const s = {
  panel: { borderTop: '1px solid #2d3748', background: '#0f1420', padding: '1rem', flexShrink: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' },
  nameBlock: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  pos: { fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#1a2035' },
  name: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  sub: { fontSize: '0.8rem', color: '#718096' },
  close: { background: 'transparent', border: 'none', color: '#4a5568', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 },
  season: { fontSize: '0.7rem', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.4rem' },
  stat: { background: '#141824', borderRadius: '6px', padding: '0.45rem 0.6rem' },
  statVal: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  statLabel: { fontSize: '0.65rem', color: '#718096', marginTop: '0.1rem' },
  loading: { color: '#4a5568', fontSize: '0.85rem', fontStyle: 'italic' },
};

export default function PlayerStats({ player, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!player) return;
    setData(null);
    fetch(`/api/players/${player.id}/stats`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, [player?.id]);

  if (!player) return null;

  const stats = data?.stats ?? {};
  const entries = Object.entries(stats).filter(([k]) => k !== 'fantasyPts');
  const fantasyPts = stats.fantasyPts;

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
            <div style={{ marginLeft: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#68d391' }}>{fantasyPts}</div>
              <div style={{ fontSize: '0.65rem', color: '#718096' }}>FPTS</div>
            </div>
          )}
        </div>
        <button style={s.close} onClick={onClose}>✕</button>
      </div>

      {!data
        ? <div style={s.loading}>Loading stats...</div>
        : <>
            <div style={{ ...s.season, display: 'flex', justifyContent: 'space-between' }}>
              <span>2025 Season Stats</span>
              <span style={{ color: data.source === 'sleeper' ? '#68d391' : '#4a5568' }}>
                {data.source === 'sleeper' ? 'via Sleeper' : 'estimated'}
              </span>
            </div>
            <div style={s.grid}>
              {entries.map(([key, val]) => (
                <div key={key} style={s.stat}>
                  <div style={s.statVal}>{val.toLocaleString()}</div>
                  <div style={s.statLabel}>{STAT_LABELS[key] ?? key}</div>
                </div>
              ))}
            </div>
          </>
      }
    </div>
  );
}
