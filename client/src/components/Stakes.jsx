import React, { useState, useEffect, useCallback } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  postBtn: { padding: '0.5rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', marginBottom: '1.25rem' },
  formCard: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', marginBottom: '0.35rem', fontWeight: '600' },
  input: { width: '100%', padding: '0.5rem 0.7rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' },
  textarea: { width: '100%', background: '#141824', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', padding: '0.6rem 0.75rem', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '0.75rem' },
  formBtns: { display: 'flex', gap: '0.5rem' },
  btnPrimary: { padding: '0.4rem 0.9rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', marginTop: '1.5rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' },
  cardResolved: { background: '#0f1420', border: '1px solid #1a2035', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem', opacity: 0.75 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' },
  title: { fontSize: '0.95rem', fontWeight: '700', color: '#e2e8f0' },
  titleResolved: { fontSize: '0.95rem', fontWeight: '700', color: '#a0aec0', textDecoration: 'line-through' },
  proposer: { fontSize: '0.72rem', color: '#4a5568' },
  description: { fontSize: '0.85rem', color: '#a0aec0', lineHeight: 1.5, marginTop: '0.3rem' },
  outcome: { fontSize: '0.83rem', color: '#68d391', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1a2035' },
  actionRow: { display: 'flex', gap: '0.5rem', marginTop: '0.6rem' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#4a5568', fontSize: '0.9rem', cursor: 'pointer', padding: '0 0.25rem' },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '1.5rem 0', textAlign: 'center' },
  err: { fontSize: '0.78rem', color: '#fc8181', marginTop: '0.4rem' },
};

function relativeTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Stakes({ leagueId, token, isCommissioner, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [outcomeText, setOutcomeText] = useState('');
  const auth = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/stakes`, { headers: auth })
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId, token]);

  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    setErr('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/stakes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ title, description }),
      });
      const d = await r.json();
      if (r.ok) { setTitle(''); setDescription(''); setShowForm(false); load(); }
      else setErr(d.error || 'Failed to add stake');
    } catch { setErr('Connection error'); }
    finally { setSubmitting(false); }
  };

  const resolve = async (id) => {
    if (!outcomeText.trim()) return;
    const r = await fetch(`/api/leagues/${leagueId}/stakes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ outcome: outcomeText }),
    });
    if (r.ok) { setResolvingId(null); setOutcomeText(''); load(); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this side bet?')) return;
    await fetch(`/api/leagues/${leagueId}/stakes/${id}`, { method: 'DELETE', headers: auth });
    load();
  };

  const canManage = item => item.created_by === user?.id || isCommissioner;

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading side bets...</div>;

  const active = items.filter(i => i.status === 'active');
  const resolved = items.filter(i => i.status !== 'active');

  return (
    <div style={s.wrapper}>
      {!showForm
        ? <button style={s.postBtn} onClick={() => setShowForm(true)}>+ Add Side Bet</button>
        : (
          <div style={s.formCard}>
            <label style={s.label}>What's the bet?</label>
            <input style={s.input} placeholder='e.g. "Last place buys dinner"' value={title} onChange={e => setTitle(e.target.value)} maxLength={255} />
            <label style={s.label}>Terms (optional)</label>
            <textarea style={s.textarea} placeholder="How does this get decided?" value={description} onChange={e => setDescription(e.target.value)} />
            {err && <div style={s.err}>{err}</div>}
            <div style={s.formBtns}>
              <button style={s.btnGhost} onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setErr(''); }}>Cancel</button>
              <button style={s.btnPrimary} onClick={post} disabled={submitting || !title.trim()}>
                {submitting ? 'Adding...' : 'Add Side Bet'}
              </button>
            </div>
          </div>
        )
      }

      <div style={s.sectionTitle}>Active ({active.length})</div>
      {active.length === 0
        ? <div style={s.empty}>No active side bets. Add one above to start some friendly stakes.</div>
        : active.map(item => {
          const mine = canManage(item);
          return (
            <div key={item.id} style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <div style={s.title}>{item.title}</div>
                  <div style={s.proposer}>Proposed by {item.team_name} &bull; {relativeTime(item.created_at)}</div>
                </div>
                {mine && <button style={s.deleteBtn} onClick={() => del(item.id)} title="Delete">✕</button>}
              </div>
              {item.description && <div style={s.description}>{item.description}</div>}
              {mine && (
                resolvingId === item.id ? (
                  <div style={{ marginTop: '0.6rem' }}>
                    <input
                      style={s.input}
                      placeholder="What happened? e.g. Mike lost, owes dinner Friday"
                      value={outcomeText}
                      onChange={e => setOutcomeText(e.target.value)}
                      autoFocus
                    />
                    <div style={s.formBtns}>
                      <button style={s.btnGhost} onClick={() => { setResolvingId(null); setOutcomeText(''); }}>Cancel</button>
                      <button style={s.btnPrimary} onClick={() => resolve(item.id)} disabled={!outcomeText.trim()}>Save Outcome</button>
                    </div>
                  </div>
                ) : (
                  <div style={s.actionRow}>
                    <button style={s.btnGhost} onClick={() => { setResolvingId(item.id); setOutcomeText(''); }}>Mark Resolved</button>
                  </div>
                )
              )}
            </div>
          );
        })
      }

      {resolved.length > 0 && (
        <>
          <div style={s.sectionTitle}>Resolved ({resolved.length})</div>
          {resolved.map(item => (
            <div key={item.id} style={s.cardResolved}>
              <div style={s.cardHeader}>
                <div>
                  <div style={s.titleResolved}>{item.title}</div>
                  <div style={s.proposer}>Proposed by {item.team_name}</div>
                </div>
                {canManage(item) && (
                  <button style={s.deleteBtn} onClick={() => del(item.id)} title="Delete">✕</button>
                )}
              </div>
              {item.outcome && <div style={s.outcome}>✓ {item.outcome}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
