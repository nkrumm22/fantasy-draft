import React, { useState, useMemo } from 'react';

const POS_COLORS = { QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181', DST: '#b794f4', K: '#4fd1c5' };

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modal: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '12px', width: '100%', maxWidth: '860px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #2d3748', flexShrink: 0 },
  title: { fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0' },
  subtitle: { fontSize: '0.8rem', color: '#718096', marginTop: '0.15rem' },
  close: { background: 'transparent', border: 'none', color: '#718096', fontSize: '1.1rem', cursor: 'pointer' },
  body: { flex: 1, overflowY: 'auto', padding: '1.25rem' },
  cols: { display: 'flex', gap: '0.75rem' },
  col: { flex: 1, minWidth: 0 },
  colLabel: { fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  teamSelect: { width: '100%', padding: '0.45rem 0.65rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', marginBottom: '0.75rem' },
  arrow: { display: 'flex', alignItems: 'flex-start', paddingTop: '3.5rem', color: '#4a5568', fontSize: '1.25rem', flexShrink: 0 },
  card: { padding: '0.5rem 0.65rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '8px', marginBottom: '0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' },
  cardSending: { border: '1px solid #fc8181', background: '#2d1515' },
  cardReceiving: { border: '1px solid #68d391', background: '#0d2b1a' },
  pos: { fontSize: '0.7rem', fontWeight: '700', minWidth: '26px' },
  pName: { flex: 1, fontSize: '0.83rem', color: '#e2e8f0', fontWeight: '500' },
  badge: { fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '4px', whiteSpace: 'nowrap' },
  divider: { borderTop: '1px solid #2d3748', margin: '1rem 0' },
  sectionTitle: { fontSize: '0.75rem', color: '#a0aec0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  summaryRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  summaryCol: { flex: 1, minWidth: '140px' },
  summaryLabel: { fontSize: '0.75rem', color: '#718096', marginBottom: '0.4rem' },
  chip: { display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', margin: '0.15rem' },
  projCols: { display: 'flex', gap: '0.75rem' },
  projCol: { flex: 1 },
  projHeader: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', marginBottom: '0.5rem' },
  projPlayer: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', background: '#141824', borderRadius: '6px', marginBottom: '0.3rem', fontSize: '0.8rem', color: '#e2e8f0' },
  newBadge: { fontSize: '0.6rem', fontWeight: '800', color: '#68d391', background: '#1a3a1a', padding: '0.1rem 0.3rem', borderRadius: '3px' },
  empty: { color: '#4a5568', fontStyle: 'italic', fontSize: '0.83rem', padding: '0.5rem 0' },
  hint: { color: '#4a5568', fontSize: '0.83rem', textAlign: 'center', padding: '1rem 0' },
};

export default function TradeSimulator({ draft, getRosterForTeam, onClose }) {
  const numTeams = draft.teams.length;
  const [teamA, setTeamA] = useState(0);
  const [teamB, setTeamB] = useState(Math.min(1, numTeams - 1));
  const [selectedA, setSelectedA] = useState(new Set());
  const [selectedB, setSelectedB] = useState(new Set());

  const rosterA = useMemo(() => getRosterForTeam(teamA), [teamA, draft.picks]);
  const rosterB = useMemo(() => getRosterForTeam(teamB), [teamB, draft.picks]);

  const projA = useMemo(() => [
    ...rosterA.filter(p => !selectedA.has(p.id)),
    ...rosterB.filter(p => selectedB.has(p.id)).map(p => ({ ...p, isNew: true })),
  ], [rosterA, rosterB, selectedA, selectedB]);

  const projB = useMemo(() => [
    ...rosterB.filter(p => !selectedB.has(p.id)),
    ...rosterA.filter(p => selectedA.has(p.id)).map(p => ({ ...p, isNew: true })),
  ], [rosterA, rosterB, selectedA, selectedB]);

  const toggle = (id, side) => {
    const set = side === 'A' ? setSelectedA : setSelectedB;
    set(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const changeTeamA = (i) => { setTeamA(i); setSelectedA(new Set()); };
  const changeTeamB = (i) => { setTeamB(i); setSelectedB(new Set()); };

  const hasBoth = selectedA.size > 0 && selectedB.size > 0;
  const hasAny = selectedA.size > 0 || selectedB.size > 0;

  const RosterColumn = ({ roster, selected, onToggle, isGiving }) => (
    <div style={s.col}>
      {roster.length === 0
        ? <p style={s.empty}>No picks yet</p>
        : roster.map(p => {
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              style={{ ...s.card, ...(isSelected ? (isGiving ? s.cardSending : s.cardReceiving) : {}) }}
              onClick={() => onToggle(p.id)}
            >
              <span style={{ ...s.pos, color: POS_COLORS[p.position] }}>{p.position}</span>
              <span style={s.pName}>{p.name}</span>
              <span style={{ fontSize: '0.72rem', color: '#4a5568' }}>#{p.pickNumber}</span>
              {isSelected && (
                <span style={{ ...s.badge, background: isGiving ? '#742a2a' : '#276749', color: isGiving ? '#fc8181' : '#68d391' }}>
                  {isGiving ? 'OUT' : 'IN'}
                </span>
              )}
            </div>
          );
        })
      }
    </div>
  );

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <div style={s.title}>Trade Simulator</div>
            <div style={s.subtitle}>Click players to add them to the trade. No picks are modified.</div>
          </div>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={s.body}>
          <div style={s.cols}>
            <div style={s.col}>
              <div style={s.colLabel}>{draft.teams[teamA]} — giving</div>
              <select style={s.teamSelect} value={teamA} onChange={e => changeTeamA(parseInt(e.target.value))}>
                {draft.teams.map((name, i) => i !== teamB && <option key={i} value={i}>{name}</option>)}
              </select>
              <RosterColumn roster={rosterA} selected={selectedA} onToggle={id => toggle(id, 'A')} isGiving={true} />
            </div>
            <div style={s.arrow}>⇄</div>
            <div style={s.col}>
              <div style={s.colLabel}>{draft.teams[teamB]} — giving</div>
              <select style={s.teamSelect} value={teamB} onChange={e => changeTeamB(parseInt(e.target.value))}>
                {draft.teams.map((name, i) => i !== teamA && <option key={i} value={i}>{name}</option>)}
              </select>
              <RosterColumn roster={rosterB} selected={selectedB} onToggle={id => toggle(id, 'B')} isGiving={false} />
            </div>
          </div>

          {!hasAny && <div style={s.hint}>Click players above to build a trade proposal</div>}

          {hasAny && (
            <>
              <div style={s.divider} />
              <div style={s.sectionTitle}>Trade Summary</div>
              <div style={s.summaryRow}>
                <div style={s.summaryCol}>
                  <div style={s.summaryLabel}>{draft.teams[teamA]} sends:</div>
                  {selectedA.size === 0
                    ? <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>Nothing</span>
                    : [...selectedA].map(id => {
                      const p = rosterA.find(x => x.id === id);
                      return p ? <span key={id} style={{ ...s.chip, background: '#2d1515', color: '#fc8181' }}>{p.position} {p.name}</span> : null;
                    })
                  }
                </div>
                <div style={s.summaryCol}>
                  <div style={s.summaryLabel}>{draft.teams[teamB]} sends:</div>
                  {selectedB.size === 0
                    ? <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>Nothing</span>
                    : [...selectedB].map(id => {
                      const p = rosterB.find(x => x.id === id);
                      return p ? <span key={id} style={{ ...s.chip, background: '#1a3a1a', color: '#68d391' }}>{p.position} {p.name}</span> : null;
                    })
                  }
                </div>
              </div>
            </>
          )}

          {hasBoth && (
            <>
              <div style={s.divider} />
              <div style={s.sectionTitle}>Projected Rosters After Trade</div>
              <div style={s.projCols}>
                {[
                  { name: draft.teams[teamA], roster: projA },
                  { name: draft.teams[teamB], roster: projB },
                ].map(({ name, roster }) => (
                  <div key={name} style={s.projCol}>
                    <div style={s.projHeader}>{name}</div>
                    {roster.map((p, i) => (
                      <div key={`${p.id}-${i}`} style={s.projPlayer}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: POS_COLORS[p.position], minWidth: '26px' }}>{p.position}</span>
                        <span style={{ flex: 1 }}>{p.name}</span>
                        {p.isNew && <span style={s.newBadge}>NEW</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
