import React from 'react';

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181',
  DST: '#b794f4', K: '#4fd1c5',
};

const s = {
  wrapper: { flex: 1, overflowY: 'auto', padding: '0.75rem' },
  roundLabel: { fontSize: '0.7rem', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.4rem 0 0.25rem' },
  row: { display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' },
  cell: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.5rem', borderRadius: '5px', background: '#1a2035', minHeight: '32px' },
  cellEmpty: { background: '#0f1420', border: '1px dashed #2d3748', opacity: 0.6 },
  cellCurrent: { background: '#22543d', border: '1px solid #276749' },
  pickNum: { fontSize: '0.7rem', color: '#4a5568', width: '22px', flexShrink: 0 },
  team: { fontSize: '0.7rem', color: '#718096', width: '60px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pos: { fontSize: '0.65rem', fontWeight: '700', width: '26px', flexShrink: 0 },
  name: { fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};

export default function DraftBoard({ draft, allPlayers }) {
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));
  const pickMap = Object.fromEntries(draft.picks.map(pk => [`${pk.round}-${pk.teamIndex}`, pk]));

  const rounds = Array.from({ length: draft.rounds }, (_, i) => i + 1);

  return (
    <div style={s.wrapper}>
      {rounds.map(round => {
        const teamOrder = [...Array(draft.teams.length).keys()];
        if (round % 2 === 0) teamOrder.reverse();
        return (
          <div key={round} style={s.row}>
            <div style={s.roundLabel}>Round {round}</div>
            {teamOrder.map((teamIndex, slotIndex) => {
              const overallPick = (round - 1) * draft.teams.length + slotIndex + 1;
              const currentPick = draft.currentPickIndex + 1;
              const pick = pickMap[`${round}-${teamIndex}`];
              const isCurrent = overallPick === currentPick && !pick;
              const player = pick ? playerMap[pick.playerId] : null;
              return (
                <div key={teamIndex} style={{ ...s.cell, ...(isCurrent ? s.cellCurrent : {}), ...(!pick && !isCurrent ? s.cellEmpty : {}) }}>
                  <span style={s.pickNum}>#{overallPick}</span>
                  <span style={s.team}>{draft.teams[teamIndex]}</span>
                  {player && (
                    <>
                      <span style={{ ...s.pos, color: POS_COLORS[player.position] }}>{player.position}</span>
                      <span style={s.name}>{player.name}</span>
                    </>
                  )}
                  {isCurrent && !player && <span style={{ fontSize: '0.75rem', color: '#68d391', fontStyle: 'italic' }}>On the clock...</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
