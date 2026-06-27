import React, { useState, useEffect } from 'react';

const POS_COLORS = {
  QB: ['#2c4a6e','#63b3ed'], RB: ['#1a3a1a','#68d391'], WR: ['#44337a','#b794f4'], TE: ['#744210','#f6ad55'], K: ['#1a2d48','#90cdf4'], DST: ['#2d1515','#fc8181'],
  PG: ['#1a2d48','#63b3ed'], SG: ['#1a3030','#76e4f7'], SF: ['#1a3a1a','#68d391'], PF: ['#744210','#f6ad55'], C: ['#2d1515','#fc8181'],
  P: ['#2c4a6e','#9f7aea'], '1B': ['#1a3a1a','#68d391'], '2B': ['#1a2d48','#63b3ed'], '3B': ['#744210','#f6ad55'], SS: ['#2d1515','#fc8181'], OF: ['#1a3030','#76e4f7'], UTIL: ['#1a2d48','#90cdf4'],
  LW: ['#1a3a1a','#68d391'], RW: ['#1a2d48','#63b3ed'], D: ['#744210','#f6ad55'], G: ['#2d1515','#fc8181'],
  GKP: ['#2c4a6e','#9f7aea'], DEF: ['#1a3a1a','#68d391'], MID: ['#1a2d48','#63b3ed'], FWD: ['#2d1515','#fc8181'],
};

const s = {
  wrapper: { padding: '1.25rem 0' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
  title: { fontSize: '0.7rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' },
  addBtn: { padding: '0.4rem 0.9rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568', fontSize: '0.875rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '0.9rem 1rem' },
  cardMine: { borderColor: '#276749' },
  teamLabel: { fontSize: '0.65rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' },
  teamLabelMine: { color: '#68d391' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' },
  posBadge: { fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  playerName: { fontSize: '0.9rem', fontWeight: '700', color: '#e2e8f0', flex: 1 },
  nflTeam: { fontSize: '0.72rem', color: '#718096' },
  note: { fontSize: '0.78rem', color: '#a0aec0', marginTop: '0.35rem', fontStyle: 'italic' },
  removeBtn: { marginTop: '0.6rem', padding: '0.2rem 0.55rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#718096', fontSize: '0.7rem', cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox: { background: '#141824', border: '1px solid #2d3748', borderRadius: '14px', padding: '1.5rem', width: '360px', maxWidth: '90vw' },
  modalTitle: { fontSize: '0.9rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '1rem' },
  input: { width: '100%', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '0.6rem' },
  dropdown: { background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', marginBottom: '0.75rem', maxHeight: '180px', overflowY: 'auto' },
  dropItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #2d3748', fontSize: '0.85rem' },
  modalBtns: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  cancelBtn: { padding: '0.4rem 0.85rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.82rem', cursor: 'pointer' },
  saveBtn: { padding: '0.4rem 0.85rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' },
  error: { color: '#fc8181', fontSize: '0.78rem', marginBottom: '0.5rem' },
};

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export default function TradeBlock({ leagueId, token, sport }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalErr, setModalErr] = useState('');
  const debouncedQ = useDebounce(query, 280);

  const load = () => {
    fetch(`/api/leagues/${leagueId}/trade-block`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId, token]);

  useEffect(() => {
    if (debouncedQ.length < 2) { setResults([]); return; }
    fetch(`/api/players/search?q=${encodeURIComponent(debouncedQ)}&sport=${sport || 'nfl'}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setResults(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [debouncedQ, token]);

  const save = async () => {
    if (!selected) { setModalErr('Pick a player first'); return; }
    setSaving(true); setModalErr('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/trade-block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selected.id, note }),
      });
      const d = await r.json();
      if (!r.ok) { setModalErr(d.error || 'Failed'); return; }
      setShowModal(false); setSelected(null); setQuery(''); setNote(''); setResults([]);
      load();
    } catch { setModalErr('Connection error'); }
    finally { setSaving(false); }
  };

  const remove = async (blockId) => {
    await fetch(`/api/leagues/${leagueId}/trade-block/${blockId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading trade block...</div>;

  const items = data?.items || [];
  const myTeamId = data?.myTeamId;

  // Group items by team
  const byTeam = {};
  for (const item of items) {
    if (!byTeam[item.team_id]) byTeam[item.team_id] = { teamId: item.team_id, teamName: item.team_name, players: [] };
    byTeam[item.team_id].players.push(item);
  }
  const teamGroups = Object.values(byTeam);

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div style={s.title}>Trade Block</div>
        <button style={s.addBtn} onClick={() => { setShowModal(true); setModalErr(''); }}>
          + List a Player
        </button>
      </div>

      {teamGroups.length === 0 && (
        <div style={s.empty}>No players listed yet. Be the first to put someone on the block!</div>
      )}

      <div style={s.grid}>
        {teamGroups.map(group => {
          const isMe = group.teamId === myTeamId;
          return (
            <div key={group.teamId} style={{ ...s.card, ...(isMe ? s.cardMine : {}) }}>
              <div style={{ ...s.teamLabel, ...(isMe ? s.teamLabelMine : {}) }}>
                {group.teamName}{isMe ? ' (you)' : ''}
              </div>
              {group.players.map(item => {
                const p = item.player;
                const [bg, fg] = POS_COLORS[p?.position] || ['#1a2035', '#718096'];
                return (
                  <div key={item.id}>
                    <div style={s.playerRow}>
                      {p && <span style={{ ...s.posBadge, background: bg, color: fg }}>{p.position}</span>}
                      <span style={s.playerName}>{p?.name || `Player #${item.player_id}`}</span>
                      <span style={s.nflTeam}>{p?.team || ''}</span>
                    </div>
                    {item.note && <div style={s.note}>"{item.note}"</div>}
                    {isMe && (
                      <button style={s.removeBtn} onClick={() => remove(item.id)}>Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>List a Player on the Trade Block</div>
            {modalErr && <div style={s.error}>{modalErr}</div>}
            {!selected ? (
              <>
                <input
                  style={s.input}
                  placeholder="Search player..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {results.length > 0 && (
                  <div style={s.dropdown}>
                    {results.slice(0, 8).map((p, i) => {
                      const [bg, fg] = POS_COLORS[p.position] || ['#1a2035', '#718096'];
                      return (
                        <div
                          key={p.id}
                          style={{ ...s.dropItem, ...(i === results.slice(0,8).length - 1 ? { borderBottom: 'none' } : {}) }}
                          onMouseDown={() => { setSelected(p); setQuery(''); setResults([]); }}
                        >
                          <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px', background: bg, color: fg }}>{p.position}</span>
                          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{p.name}</span>
                          <span style={{ color: '#718096', marginLeft: 'auto', fontSize: '0.72rem' }}>{p.team}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: '#0f1420', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {(() => { const [bg, fg] = POS_COLORS[selected.position] || ['#1a2035', '#718096']; return <span style={{ fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px', background: bg, color: fg }}>{selected.position}</span>; })()}
                <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{selected.name}</span>
                <span style={{ color: '#718096', fontSize: '0.78rem' }}>{selected.team}</span>
                <button style={{ marginLeft: 'auto', padding: '0.15rem 0.45rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '4px', color: '#718096', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => setSelected(null)}>✕</button>
              </div>
            )}
            <input
              style={s.input}
              placeholder='Note (optional) — e.g. "looking for a WR"'
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => { setShowModal(false); setSelected(null); setQuery(''); setNote(''); setResults([]); }}>Cancel</button>
              <button style={s.saveBtn} onClick={save} disabled={saving || !selected}>{saving ? 'Saving...' : 'Add to Block'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
