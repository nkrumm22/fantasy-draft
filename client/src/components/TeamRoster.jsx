import React from 'react';

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181',
  DST: '#b794f4', K: '#4fd1c5',
};

const s = {
  wrapper: { padding: '1rem' },
  teamTabs: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' },
  teamTab: { padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #2d3748', background: 'transparent', color: '#a0aec0' },
  teamTabActive: { background: '#276749', borderColor: '#276749', color: '#fff', fontWeight: '700' },
  rosterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem' },
  playerCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '8px', padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', cursor: 'pointer', transition: 'border-color 0.1s' },
  playerCardSelected: { border: '1px solid #63b3ed', background: '#0d2137' },
  cardTop: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  pos: { fontSize: '0.7rem', fontWeight: '700', minWidth: '28px' },
  name: { fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0' },
  meta: { fontSize: '0.75rem', color: '#718096' },
  empty: { color: '#4a5568', fontStyle: 'italic', fontSize: '0.85rem', padding: '0.5rem 0' },
  teamHeader: { marginBottom: '1rem' },
  teamName: { fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0' },
  picks: { fontSize: '0.8rem', color: '#718096' },
};

export default function TeamRoster({ draft, allPlayers, selectedTeam, onSelectTeam, getRosterForTeam, onPlayerClick, selectedPlayerId }) {
  const roster = getRosterForTeam(selectedTeam);

  return (
    <div style={s.wrapper}>
      <div style={s.teamTabs}>
        {draft.teams.map((name, i) => (
          <button
            key={i}
            style={{ ...s.teamTab, ...(selectedTeam === i ? s.teamTabActive : {}) }}
            onClick={() => onSelectTeam(i)}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={s.teamHeader}>
        <div style={s.teamName}>{draft.teams[selectedTeam]}</div>
        <div style={s.picks}>{roster.length} of {draft.rounds} picks made</div>
      </div>

      {roster.length === 0
        ? <p style={s.empty}>No picks yet</p>
        : (
          <div style={s.rosterGrid}>
            {roster.map(p => {
              const isSelected = p.id === selectedPlayerId;
              return (
                <div
                  key={p.id}
                  style={{ ...s.playerCard, ...(isSelected ? s.playerCardSelected : {}) }}
                  onClick={() => onPlayerClick?.(isSelected ? null : p)}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#4a5568'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#2d3748'; }}
                >
                  <div style={s.cardTop}>
                    <span style={{ ...s.pos, color: POS_COLORS[p.position] }}>{p.position}</span>
                    <span style={s.name}>{p.name}</span>
                  </div>
                  <div style={s.meta}>{p.team} &bull; Pick #{p.pickNumber} (Rd {p.round})</div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}
