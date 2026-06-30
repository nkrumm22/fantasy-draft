import React, { useState, useEffect } from 'react';
import PulseLogo from './PulseLogo';
import NotificationBell from './NotificationBell';

const s = {
  wrapper: { minHeight: '100vh', background: 'transparent', padding: '2rem 1.5rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#68d391' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  email: { fontSize: '0.85rem', color: '#718096' },
  btnPrimary: { padding: '0.5rem 1.1rem', background: 'linear-gradient(135deg, #276749, #2d8a60)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(39,103,73,0.3)' },
  btnSecondary: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#a0aec0', fontSize: '0.875rem', cursor: 'pointer' },
  btnOutline: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #276749', borderRadius: '8px', color: '#68d391', fontSize: '0.875rem', cursor: 'pointer' },
  actions: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.5rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' },
  cardTitle: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.3rem' },
  cardMeta: { fontSize: '0.8rem', color: '#718096', marginBottom: '0.75rem' },
  cardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { fontSize: '0.85rem', color: '#a0aec0', fontWeight: '600' },
  statusChip: { fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px' },
  empty: { textAlign: 'center', padding: '4rem 2rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#718096' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  modalCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '420px' },
  modalTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' },
  input: { width: '100%', padding: '0.6rem 0.8rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '0.6rem', marginTop: '0.5rem' },
  error: { color: '#fc8181', fontSize: '0.82rem', marginTop: '-0.5rem', marginBottom: '0.75rem' },
};

const STATUS_STYLE = {
  pre_draft: { background: '#1a2035', color: '#718096' },
  drafting:  { background: '#744210', color: '#f6ad55' },
  in_season: { background: '#1a3a1a', color: '#68d391' },
  complete:  { background: '#2d1515', color: '#fc8181' },
};

const STATUS_LABEL = { pre_draft: 'Pre-Draft', drafting: 'Drafting', in_season: 'In Season', complete: 'Complete' };

const SPORT_COLORS = {
  nfl: { accent: '#e53e3e', badgeBg: '#2d1a1a', badgeFg: '#fc8181' },
  nba: { accent: '#3182ce', badgeBg: '#1a2035', badgeFg: '#63b3ed' },
  mlb: { accent: '#dd6b20', badgeBg: '#2d1f0a', badgeFg: '#f6ad55' },
  nhl: { accent: '#718096', badgeBg: '#1a1e2a', badgeFg: '#e2e8f0' },
  epl: { accent: '#805ad5', badgeBg: '#1f1a35', badgeFg: '#b794f4' },
};

export default function MyLeagues({ token, user, onOpenLeague, onNewLeague, onLogout, onMyDrafts, onHowToPlay }) {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/leagues', { headers: authHeader })
      .then(r => r.json())
      .then(data => { setLeagues(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinTeamName.trim()) { setJoinError('Both fields are required'); return; }
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ inviteCode: joinCode, teamName: joinTeamName }),
      });
      const data = await res.json();
      if (!res.ok) { setJoinError(data.error || 'Failed to join'); return; }
      setShowJoin(false);
      setJoinCode('');
      setJoinTeamName('');
      const refreshed = await fetch('/api/leagues', { headers: authHeader }).then(r => r.json());
      setLeagues(Array.isArray(refreshed) ? refreshed : []);
    } catch { setJoinError('Network error'); }
    finally { setJoining(false); }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <PulseLogo size={30} />
          <span style={s.title}>My Leagues</span>
        </div>
        <div style={s.userInfo}>
          <span style={s.email}>{user?.email}</span>
          <NotificationBell token={token} />
          <button style={s.btnSecondary} onClick={onHowToPlay}>How to Play</button>
          <button style={s.btnSecondary} onClick={onMyDrafts}>Drafts</button>
          <button style={s.btnSecondary} onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div style={s.actions}>
        <button style={s.btnPrimary} onClick={onNewLeague}>+ Create League</button>
        <button style={s.btnOutline} onClick={() => setShowJoin(true)}>Join via Code</button>
      </div>

      {loading ? (
        <div style={{ color: '#4a5568', padding: '2rem' }}>Loading...</div>
      ) : leagues.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No leagues yet</div>
          <div style={{ fontSize: '0.875rem' }}>Create a league or ask a commissioner for an invite code.</div>
        </div>
      ) : (
        <div style={s.grid}>
          {leagues.map(l => {
            const statusStyle = STATUS_STYLE[l.status] || STATUS_STYLE.pre_draft;
            const sport = (l.settings?.sport || 'nfl').toLowerCase();
            const sc = SPORT_COLORS[sport] || SPORT_COLORS.nfl;
            return (
              <div
                key={l.id}
                style={{ ...s.card, borderLeft: `3px solid ${sc.accent}` }}
                onClick={() => onOpenLeague(l.id)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#4a5568';
                  e.currentTarget.style.borderLeftColor = sc.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${sc.accent}22, 0 6px 24px rgba(0,0,0,0.4)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#2d3748';
                  e.currentTarget.style.borderLeftColor = sc.accent;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <div style={s.cardTitle}>{l.name}</div>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: sc.badgeBg, color: sc.badgeFg, fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.06em', flexShrink: 0 }}>{sport.toUpperCase()}</span>
                </div>
                <div style={s.cardMeta}>
                  {l.season} &bull; {l.member_count}/{l.settings?.numTeams || 10} teams &bull; {l.settings?.scoringFormat?.replace('_', ' ').toUpperCase() || 'HALF PPR'}
                </div>
                <div style={s.cardRow}>
                  <span style={s.teamName}>{l.my_team_name}</span>
                  <span style={{ ...s.statusChip, ...statusStyle }}>{STATUS_LABEL[l.status] || l.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showJoin && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowJoin(false)}>
          <div style={s.modalCard}>
            <div style={s.modalTitle}>Join a League</div>
            <label style={s.label}>Invite Code</label>
            <input
              style={s.input}
              placeholder="e.g. A3F2B7C1"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <label style={s.label}>Your Team Name</label>
            <input
              style={s.input}
              placeholder="e.g. Touchdown Kings"
              value={joinTeamName}
              onChange={e => setJoinTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {joinError && <div style={s.error}>{joinError}</div>}
            <div style={s.modalActions}>
              <button style={s.btnPrimary} onClick={handleJoin} disabled={joining}>
                {joining ? 'Joining...' : 'Join League'}
              </button>
              <button style={s.btnSecondary} onClick={() => { setShowJoin(false); setJoinError(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
