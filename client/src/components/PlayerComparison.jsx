import React, { useState, useEffect, useRef, useCallback } from 'react';

const POS_COLORS = {
  QB: ['#2c4a6e','#63b3ed'], RB: ['#1a3a1a','#68d391'], WR: ['#44337a','#b794f4'], TE: ['#744210','#f6ad55'], K: ['#1a2d48','#90cdf4'], DST: ['#2d1515','#fc8181'],
  PG: ['#1a2d48','#63b3ed'], SG: ['#1a3030','#76e4f7'], SF: ['#1a3a1a','#68d391'], PF: ['#744210','#f6ad55'], C: ['#2d1515','#fc8181'],
  P: ['#2c4a6e','#9f7aea'], '1B': ['#1a3a1a','#68d391'], '2B': ['#1a2d48','#63b3ed'], '3B': ['#744210','#f6ad55'], SS: ['#2d1515','#fc8181'], OF: ['#1a3030','#76e4f7'], UTIL: ['#1a2d48','#90cdf4'],
  LW: ['#1a3a1a','#68d391'], RW: ['#1a2d48','#63b3ed'], D: ['#744210','#f6ad55'], G: ['#2d1515','#fc8181'],
  GKP: ['#2c4a6e','#9f7aea'], DEF: ['#1a3a1a','#68d391'], MID: ['#1a2d48','#63b3ed'], FWD: ['#2d1515','#fc8181'],
};
const INJ_COLORS = { Out: '#fc8181', Questionable: '#f6ad55', Doubtful: '#fc8181', IR: '#fc8181' };

