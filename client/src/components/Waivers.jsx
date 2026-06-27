import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  row: { display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', flex: 1, minWidth: '260px' },
  cardTitle: { fontSize: '0.72rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  playerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a2035' },
  playerName: { fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0' },
  playerMeta: { fontSize: '0.72rem', color: '#718096' },
  posBadge: { fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', marginRight: '0.35rem' },
  addBtn: { padding: '0.25rem 0.6rem', background: '#1a3a1a', border: '1px solid #276749', borderRadius: '6px', color: '#68d391', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' },
  cancelBtn: { padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.75rem', cursor: 'pointer' },
  processBtn: { padding: '0.5rem 1.1rem', background: '#2c4a6e', border: 'none', borderRadius: '8px', color: '#63b3ed', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  filterRow: { display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  filterBtn: { padding: '0.2rem 0.6rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.75rem', cursor: 'pointer' },
  filterBtnActive: { background: '#1a3a1a', border: '1px solid #276749', color: '#68d391' },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' },
  faab: { fontSize: '0.8rem', color: '#718096', marginBottom: '0.75rem' },
  faabGreen: { color: '#68d391', fontWeight: '700' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalBox: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '420px' },
  modalTitle: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', marginBottom: '0.35rem', fontWeight: '600' },
  select: { width: '100%', padding: '0.5rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.85rem', colorScheme: 'dark' },
  input: { width: '100%', padding: '0.5rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.85rem', boxSizing: 'border-box' },
  modalBtns: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  btnPrimary: { padding: '0.5rem 1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.875rem', cursor: 'pointer' },
  msg: { fontSize: '0.82rem', marginTop: '0.5rem' },
};

const POS_COLORS = { QB: ['#2c4a6e','#63b3ed'], RB: ['#1a3a1a','#68d391'], WR: ['#44337a','#b794f4'], TE: ['#744210','#f6ad55'], K: ['#1a2d48','#90cdf4'], DST: ['#2d1515','#fc8181'] };

const POSITIONS = ['ALL','QB','RB','WR','TE','K','DST'];

export default function Waivers({ leagueId, token, isCommissioner, settings }) {
  const [freeAgents, setFreeAgents] = useState([]);
  const [waiverData, setWaiverData] = useState(null);
  const [myRoster, setMyRoster] = useState([]);
  const [pos, setPos] = useState('ALL');
  const [claimPlayer, setClaimPlayer] = useState(null);
  const [dropPlayer, setDropPlayer] = useState('');
  const [bidAmount, setBidAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const auth = { Authorization: `Bearer ${token}` };
  const isFaab = settings?.waiverType === 'faab';

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leagues/${leagueId}/free-agents${pos !== 'ALL' ? `?pos=${pos}` : ''}`, { headers: auth }).then(r => r.json()),
      fetch(`/api/leagues/${leagueId}/waivers`, { headers: auth }).then(r => r.json()),
      fetch(`/api/leagues/${leagueId}/roster`, { headers: auth }).then(r => r.json()),
    ]).then(([fa, wd, roster]) => {
      setFreeAgents(Array.isArray(fa) ? fa : []);
      setWaiverData(wd);
      setMyRoster(Array.isArray(roster) ? roster : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId, pos]);

  const openClaim = (player) => { setClaimPlayer(player); setDropPlayer(''); setBidAmount(0); setMsg(''); };

  const submitClaim = async () => {
    setSubmitting(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/waivers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ addPlayerId: claimPlayer.id, dropPlayerId: dropPlayer ? parseInt(dropPlayer) : null, bidAmount: parseInt(bidAmount) || 0 }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed'); return; }
      setClaimPlayer(null); load();
    } catch { setMsg('Connection error'); }
    finally { setSubmitting(false); }
  };

  const cancelClaim = async (claimId) => {
    await fetch(`/api/leagues/${leagueId}/waivers/${claimId}`, { method: 'DELETE', headers: auth });
    load();
  };

  const processWaivers = async () => {
    if (!window.confirm('Process all pending waiver claims now? This cannot be undone.')) return;
    setProcessing(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/waivers/process`, { method: 'POST', headers: auth });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed'); return; }
      setMsg(`Done — ${d.approved} approved, ${d.denied} denied`);
      load();
    } catch { setMsg('Connection error'); }
    finally { setProcessing(false); }
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading waivers...</div>;

  const myClaims = waiverData?.myClaims || [];
  const faabLeft = waiverData?.faabRemaining ?? (settings?.faabBudget || 100);
  const budget = settings?.faabBudget || 100;

  return (
    <div style={s.wrapper}>
      {claimPlayer && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setClaimPlayer(null)}>
          <div style={s.modalBox}>
            <div style={s.modalTitle}>Claim {claimPlayer.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#718096', marginBottom: '1rem' }}>
              {claimPlayer.position} — {claimPlayer.team}
            </div>
            {myRoster.length > 0 && (
              <>
                <label style={s.label}>Drop player (optional)</label>
                <select style={s.select} value={dropPlayer} onChange={e => setDropPlayer(e.target.value)}>
                  <option value="">— Keep full roster —</option>
                  {myRoster.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                </select>
              </>
            )}
            {isFaab && (
              <>
                <label style={s.label}>FAAB Bid (${faabLeft} remaining)</label>
                <input style={s.input} type="number" min="0" max={faabLeft} value={bidAmount}
                  onChange={e => setBidAmount(Math.min(faabLeft, Math.max(0, parseInt(e.target.value) || 0)))} />
              </>
            )}
            {msg && <div style={{ ...s.msg, color: '#fc8181' }}>{msg}</div>}
            <div style={s.modalBtns}>
              <button style={s.btnGhost} onClick={() => setClaimPlayer(null)}>Cancel</button>
              <button style={s.btnPrimary} onClick={submitClaim} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.row}>
        {/* My Pending Claims */}
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={s.cardTitle}>My Pending Claims</div>
            {isCommissioner && (
              <button style={s.processBtn} onClick={processWaivers} disabled={processing}>
                {processing ? 'Processing...' : 'Process Waivers'}
              </button>
            )}
          </div>
          {isFaab && (
            <div style={s.faab}>
              FAAB Budget: <span style={s.faabGreen}>${faabLeft}</span> / ${budget}
            </div>
          )}
          {msg && <div style={{ ...s.msg, color: msg.includes('Done') ? '#68d391' : '#fc8181', marginBottom: '0.5rem' }}>{msg}</div>}
          {myClaims.length === 0
            ? <div style={s.empty}>No pending claims</div>
            : myClaims.map(c => (
              <div key={c.id} style={s.playerRow}>
                <div>
                  <div style={s.playerName}>+ {c.addPlayer?.name || `Player #${c.add_player_id}`}</div>
                  {c.dropPlayer && <div style={s.playerMeta}>- {c.dropPlayer.name}</div>}
                  {isFaab && <div style={s.playerMeta}>Bid: ${c.bid_amount}</div>}
                </div>
                <button style={s.cancelBtn} onClick={() => cancelClaim(c.id)}>Cancel</button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Free Agents */}
      <div style={s.card}>
        <div style={s.cardTitle}>Free Agents</div>
        <div style={s.filterRow}>
          {POSITIONS.map(p => (
            <button key={p} style={{ ...s.filterBtn, ...(pos === p ? s.filterBtnActive : {}) }} onClick={() => setPos(p)}>{p}</button>
          ))}
        </div>
        {freeAgents.length === 0
          ? <div style={s.empty}>No free agents available</div>
          : freeAgents.map(p => {
            const [bg, fg] = POS_COLORS[p.position] || ['#1a2035', '#718096'];
            return (
              <div key={p.id} style={s.playerRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ ...s.posBadge, background: bg, color: fg }}>{p.position}</span>
                  <div>
                    <div style={s.playerName}>{p.name}</div>
                    <div style={s.playerMeta}>{p.team} &bull; ADP {p.adp?.toFixed(0)}</div>
                  </div>
                </div>
                <button style={s.addBtn} onClick={() => openClaim(p)}>+ Claim</button>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
