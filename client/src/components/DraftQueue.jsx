import React, { useState, useEffect, useMemo } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  panels: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  panel: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', flex: 1, minWidth: '280px' },
  panelTitle: { fontSize: '0.72rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0', borderBottom: '1px solid #1a2035' },
  rankNum: { fontSize: '0.72rem', color: '#4a5568', fontWeight: '700', width: '1.4rem', textAlign: 'right', flexShrink: 0 },
  posBadge: { fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 },
  playerName: { fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  playerMeta: { fontSize: '0.72rem', color: '#718096' },
  arrowBtn: { background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.1rem', lineHeight: 1 },
  removeBtn: { background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', lineHeight: 1, flexShrink: 0 },
  removeBtn_hover: { color: '#fc8181' },
  addBtn: { padding: '0.2rem 0.55rem', background: '#1a3a1a', border: '1px solid #276749', borderRadius: '6px', color: '#68d391', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  saveBtn: { marginTop: '1rem', padding: '0.55rem 1.25rem', background: '#2c4a6e', border: 'none', borderRadius: '8px', color: '#63b3ed', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  saveStatus: { fontSize: '0.8rem', color: '#68d391', marginTop: '0.5rem', fontWeight: '600' },
  filterRow: { display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  filterBtn: { padding: '0.2rem 0.55rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.72rem', cursor: 'pointer' },
  filterBtnActive: { background: '#1a3a1a', border: '1px solid #276749', color: '#68d391' },
  searchInput: { width: '100%', padding: '0.45rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' },
  empty: { color: '#4a5568', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' },
  emptyHint: { fontSize: '0.75rem', color: '#2d3748', marginTop: '0.35rem' },
  loading: { color: '#4a5568', padding: '2rem' },
  scrollList: { maxHeight: '420px', overflowY: 'auto' },
};

const POS_COLORS = {
  QB:  ['#2c4a6e', '#63b3ed'],
  RB:  ['#1a3a1a', '#68d391'],
  WR:  ['#44337a', '#b794f4'],
  TE:  ['#744210', '#f6ad55'],
  K:   ['#1a2d48', '#90cdf4'],
  DST: ['#2d1515', '#fc8181'],
};

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'];

function PosBadge({ position }) {
  const [bg, fg] = POS_COLORS[position] || ['#1a2035', '#718096'];
  return (
    <span style={{ ...s.posBadge, background: bg, color: fg }}>{position}</span>
  );
}

export default function DraftQueue({ leagueId, token }) {
  const [queue, setQueue] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [hoveredRemove, setHoveredRemove] = useState(null);

  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leagues/${leagueId}/queue`, { headers: auth }).then(r => r.json()),
      fetch('/api/players', { headers: auth }).then(r => r.json()),
    ])
      .then(([qData, pData]) => {
        setQueue(Array.isArray(qData) ? qData : []);
        setAllPlayers(Array.isArray(pData) ? pData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [leagueId]);

  const queueIds = useMemo(() => new Set(queue.map(p => p.id)), [queue]);

  const availablePlayers = useMemo(() => {
    return allPlayers.filter(p => {
      if (queueIds.has(p.id)) return false;
      if (posFilter !== 'ALL' && p.position !== posFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.team && p.team.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allPlayers, queueIds, posFilter, search]);

  const moveUp = (index) => {
    if (index === 0) return;
    setQueue(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index) => {
    if (index === queue.length - 1) return;
    setQueue(prev => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const removeFromQueue = (playerId) => {
    setQueue(prev => prev.filter(p => p.id !== playerId));
  };

  const addToQueue = (player) => {
    setQueue(prev => [...prev, player]);
  };

  const saveQueue = async () => {
    setSaving(true);
    setSaveStatus('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/queue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ playerIds: queue.map(p => p.id) }),
      });
      if (r.ok) {
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        const d = await r.json().catch(() => ({}));
        setSaveStatus(d.error || 'Save failed');
      }
    } catch {
      setSaveStatus('Connection error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading draft queue...</div>;

  return (
    <div style={s.wrapper}>
      <div style={s.panels}>
        {/* LEFT: My Queue */}
        <div style={s.panel}>
          <div style={s.panelTitle}>My Queue</div>
          <div style={s.scrollList}>
            {queue.length === 0 ? (
              <div style={s.empty}>
                Your queue is empty
                <div style={s.emptyHint}>Add players from the right panel</div>
              </div>
            ) : (
              queue.map((player, index) => (
                <div key={player.id} style={s.playerRow}>
                  <span style={s.rankNum}>{index + 1}</span>
                  <PosBadge position={player.position} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.playerName}>{player.name}</div>
                    <div style={s.playerMeta}>{player.team}{player.adp != null ? ` · ADP ${Number(player.adp).toFixed(0)}` : ''}</div>
                  </div>
                  <button
                    style={s.arrowBtn}
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                    aria-label="Move up"
                  >↑</button>
                  <button
                    style={s.arrowBtn}
                    onClick={() => moveDown(index)}
                    disabled={index === queue.length - 1}
                    title="Move down"
                    aria-label="Move down"
                  >↓</button>
                  <button
                    style={{
                      ...s.removeBtn,
                      ...(hoveredRemove === player.id ? { color: '#fc8181' } : {}),
                    }}
                    onClick={() => removeFromQueue(player.id)}
                    onMouseEnter={() => setHoveredRemove(player.id)}
                    onMouseLeave={() => setHoveredRemove(null)}
                    title="Remove"
                    aria-label="Remove from queue"
                  >✕</button>
                </div>
              ))
            )}
          </div>
          <button
            style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}
            onClick={saveQueue}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Queue'}
          </button>
          {saveStatus && (
            <div style={{
              ...s.saveStatus,
              color: saveStatus === 'Saved!' ? '#68d391' : '#fc8181',
            }}>
              {saveStatus}
            </div>
          )}
        </div>

        {/* RIGHT: Add Players */}
        <div style={s.panel}>
          <div style={s.panelTitle}>Add Players</div>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Search by name or team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={s.filterRow}>
            {POSITIONS.map(pos => (
              <button
                key={pos}
                style={{ ...s.filterBtn, ...(posFilter === pos ? s.filterBtnActive : {}) }}
                onClick={() => setPosFilter(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
          <div style={s.scrollList}>
            {availablePlayers.length === 0 ? (
              <div style={s.empty}>No players found</div>
            ) : (
              availablePlayers.map(player => (
                <div key={player.id} style={s.playerRow}>
                  <PosBadge position={player.position} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.playerName}>{player.name}</div>
                    <div style={s.playerMeta}>{player.team}{player.adp != null ? ` · ADP ${Number(player.adp).toFixed(0)}` : ''}</div>
                  </div>
                  <button style={s.addBtn} onClick={() => addToQueue(player)}>+ Add</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