const s = {
  wrapper: { padding: '1.25rem 0' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' },
  slot: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.1rem 1.25rem' },
  slotTitle: { fontSize: '0.7rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  searchWrap: { position: 'relative' },
  input: { width: '100%', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'inherit' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', zIndex: 50, marginTop: '2px', maxHeight: '220px', overflowY: 'auto' },
  dropItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #2d3748' },
  dropItemHover: { background: '#0f1420' },
  posBadge: { fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  playerCard: { marginTop: '0.75rem' },
  playerName: { fontSize: '1rem', fontWeight: '800', color: '#e2e8f0', marginBottom: '0.15rem' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #1a2035', fontSize: '0.82rem' },
  statLabel: { color: '#718096' },
  statVal: { color: '#e2e8f0', fontWeight: '600' },
  statBetter: { color: '#68d391', fontWeight: '700' },
  statWorse: { color: '#fc8181', fontWeight: '600' },
  clearBtn: { padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#718096', fontSize: '0.72rem', cursor: 'pointer', marginTop: '0.5rem' },
  empty: { color: '#4a5568', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' },
  vsBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' },
  vsBadge: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', padding: '0.2rem 0.6rem', background: '#1a2035', borderRadius: '20px', border: '1px solid #2d3748' },
};

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function PlayerSlot({ label, token, leagueId, sport, selected, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const wrapRef = useRef(null);
  const debouncedQ = useDebounce(query, 280);

  useEffect(() => {
    if (debouncedQ.length < 2) { setResults([]); setOpen(false); return; }
    fetch(`/api/players/search?q=${encodeURIComponent(debouncedQ)}&sport=${sport || 'nfl'}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setResults(Array.isArray(d) ? d : []); setOpen(true); })
      .catch(() => {});
  }, [debouncedQ, token]);

  useEffect(() => {
    if (!selected) { setOwner(null); return; }
    fetch(`/api/leagues/${leagueId}/player-owner/${selected.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setOwner(d))
      .catch(() => setOwner(null));
  }, [selected, leagueId, token]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (p) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const [bg, fg] = POS_COLORS[selected?.position] || ['#1a2035', '#718096'];

  return (
    <div style={s.slot}>
      <div style={s.slotTitle}>{label}</div>
      {!selected ? (
        <div style={s.searchWrap} ref={wrapRef}>
          <input
            style={s.input}
            placeholder="Search player name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {open && results.length > 0 && (
            <div style={s.dropdown}>
              {results.map((p, i) => {
                const [pbg, pfg] = POS_COLORS[p.position] || ['#1a2035', '#718096'];
                return (
                  <div
                    key={p.id}
                    style={{ ...s.dropItem, ...(i === hoveredIdx ? s.dropItemHover : {}), ...(i === results.length - 1 ? { borderBottom: 'none' } : {}) }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(-1)}
                    onMouseDown={() => pick(p)}
                  >
                    <span style={{ ...s.posBadge, background: pbg, color: pfg }}>{p.position}</span>
                    <span style={{ fontSize: '0.875rem', color: '#e2e8f0', fontWeight: '600' }}>{p.name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#718096', marginLeft: 'auto' }}>{p.team}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={s.playerCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ ...s.posBadge, background: bg, color: fg, fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>{selected.position}</span>
            <span style={s.playerName}>{selected.name}</span>
          </div>
          <div style={s.statRow}>
            <span style={s.statLabel}>NFL Team</span>
            <span style={s.statVal}>{selected.team || '—'}</span>
          </div>
          <div style={s.statRow}>
            <span style={s.statLabel}>ADP</span>
            <span style={s.statVal}>{selected.adp != null ? selected.adp.toFixed(1) : '—'}</span>
          </div>
          {selected.injury_status && (
            <div style={s.statRow}>
              <span style={s.statLabel}>Status</span>
              <span style={{ ...s.statVal, color: INJ_COLORS[selected.injury_status] || '#fc8181' }}>{selected.injury_status}</span>
            </div>
          )}
          <div style={s.statRow}>
            <span style={s.statLabel}>Owner</span>
            <span style={s.statVal}>{owner === null ? '...' : owner?.team_name || 'Free Agent'}</span>
          </div>
          <button style={s.clearBtn} onClick={() => { onClear(); setQuery(''); }}>✕ Clear</button>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, val1, val2, lowerIsBetter }) {
  const n1 = parseFloat(val1);
  const n2 = parseFloat(val2);
  const both = !isNaN(n1) && !isNaN(n2);
  const p1Better = both && (lowerIsBetter ? n1 < n2 : n1 > n2);
  const p2Better = both && (lowerIsBetter ? n2 < n1 : n2 > n1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #1a2035', alignItems: 'center' }}>
      <span style={{ fontSize: '0.875rem', color: p1Better ? '#68d391' : p2Better ? '#fc8181' : '#e2e8f0', fontWeight: p1Better ? '700' : '400', textAlign: 'right' }}>{val1 ?? '—'}</span>
      <span style={{ fontSize: '0.72rem', color: '#4a5568', fontWeight: '700', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '5rem' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: p2Better ? '#68d391' : p1Better ? '#fc8181' : '#e2e8f0', fontWeight: p2Better ? '700' : '400' }}>{val2 ?? '—'}</span>
    </div>
  );
}

export default function PlayerComparison({ leagueId, token, sport }) {
  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);

  const bothSelected = p1 && p2;

  return (
    <div style={s.wrapper}>
      <div style={s.grid}>
        <PlayerSlot label="Player 1" token={token} leagueId={leagueId} sport={sport} selected={p1} onSelect={setP1} onClear={() => setP1(null)} />
        <PlayerSlot label="Player 2" token={token} leagueId={leagueId} sport={sport} selected={p2} onSelect={setP2} onClear={() => setP2(null)} />
      </div>

      {!bothSelected && (
        <div style={s.empty}>Select two players above to compare them side by side.</div>
      )}

      {bothSelected && (
        <div style={{ background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
          <div style={s.vsBar}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0' }}>{p1.name}</span>
            <span style={s.vsBadge}>vs</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0' }}>{p2.name}</span>
          </div>
          <CompareRow label="Position" val1={p1.position} val2={p2.position} />
          <CompareRow label="NFL Team" val1={p1.team} val2={p2.team} />
          <CompareRow label="ADP" val1={p1.adp != null ? p1.adp.toFixed(1) : null} val2={p2.adp != null ? p2.adp.toFixed(1) : null} lowerIsBetter={true} />
          {(p1.injury_status || p2.injury_status) && (
            <CompareRow label="Injury" val1={p1.injury_status || 'Healthy'} val2={p2.injury_status || 'Healthy'} />
          )}
          <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#4a5568', textAlign: 'center' }}>
            Green = better value &nbsp;·&nbsp; ADP: lower number = picked earlier on average
          </div>
        </div>
      )}
    </div>
  );
}
