import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  tabs: { display: 'flex', gap: 0, borderBottom: '1px solid #2d3748', marginBottom: '1rem' },
  tab: { padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: '#718096', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabActive: { color: '#68d391', borderBottom: '2px solid #68d391' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' },
  tradeHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' },
  teamName: { fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0' },
  statusChip: { fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px' },
  tradeBody: { display: 'flex', gap: '1rem', marginBottom: '0.75rem' },
  tradeCol: { flex: 1 },
  tradeColLabel: { fontSize: '0.7rem', color: '#718096', marginBottom: '0.35rem', fontWeight: '600' },
  playerPill: { display: 'inline-block', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '20px', padding: '0.15rem 0.55rem', fontSize: '0.78rem', color: '#e2e8f0', marginRight: '0.3rem', marginBottom: '0.3rem' },
  btnRow: { display: 'flex', gap: '0.5rem' },
  btnAccept: { padding: '0.3rem 0.8rem', background: '#276749', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' },
  btnReject: { padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.78rem', cursor: 'pointer' },
  btnCancel: { padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#718096', fontSize: '0.78rem', cursor: 'pointer' },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '2rem', textAlign: 'center' },
  proposeBtn: { padding: '0.5rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', marginBottom: '1.25rem' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
  modalBox: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', marginBottom: '0.35rem', fontWeight: '600' },
  select: { width: '100%', padding: '0.5rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.85rem' },
  sectionLabel: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginTop: '0.75rem' },
  playerCheckRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid #1a2035', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px', accentColor: '#68d391' },
  playerName: { fontSize: '0.875rem', color: '#e2e8f0' },
  playerMeta: { fontSize: '0.72rem', color: '#718096', marginLeft: 'auto' },
  textarea: { width: '100%', padding: '0.5rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', resize: 'vertical', minHeight: '60px', marginBottom: '0.85rem', boxSizing: 'border-box' },
  modalBtns: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' },
  btnPrimary: { padding: '0.5rem 1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.875rem', cursor: 'pointer' },
  err: { color: '#fc8181', fontSize: '0.82rem', marginTop: '0.4rem' },
};

const STATUS_STYLE = {
  pending:   { background: '#744210', color: '#f6ad55' },
  accepted:  { background: '#1a3a1a', color: '#68d391' },
  rejected:  { background: '#2d1515', color: '#fc8181' },
  cancelled: { background: '#1a2035', color: '#718096' },
};

export default function Trades({ leagueId, token, user, leagueTeams = [] }) {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [myRoster, setMyRoster] = useState([]);
  const [theirRoster, setTheirRoster] = useState([]);
  const [showPropose, setShowPropose] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [offeringIds, setOfferingIds] = useState(new Set());
  const [requestingIds, setRequestingIds] = useState(new Set());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const auth = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leagues/${leagueId}/trades`, { headers: auth }).then(r => r.json()),
      fetch(`/api/leagues/${leagueId}/roster`, { headers: auth }).then(r => r.json()),
    ]).then(([td, roster]) => {
      setData(td);
      setMyRoster(Array.isArray(roster) ? roster : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  useEffect(() => {
    if (!targetTeamId) { setTheirRoster([]); return; }
    fetch(`/api/leagues/${leagueId}/teams/${targetTeamId}/roster`, { headers: auth })
      .then(r => r.json()).then(r => setTheirRoster(Array.isArray(r) ? r : []));
  }, [targetTeamId]);

  const openPropose = () => {
    setTargetTeamId(''); setOfferingIds(new Set()); setRequestingIds(new Set());
    setNote(''); setErr(''); setShowPropose(true);
  };

  const toggleId = (set, setFn, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  };

  const submitTrade = async () => {
    if (!targetTeamId) return setErr('Select a team');
    if (!offeringIds.size) return setErr('Select at least one player to offer');
    if (!requestingIds.size) return setErr('Select at least one player to request');
    setSubmitting(true); setErr('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/trades`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ receivingTeamId: parseInt(targetTeamId), offeringPlayers: [...offeringIds], requestingPlayers: [...requestingIds], note }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Failed'); return; }
      setShowPropose(false); load();
    } catch { setErr('Connection error'); }
    finally { setSubmitting(false); }
  };

  const respond = async (tradeId, action) => {
    await fetch(`/api/leagues/${leagueId}/trades/${tradeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ action }),
    });
    load();
  };

  const cancel = async (tradeId) => {
    await fetch(`/api/leagues/${leagueId}/trades/${tradeId}`, { method: 'DELETE', headers: auth });
    load();
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading trades...</div>;

  const myTeamId = data?.myTeamId;
  const trades = data?.trades || [];
  const pending = trades.filter(t => t.status === 'pending');
  const history = trades.filter(t => t.status !== 'pending');
  const otherTeams = leagueTeams.filter(t => t.user_id && t.user_id !== user?.id);

  return (
    <div style={s.wrapper}>
      {showPropose && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowPropose(false)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>Propose Trade</div>

            <label style={s.label}>Trade with</label>
            <select style={s.select} value={targetTeamId} onChange={e => { setTargetTeamId(e.target.value); setRequestingIds(new Set()); }}>
              <option value="">— Select a team —</option>
              {otherTeams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
            </select>

            <div style={s.sectionLabel}>Your players to offer</div>
            {myRoster.length === 0
              ? <div style={{ color: '#4a5568', fontSize: '0.82rem', marginBottom: '0.5rem' }}>No players on roster yet</div>
              : myRoster.map(p => (
                <div key={p.id} style={s.playerCheckRow} onClick={() => toggleId(offeringIds, setOfferingIds, p.id)}>
                  <input type="checkbox" style={s.checkbox} readOnly checked={offeringIds.has(p.id)} />
                  <span style={s.playerName}>{p.name}</span>
                  <span style={s.playerMeta}>{p.position} — {p.team}</span>
                </div>
              ))
            }

            {targetTeamId && (
              <>
                <div style={s.sectionLabel}>Their players to request</div>
                {theirRoster.length === 0
                  ? <div style={{ color: '#4a5568', fontSize: '0.82rem', marginBottom: '0.5rem' }}>No players on their roster</div>
                  : theirRoster.map(p => (
                    <div key={p.id} style={s.playerCheckRow} onClick={() => toggleId(requestingIds, setRequestingIds, p.id)}>
                      <input type="checkbox" style={s.checkbox} readOnly checked={requestingIds.has(p.id)} />
                      <span style={s.playerName}>{p.name}</span>
                      <span style={s.playerMeta}>{p.position} — {p.team}</span>
                    </div>
                  ))
                }
              </>
            )}

            <div style={{ marginTop: '0.75rem' }}>
              <label style={s.label}>Message (optional)</label>
              <textarea style={s.textarea} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note to your trade proposal..." />
            </div>

            {err && <div style={s.err}>{err}</div>}
            <div style={s.modalBtns}>
              <button style={s.btnGhost} onClick={() => setShowPropose(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={submitTrade} disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Trade'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button style={s.proposeBtn} onClick={openPropose}>+ Propose Trade</button>

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'pending' ? s.tabActive : {}) }} onClick={() => setTab('pending')}>
          Pending {pending.length > 0 && `(${pending.length})`}
        </button>
        <button style={{ ...s.tab, ...(tab === 'history' ? s.tabActive : {}) }} onClick={() => setTab('history')}>History</button>
      </div>

      {(tab === 'pending' ? pending : history).length === 0
        ? <div style={s.empty}>{tab === 'pending' ? 'No pending trades' : 'No trade history'}</div>
        : (tab === 'pending' ? pending : history).map(t => {
          const incoming = t.receiving_team_id === myTeamId;
          const chip = STATUS_STYLE[t.status] || STATUS_STYLE.pending;
          return (
            <div key={t.id} style={s.card}>
              <div style={s.tradeHeader}>
                <div style={{ fontSize: '0.8rem', color: '#718096' }}>
                  {incoming ? <><span style={{ color: '#e2e8f0', fontWeight: '700' }}>{t.proposing_name}</span> → You</> : <>You → <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{t.receiving_name}</span></>}
                </div>
                <span style={{ ...s.statusChip, ...chip }}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
              </div>
              <div style={s.tradeBody}>
                <div style={s.tradeCol}>
                  <div style={s.tradeColLabel}>{incoming ? 'They give you' : 'You give'}</div>
                  {(incoming ? t.offeringPlayers : t.offeringPlayers).map(p => (
                    <span key={p.id} style={s.playerPill}>{p.name} ({p.position})</span>
                  ))}
                </div>
                <div style={s.tradeCol}>
                  <div style={s.tradeColLabel}>{incoming ? 'You give' : 'You receive'}</div>
                  {(incoming ? t.requestingPlayers : t.requestingPlayers).map(p => (
                    <span key={p.id} style={s.playerPill}>{p.name} ({p.position})</span>
                  ))}
                </div>
              </div>
              {t.note && <div style={{ fontSize: '0.78rem', color: '#718096', fontStyle: 'italic', marginBottom: '0.5rem' }}>"{t.note}"</div>}
              {t.status === 'pending' && (
                <div style={s.btnRow}>
                  {incoming ? (
                    <>
                      <button style={s.btnAccept} onClick={() => respond(t.id, 'accept')}>Accept</button>
                      <button style={s.btnReject} onClick={() => respond(t.id, 'reject')}>Reject</button>
                    </>
                  ) : (
                    <button style={s.btnCancel} onClick={() => cancel(t.id)}>Cancel Trade</button>
                  )}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}
