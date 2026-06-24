import React, { useState, useMemo } from 'react';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DST', 'K'];

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181',
  DST: '#b794f4', K: '#4fd1c5',
};

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  controls: { padding: '0.6rem', borderBottom: '1px solid #2d3748', flexShrink: 0 },
  search: { width: '100%', padding: '0.5rem 0.7rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.85rem', marginBottom: '0.5rem' },
  filters: { display: 'flex', gap: '0.3rem', flexWrap: 'wrap' },
  filter: { padding: '0.25rem 0.55rem', border: '1px solid #2d3748', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', background: 'transparent', color: '#718096' },
  filterActive: { background: '#276749', color: '#fff', borderColor: '#276749' },
  list: { flex: 1, overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', padding: '0.55rem 0.75rem', borderBottom: '1px solid #1a2035', cursor: 'pointer', gap: '0.6rem' },
  rowRecommended: { background: '#2d2007', borderLeft: '3px solid #f6ad55' },
  badge: { fontSize: '0.65rem', fontWeight: '700', color: '#f6ad55', background: '#744210', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  adp: { width: '28px', textAlign: 'right', fontSize: '0.75rem', color: '#4a5568', flexShrink: 0 },
  pos: { width: '32px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.3rem', borderRadius: '4px', background: '#1a2035', flexShrink: 0 },
  name: { flex: 1, fontSize: '0.88rem', fontWeight: '500' },
  team: { fontSize: '0.75rem', color: '#718096' },
  pickBtn: { padding: '0.3rem 0.65rem', background: '#276749', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  empty: { padding: '2rem', textAlign: 'center', color: '#4a5568', fontSize: '0.9rem' },
};

export default function PlayerList({ players, onPick, isDone, recommendedId, onPlayerClick }) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');

  const filtered = useMemo(() => {
    let list = players;
    if (posFilter !== 'ALL') list = list.filter(p => p.position === posFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    return list;
  }, [players, posFilter, search]);

  return (
    <div style={s.wrapper}>
      <div style={s.controls}>
        <input
          style={s.search}
          placeholder="Search players or team..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={s.filters}>
          {POSITIONS.map(pos => (
            <button
              key={pos}
              style={{ ...s.filter, ...(posFilter === pos ? s.filterActive : {}), ...(pos !== 'ALL' ? { color: POS_COLORS[pos] } : {}) }}
              onClick={() => setPosFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>
      <div style={s.list}>
        {filtered.length === 0
          ? <div style={s.empty}>No players found</div>
          : filtered.map(p => {
            const isRec = p.id === recommendedId;
            return (
              <div key={p.id} style={{ ...s.row, ...(isRec ? s.rowRecommended : {}) }}
                onClick={() => onPlayerClick?.(p)}
                onMouseEnter={e => e.currentTarget.style.background = isRec ? '#3d2a08' : '#1a2035'}
                onMouseLeave={e => e.currentTarget.style.background = isRec ? '#2d2007' : 'transparent'}
              >
                <span style={s.adp}>{p.adp}</span>
                <span style={{ ...s.pos, color: POS_COLORS[p.position] }}>{p.position}</span>
                <span style={s.name}>{p.name}</span>
                {isRec && <span style={s.badge}>BEST</span>}
                <span style={s.team}>{p.team}</span>
                {!isDone && (
                  <button style={s.pickBtn} onClick={() => onPick(p)}>Pick</button>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
