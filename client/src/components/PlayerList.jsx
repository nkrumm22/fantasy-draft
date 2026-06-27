import React, { useState, useMemo } from 'react';

const POS_ORDER = ['QB','RB','WR','TE','DST','K','PG','SG','SF','PF','C','P','1B','2B','3B','SS','OF','UTIL','LW','RW','D','G','GKP','DEF','MID','FWD'];

const POS_COLORS = {
  QB: '#f6ad55', RB: '#68d391', WR: '#63b3ed', TE: '#fc8181', DST: '#b794f4', K: '#4fd1c5',
  PG: '#63b3ed', SG: '#76e4f7', SF: '#68d391', PF: '#f6ad55', C: '#fc8181',
  P: '#9f7aea', '1B': '#68d391', '2B': '#63b3ed', '3B': '#f6ad55', SS: '#fc8181', OF: '#76e4f7', UTIL: '#4fd1c5',
  LW: '#68d391', RW: '#63b3ed', D: '#f6ad55', G: '#fc8181',
  GKP: '#9f7aea', DEF: '#68d391', MID: '#63b3ed', FWD: '#fc8181',
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
  rowSelected: { background: '#0d2137', borderLeft: '3px solid #63b3ed' },
  badge: { fontSize: '0.65rem', fontWeight: '700', color: '#f6ad55', background: '#744210', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  reachBadge: { fontSize: '0.6rem', fontWeight: '800', color: '#fc8181', background: '#2d1515', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  valueBadge: { fontSize: '0.6rem', fontWeight: '800', color: '#68d391', background: '#1a3a1a', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  byeChip: { fontSize: '0.65rem', color: '#718096', background: '#1a2035', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  injuryDot: { fontSize: '0.65rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  adp: { width: '28px', textAlign: 'right', fontSize: '0.75rem', color: '#4a5568', flexShrink: 0 },
  pos: { width: '32px', textAlign: 'center', fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.3rem', borderRadius: '4px', background: '#1a2035', flexShrink: 0 },
  name: { flex: 1, fontSize: '0.88rem', fontWeight: '500' },
  team: { fontSize: '0.75rem', color: '#718096' },
  pickBtn: { padding: '0.3rem 0.65rem', background: '#276749', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  empty: { padding: '2rem', textAlign: 'center', color: '#4a5568', fontSize: '0.9rem' },
};

export default function PlayerList({ players, onPick, isDone, recommendedId, onPlayerClick, selectedId, currentPickNum }) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');

  // Derive position filter buttons from the actual player data
  const positions = useMemo(() => {
    const present = new Set(players.map(p => p.position));
    return ['ALL', ...POS_ORDER.filter(p => present.has(p))];
  }, [players]);

  // Reset filter if current filter position isn't in this sport
  const activeFilter = positions.includes(posFilter) ? posFilter : 'ALL';

  const filtered = useMemo(() => {
    let list = players;
    if (activeFilter !== 'ALL') list = list.filter(p => p.position === activeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.team || '').toLowerCase().includes(q));
    }
    return list;
  }, [players, activeFilter, search]);

  const hasAdp = players.some(p => p.adp != null);

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
          {positions.map(pos => (
            <button
              key={pos}
              style={{ ...s.filter, ...(activeFilter === pos ? s.filterActive : {}), ...(pos !== 'ALL' ? { color: POS_COLORS[pos] } : {}) }}
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
            const isSelected = p.id === selectedId;
            const adpDiff = hasAdp && currentPickNum && p.adp ? p.adp - currentPickNum : 0;
            const isReach = hasAdp && currentPickNum && adpDiff > 20;
            const isValue = hasAdp && currentPickNum && adpDiff < -20;
            const injury = p.injuryStatus;
            const injuryStyle = injury === 'Questionable'
              ? { color: '#f6ad55', background: '#2d2007' }
              : injury ? { color: '#fc8181', background: '#2d1515' } : null;
            const injuryLabel = injury === 'Questionable' ? 'Q'
              : injury === 'Doubtful' ? 'D'
              : injury === 'Out' ? 'OUT'
              : injury === 'IR' ? 'IR'
              : injury === 'PUP' ? 'PUP'
              : injury === 'Sus' ? 'SUS'
              : injury ? injury.slice(0, 3).toUpperCase() : null;
            return (
              <div key={p.id}
                style={{ ...s.row, ...(isRec ? s.rowRecommended : {}), ...(isSelected ? s.rowSelected : {}) }}
                onClick={() => onPlayerClick?.(p)}
                onMouseEnter={e => e.currentTarget.style.background = isSelected ? '#102840' : isRec ? '#3d2a08' : '#1a2035'}
                onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#0d2137' : isRec ? '#2d2007' : 'transparent'}
              >
                {hasAdp && <span style={s.adp}>{p.adp}</span>}
                <span style={{ ...s.pos, color: POS_COLORS[p.position] || '#718096' }}>{p.position}</span>
                <span style={s.name}>{p.name}</span>
                {injuryLabel && <span style={{ ...s.injuryDot, ...injuryStyle }}>{injuryLabel}</span>}
                {isRec && <span style={s.badge}>BEST</span>}
                {isReach && !isRec && <span style={s.reachBadge}>REACH +{adpDiff}</span>}
                {isValue && <span style={s.valueBadge}>VALUE {adpDiff}</span>}
                <span style={s.team}>{p.team}</span>
                {p.byeWeek && <span style={s.byeChip}>BYE {p.byeWeek}</span>}
                {!isDone && onPick && (
                  <button style={s.pickBtn} onClick={e => { e.stopPropagation(); onPick(p); }}>Pick</button>
                )}
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
