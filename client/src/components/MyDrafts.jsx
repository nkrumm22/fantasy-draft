import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';

const s = {
  page: { background: '#0a0e1a', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' },
  titleBlock: {},
  title: { fontSize: '1.8rem', fontWeight: '700', color: '#68d391', margin: 0 },
  userEmail: { fontSize: '0.85rem', color: '#718096', marginTop: '0.25rem' },
  headerRight: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  btnPrimary: { padding: '0.6rem 1.2rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' },
  btnSecondary: { padding: '0.6rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.85rem', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' },
  draftName: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0', wordBreak: 'break-word', cursor: 'pointer', flex: 1 },
  nameEditRow: { display: 'flex', gap: '0.4rem', flex: 1, alignItems: 'center' },
  nameInput: { flex: 1, padding: '0.3rem 0.5rem', background: '#1a2035', border: '1px solid #68d391', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.95rem', fontWeight: '700', minWidth: 0 },
  nameSave: { padding: '0.3rem 0.6rem', background: '#276749', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  nameCancel: { padding: '0.3rem 0.5rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#718096', fontSize: '0.75rem', cursor: 'pointer' },
  editIcon: { fontSize: '0.75rem', color: '#4a5568', marginLeft: '0.3rem', cursor: 'pointer' },
  badge: { flexShrink: 0, padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeInProgress: { background: '#2d5a1b', color: '#68d391' },
  badgeCompleted: { background: '#1a2d48', color: '#63b3ed' },
  meta: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  chip: { background: '#1a2035', borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', color: '#a0aec0' },
  date: { fontSize: '0.75rem', color: '#4a5568' },
  cardActions: { display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' },
  btnResume: { flex: 1, padding: '0.5rem', background: '#276749', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' },
  btnDelete: { padding: '0.5rem 0.75rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.8rem', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: '4rem 2rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem', color: '#718096' },
  error: { background: '#2d1515', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.85rem', padding: '0.65rem 0.8rem', marginBottom: '1rem' },
};

const FORMAT_LABEL = { ppr: 'PPR', half_ppr: '0.5 PPR', standard: 'Standard' };

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DraftCard({ d, token, onLoad, onDelete, deleting }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(d.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => { setNameVal(d.name); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === d.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const r = await apiFetch(token, `/api/drafts/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (r.ok) { d.name = trimmed; }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const teams = d.teams;
  const rounds = d.rounds;
  const format = d.scoringFormat;
  const picks = d.pick_count || 0;
  const total = (Array.isArray(teams) ? teams.length : teams || 0) * (rounds || 0);

  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        {editing ? (
          <div style={s.nameEditRow}>
            <input
              ref={inputRef}
              style={s.nameInput}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={handleKey}
              disabled={saving}
            />
            <button style={s.nameSave} onClick={saveEdit} disabled={saving}>Save</button>
            <button style={s.nameCancel} onClick={cancelEdit}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <span style={s.draftName} onClick={startEdit} title="Click to rename">{d.name}</span>
            <span style={s.editIcon} onClick={startEdit} title="Rename">✎</span>
          </div>
        )}
        <span style={{ ...s.badge, ...(d.status === 'completed' ? s.badgeCompleted : s.badgeInProgress) }}>
          {d.status === 'completed' ? 'Done' : 'In Progress'}
        </span>
      </div>
      <div style={s.meta}>
        {teams && <span style={s.chip}>{Array.isArray(teams) ? teams.length : teams} teams</span>}
        {rounds && <span style={s.chip}>{rounds} rounds</span>}
        {format && <span style={s.chip}>{FORMAT_LABEL[format] || format}</span>}
        {total > 0 && <span style={s.chip}>{picks}/{total} picks</span>}
      </div>
      <div style={s.date}>
        {d.updated_at ? `Updated ${formatDate(d.updated_at)}` : formatDate(d.created_at)}
      </div>
      <div style={s.cardActions}>
        <button style={s.btnResume} onClick={() => onLoad(d.id)}>
          {d.status === 'completed' ? 'View' : 'Resume'}
        </button>
        <button
          style={{ ...s.btnDelete, opacity: deleting ? 0.5 : 1 }}
          onClick={() => onDelete(d.id)}
          disabled={deleting}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function MyDrafts({ token, user, onNewDraft, onLoadDraft, onLogout, onMyLeagues }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    apiFetch(token, '/api/drafts')
      .then(r => r.json())
      .then(data => { setDrafts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Failed to load drafts.'); setLoading(false); });
  }, []);

  const handleLoad = async (id) => {
    try {
      const r = await apiFetch(token, `/api/drafts/${id}`);
      const data = await r.json();
      if (!r.ok) return setError(data.error || 'Failed to load draft.');
      onLoadDraft(data);
    } catch {
      setError('Connection error.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const r = await apiFetch(token, `/api/drafts/${id}`, { method: 'DELETE' });
      if (!r.ok) return setError('Failed to delete draft.');
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch {
      setError('Connection error.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleBlock}>
          <h1 style={s.title}>My Drafts</h1>
          <div style={s.userEmail}>{user?.email}</div>
        </div>
        <div style={s.headerRight}>
          <button style={s.btnPrimary} onClick={onNewDraft}>+ New Draft</button>
          <button style={s.btnSecondary} onClick={onMyLeagues}>My Leagues</button>
          <button style={s.btnSecondary} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {loading ? (
        <div style={s.empty}><div style={s.emptyTitle}>Loading drafts...</div></div>
      ) : drafts.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No drafts yet</div>
          <div style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Start a new draft to get going.</div>
          <button style={s.btnPrimary} onClick={onNewDraft}>+ New Draft</button>
        </div>
      ) : (
        <div style={s.grid}>
          {drafts.map(d => (
            <DraftCard
              key={d.id}
              d={d}
              token={token}
              onLoad={handleLoad}
              onDelete={handleDelete}
              deleting={deleting === d.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
