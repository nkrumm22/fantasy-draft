import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../api';

const FORMAT_LABEL = { ppr: 'PPR', half_ppr: '0.5 PPR', standard: 'Standard' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const s = {
  page: { background: '#0a0e1a', minHeight: '100vh', padding: '2rem', color: '#e2e8f0' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' },
  titleBlock: {},
  title: { fontSize: '1.8rem', fontWeight: '700', color: '#f6ad55', margin: 0 },
  subtitle: { fontSize: '0.85rem', color: '#718096', marginTop: '0.25rem' },
  headerRight: { display: 'flex', gap: '0.75rem' },
  btnSecondary: { padding: '0.6rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.85rem', cursor: 'pointer' },
  tabs: { display: 'flex', gap: '0', borderBottom: '1px solid #2d3748', marginBottom: '1.5rem' },
  tab: { padding: '0.65rem 1.25rem', background: 'transparent', border: 'none', color: '#718096', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabActive: { color: '#f6ad55', borderBottom: '2px solid #f6ad55' },
  filterBar: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' },
  search: { flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem' },
  statusFilter: { display: 'flex', gap: '0.35rem' },
  filterBtn: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' },
  filterBtnActive: { background: '#2d3748', color: '#e2e8f0', borderColor: '#4a5568' },
  resultCount: { fontSize: '0.8rem', color: '#4a5568', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2d3748' },
  td: { padding: '0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #1a2035', verticalAlign: 'middle' },
  email: { color: '#e2e8f0', fontWeight: '600' },
  muted: { color: '#718096' },
  badge: { padding: '0.2rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' },
  badgeInProgress: { background: '#2d5a1b', color: '#68d391' },
  badgeCompleted: { background: '#1a2d48', color: '#63b3ed' },
  btnView: { padding: '0.3rem 0.7rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '6px', color: '#a0aec0', fontSize: '0.75rem', cursor: 'pointer', marginRight: '0.4rem' },
  btnDelete: { padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.75rem', cursor: 'pointer' },
  error: { background: '#2d1515', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.85rem', padding: '0.65rem 0.8rem', marginBottom: '1rem' },
  loading: { color: '#4a5568', padding: '2rem', textAlign: 'center' },
  empty: { color: '#4a5568', padding: '2rem', textAlign: 'center', fontSize: '0.9rem' },
};

export default function Admin({ token, user, onLogout, onViewDraft }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fillingBots, setFillingBots] = useState(null);

  const [userSearch, setUserSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLeagues = async () => {
    const r = await apiFetch(token, '/api/admin/leagues');
    setLeagues(await r.json());
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [uRes, dRes, lRes] = await Promise.all([
          apiFetch(token, '/api/admin/users'),
          apiFetch(token, '/api/admin/all-drafts'),
          apiFetch(token, '/api/admin/leagues'),
        ]);
        setUsers(await uRes.json());
        setDrafts(await dRes.json());
        setLeagues(await lRes.json());
      } catch {
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredDrafts = useMemo(() => {
    let list = drafts;
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);
    if (draftSearch) {
      const q = draftSearch.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.user_email.toLowerCase().includes(q));
    }
    return list;
  }, [drafts, draftSearch, statusFilter]);

  const handleViewDraft = async (id) => {
    try {
      const r = await apiFetch(token, `/api/admin/drafts/${id}`);
      const data = await r.json();
      if (!r.ok) return setError(data.error || 'Failed to load draft.');
      onViewDraft(data);
    } catch {
      setError('Connection error.');
    }
  };

  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Delete this draft permanently?')) return;
    const r = await apiFetch(token, `/api/admin/drafts/${id}`, { method: 'DELETE' });
    if (r.ok) setDrafts(prev => prev.filter(d => d.id !== id));
    else setError('Failed to delete draft.');
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Delete user ${email} and all their drafts? This cannot be undone.`)) return;
    const r = await apiFetch(token, `/api/admin/users/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setDrafts(prev => prev.filter(d => d.user_id !== id));
    } else {
      setError('Failed to delete user.');
    }
  };

  const handleFillBots = async (leagueId) => {
    setFillingBots(leagueId);
    try {
      const r = await apiFetch(token, `/api/admin/leagues/${leagueId}/fill-bots`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to fill bots'); return; }
      await fetchLeagues();
    } catch { setError('Connection error'); }
    finally { setFillingBots(null); }
  };

  const handleDeleteLeague = async (id, name) => {
    if (!window.confirm(`Delete league "${name}" and all its data?`)) return;
    const r = await apiFetch(token, `/api/admin/leagues/${id}`, { method: 'DELETE' });
    if (r.ok) setLeagues(prev => prev.filter(l => l.id !== id));
    else setError('Failed to delete league.');
  };

  const StatusFilterBtn = ({ value, label }) => (
    <button
      style={{ ...s.filterBtn, ...(statusFilter === value ? s.filterBtnActive : {}) }}
      onClick={() => setStatusFilter(value)}
    >
      {label}
    </button>
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.titleBlock}>
          <h1 style={s.title}>Admin Dashboard</h1>
          <div style={s.subtitle}>{user?.email}</div>
        </div>
        <div style={s.headerRight}>
          <button style={s.btnSecondary} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'users' ? s.tabActive : {}) }} onClick={() => setTab('users')}>
          Users {users.length > 0 && `(${users.length})`}
        </button>
        <button style={{ ...s.tab, ...(tab === 'drafts' ? s.tabActive : {}) }} onClick={() => setTab('drafts')}>
          All Drafts {drafts.length > 0 && `(${drafts.length})`}
        </button>
        <button style={{ ...s.tab, ...(tab === 'leagues' ? s.tabActive : {}) }} onClick={() => setTab('leagues')}>
          Leagues {leagues.length > 0 && `(${leagues.length})`}
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>Loading...</div>
      ) : tab === 'leagues' ? (
        <>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', color: '#718096' }}>
            Use <strong style={{ color: '#f6ad55' }}>Fill Bots</strong> to instantly fill empty slots with placeholder teams so you can start a draft without inviting real users.
          </div>
          <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>League</th>
                <th style={s.th}>Commissioner</th>
                <th style={s.th}>Teams</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Invite Code</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leagues.length === 0
                ? <tr><td colSpan={6} style={{ ...s.td, ...s.empty }}>No leagues yet</td></tr>
                : leagues.map(l => {
                  const numTeams = l.settings?.numTeams || 10;
                  const isFull = l.team_count >= numTeams;
                  return (
                    <tr key={l.id}>
                      <td style={s.td}><span style={s.email}>{l.name}</span></td>
                      <td style={s.td}><span style={s.muted}>{l.commissioner_email}</span></td>
                      <td style={s.td}><span style={s.muted}>{l.team_count}/{numTeams}</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...(l.status === 'pre_draft' ? { background: '#1a2035', color: '#718096' } : l.status === 'in_season' ? { background: '#2d5a1b', color: '#68d391' } : { background: '#1a2d48', color: '#63b3ed' }) }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={s.td}><span style={{ fontFamily: 'monospace', color: '#68d391', fontWeight: '700' }}>{l.invite_code}</span></td>
                      <td style={s.td}>
                        {!isFull && (
                          <button
                            style={{ ...s.btnView, color: '#f6ad55', borderColor: '#744210', marginRight: '0.4rem', opacity: fillingBots === l.id ? 0.5 : 1 }}
                            onClick={() => handleFillBots(l.id)}
                            disabled={fillingBots === l.id}
                          >
                            {fillingBots === l.id ? 'Filling...' : `Fill Bots (${numTeams - l.team_count})`}
                          </button>
                        )}
                        <button style={s.btnDelete} onClick={() => handleDeleteLeague(l.id, l.name)}>Delete</button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
          </div>
        </>
      ) : tab === 'users' ? (
        <>
          <div style={s.filterBar}>
            <input
              style={s.search}
              placeholder="Search by email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            <span style={s.resultCount}>
              {filteredUsers.length} of {users.length} users
            </span>
          </div>
          <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Email</th>
                <th style={s.th}>Joined</th>
                <th style={s.th}>Drafts</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0
                ? <tr><td colSpan={4} style={{ ...s.td, ...s.empty }}>No users match your search</td></tr>
                : filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={s.td}><span style={s.email}>{u.email}</span></td>
                    <td style={s.td}><span style={s.muted}>{formatDate(u.created_at)}</span></td>
                    <td style={s.td}><span style={s.muted}>{u.draft_count}</span></td>
                    <td style={s.td}>
                      <button style={s.btnDelete} onClick={() => handleDeleteUser(u.id, u.email)}>Delete</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          </div>
        </>
      ) : (
        <>
          <div style={s.filterBar}>
            <input
              style={s.search}
              placeholder="Search by draft name or owner email..."
              value={draftSearch}
              onChange={e => setDraftSearch(e.target.value)}
            />
            <div style={s.statusFilter}>
              <StatusFilterBtn value="all" label="All" />
              <StatusFilterBtn value="in_progress" label="In Progress" />
              <StatusFilterBtn value="completed" label="Done" />
            </div>
            <span style={s.resultCount}>
              {filteredDrafts.length} of {drafts.length} drafts
            </span>
          </div>
          <div className="admin-table-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Draft Name</th>
                <th style={s.th}>Owner</th>
                <th style={s.th}>Format</th>
                <th style={s.th}>Picks</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Updated</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.length === 0
                ? <tr><td colSpan={7} style={{ ...s.td, ...s.empty }}>No drafts match your filters</td></tr>
                : filteredDrafts.map(d => {
                  const teams = Array.isArray(d.teams) ? d.teams.length : d.teams || 0;
                  const total = teams * (d.rounds || 0);
                  return (
                    <tr key={d.id}>
                      <td style={s.td}><span style={s.email}>{d.name}</span></td>
                      <td style={s.td}><span style={s.muted}>{d.user_email}</span></td>
                      <td style={s.td}><span style={s.muted}>{FORMAT_LABEL[d.scoringFormat] || d.scoringFormat || '—'}</span></td>
                      <td style={s.td}><span style={s.muted}>{d.pick_count || 0}/{total}</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...(d.status === 'completed' ? s.badgeCompleted : s.badgeInProgress) }}>
                          {d.status === 'completed' ? 'Done' : 'In Progress'}
                        </span>
                      </td>
                      <td style={s.td}><span style={s.muted}>{formatDate(d.updated_at)}</span></td>
                      <td style={s.td}>
                        <button style={s.btnView} onClick={() => handleViewDraft(d.id)}>View</button>
                        <button style={s.btnDelete} onClick={() => handleDeleteDraft(d.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
