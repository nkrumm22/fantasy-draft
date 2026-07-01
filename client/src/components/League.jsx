import React, { useState, useEffect } from 'react';
import Schedule from './Schedule';
import Lineup from './Lineup';
import Standings from './Standings';
import Waivers from './Waivers';
import Trades from './Trades';
import Playoffs from './Playoffs';
import MatchupDetail from './MatchupDetail';
import PowerRankings from './PowerRankings';
import Transactions from './Transactions';
import DraftQueue from './DraftQueue';
import Announcements from './Announcements';
import PlayerNews from './PlayerNews';
import DraftRecap from './DraftRecap';
import PlayerComparison from './PlayerComparison';
import BenchReport from './BenchReport';
import TradeBlock from './TradeBlock';
import NotificationBell from './NotificationBell';
import Projections from './Projections';
import PlayoffPicture from './PlayoffPicture';
import CommissionerTools from './CommissionerTools';

const s = {
  wrapper: { minHeight: '100vh', background: 'transparent', padding: '2rem 1.5rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' },
  back: { background: 'transparent', border: 'none', color: '#718096', fontSize: '0.85rem', cursor: 'pointer' },
  titleBlock: { flex: 1 },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#e2e8f0' },
  statusChip: { fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.65rem', borderRadius: '20px', marginLeft: '0.75rem' },
  subtitle: { fontSize: '0.85rem', color: '#718096', marginTop: '0.2rem' },
  btnPrimary: { padding: '0.5rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  btnSecondary: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#a0aec0', fontSize: '0.875rem', cursor: 'pointer' },
  btnDanger: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '8px', color: '#fc8181', fontSize: '0.875rem', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.25rem' },
  cardTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' },
  inviteRow: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  code: { flex: 1, padding: '0.6rem 0.8rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#68d391', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.15em', textAlign: 'center', fontFamily: 'monospace' },
  copyBtn: { padding: '0.5rem 0.9rem', background: '#1a3a1a', border: '1px solid #276749', borderRadius: '8px', color: '#68d391', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },
  memberRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1a2035' },
  memberName: { fontSize: '0.9rem', fontWeight: '600', color: '#e2e8f0' },
  memberEmail: { fontSize: '0.75rem', color: '#718096' },
  commBadge: { fontSize: '0.65rem', fontWeight: '700', color: '#f6ad55', background: '#744210', padding: '0.1rem 0.4rem', borderRadius: '4px' },
  slotRow: { display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #1a2035', fontSize: '0.85rem' },
  slotLabel: { color: '#a0aec0' },
  slotVal: { color: '#e2e8f0', fontWeight: '600' },
  draftCta: { marginTop: '1.25rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' },
  ctaTitle: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.4rem' },
  ctaSubtitle: { fontSize: '0.85rem', color: '#718096', marginBottom: '1.1rem' },
  editInput: { background: '#1a2035', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.9rem', padding: '0.3rem 0.6rem' },
  saveBtn: { padding: '0.3rem 0.7rem', background: '#276749', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', marginLeft: '0.4rem' },
  tabBar: { display: 'flex', gap: 0, borderBottom: '1px solid #2d3748', marginBottom: '1.25rem', overflowX: 'auto' },
  tab: { padding: '0.6rem 1rem', background: 'transparent', border: 'none', color: '#718096', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap', flexShrink: 0 },
  tabActive: { color: '#68d391', borderBottom: '2px solid #68d391' },
  standingsToggle: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  toggleBtn: { padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer' },
  toggleBtnActive: { background: '#1a2d48', border: '1px solid #2c4a6e', color: '#63b3ed' },
};

const STATUS_STYLE = {
  pre_draft: { background: '#1a2035', color: '#718096' },
  drafting:  { background: '#744210', color: '#f6ad55' },
  in_season: { background: '#1a3a1a', color: '#68d391' },
  complete:  { background: '#2d1515', color: '#fc8181' },
};
const STATUS_LABEL = { pre_draft: 'Pre-Draft', drafting: 'Drafting', in_season: 'In Season', complete: 'Complete' };
const SLOT_LABELS = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', FLEX: 'FLEX', DST: 'DST', K: 'K', BN: 'Bench' };

export default function League({ leagueId, token, user, onBack, onStartDraft, onViewDraft }) {
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [standingsView, setStandingsView] = useState('standings'); // 'standings' | 'power'
  const [copied, setCopied] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [selectedMatchupId, setSelectedMatchupId] = useState(null);
  const [draftCountdown, setDraftCountdown] = useState(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}`, { headers: authHeader })
      .then(r => r.json())
      .then(data => { setLeague(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  // Poll for draft start — non-commissioners waiting in pre-draft view get auto-redirected
  useEffect(() => {
    if (!league || league.status !== 'pre_draft' || league.commissioner_id === user.id) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/leagues/${leagueId}`, { headers: authHeader });
        const d = await r.json();
        if (d?.status === 'drafting') { setLeague(d); setDraftCountdown(3); }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [league?.status, leagueId]);

  // Countdown → auto-join draft room
  useEffect(() => {
    if (draftCountdown === null) return;
    if (draftCountdown === 0) { handleOpenDraft(); return; }
    const t = setTimeout(() => setDraftCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [draftCountdown]);

  const copyCode = () => {
    navigator.clipboard.writeText(league.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveTeamName = async () => {
    if (!newTeamName.trim()) return;
    const myTeam = league.teams.find(t => t.user_id === user.id);
    if (!myTeam) return;
    setSavingTeam(true);
    const res = await fetch(`/api/leagues/${leagueId}/teams/${myTeam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ teamName: newTeamName }),
    });
    if (res.ok) { setEditingTeamName(false); load(); }
    setSavingTeam(false);
  };

  const handleOpenDraft = async () => {
    setLoadingDraft(true);
    try {
      const r = await fetch(`/api/leagues/${leagueId}/draft`, { headers: authHeader });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Draft not found'); return; }
      onViewDraft(data, !data.isOwner && !data.liveDraft);
    } catch { alert('Connection error'); }
    finally { setLoadingDraft(false); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this league?')) return;
    const res = await fetch(`/api/leagues/${leagueId}/leave`, { method: 'DELETE', headers: authHeader });
    if (res.ok) onBack();
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this league and all its data?')) return;
    const res = await fetch(`/api/leagues/${leagueId}`, { method: 'DELETE', headers: authHeader });
    if (res.ok) onBack();
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading...</div>;
  if (!league) return <div style={{ color: '#fc8181', padding: '2rem' }}>League not found.</div>;

  const isCommissioner = league.commissioner_id === user.id;
  const myTeam = league.teams.find(t => t.user_id === user.id);
  const settings = league.settings || {};
  const sport = settings.sport || 'nfl';
  const statusStyle = STATUS_STYLE[league.status] || STATUS_STYLE.pre_draft;
  const spotsLeft = (settings.numTeams || 10) - league.teams.length;
  const isFull = spotsLeft <= 0;

  const tabs = [
    ['overview', 'Overview'],
    ['schedule', 'Schedule'],
    ['lineup', 'My Lineup'],
    ['standings', 'Standings'],
    ['waivers', 'Waivers'],
    ['trades', 'Trades'],
    ['playoffs', 'Playoffs'],
    ['activity', 'Activity'],
    ['chat', 'Chat'],
    ...(sport === 'nfl' ? [['news', 'Player News']] : []),
    ...(league.status === 'pre_draft' ? [['queue', 'My Queue']] : []),
    ...(league.status !== 'pre_draft' ? [['recap', 'Draft Recap']] : []),
    ['compare', 'Compare Players'],
    ...(league.status !== 'pre_draft' ? [['bench', 'Bench Report'], ['tradeblock', 'Trade Block']] : []),
    ...(league.status !== 'pre_draft' ? [['projections', 'Projections']] : []),
    ...(isCommissioner ? [['tools', 'Commissioner']] : []),
  ];

  // If matchup detail is open, show it instead
  if (selectedMatchupId) {
    return (
      <div style={s.wrapper}>
        <MatchupDetail
          leagueId={leagueId}
          token={token}
          matchupId={selectedMatchupId}
          onClose={() => setSelectedMatchupId(null)}
        />
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      {draftCountdown !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141824', border: '2px solid #276749', borderRadius: '16px', padding: '3rem 2.5rem', textAlign: 'center', maxWidth: '340px', width: '90vw' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#68d391', marginBottom: '0.5rem' }}>Draft is starting!</div>
            <div style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '2rem' }}>
              {league.name} · Joining the draft room...
            </div>
            <div style={{ fontSize: '4rem', fontWeight: '900', color: '#e2e8f0', lineHeight: 1 }}>{draftCountdown}</div>
          </div>
        </div>
      )}
      <div style={s.header}>
        <div>
          <button style={s.back} onClick={onBack}>← My Leagues</button>
          <div style={s.titleBlock}>
            <span style={s.title}>{league.name}</span>
            <span style={{ ...s.statusChip, ...statusStyle }}>{STATUS_LABEL[league.status] || league.status}</span>
            <div style={s.subtitle}>
              {league.season} &bull; {league.teams.length}/{settings.numTeams} teams &bull; {sport.toUpperCase()} &bull; {(settings.scoringFormat || 'half_ppr').replace('_', ' ').toUpperCase()}
              {isCommissioner && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#f6ad55' }}>Commissioner</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <NotificationBell token={token} />
          {!isCommissioner && <button style={s.btnDanger} onClick={handleLeave}>Leave</button>}
          {isCommissioner && <button style={s.btnDanger} onClick={handleDelete}>Delete League</button>}
        </div>
      </div>

      <div style={s.tabBar}>
        {tabs.map(([key, label]) => (
          <button key={key} style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <Schedule
          leagueId={leagueId}
          token={token}
          isCommissioner={isCommissioner}
          onMatchupClick={id => setSelectedMatchupId(id)}
        />
      )}
      {tab === 'lineup' && <Lineup leagueId={leagueId} token={token} settings={settings} />}
      {tab === 'standings' && (
        <>
          <div style={s.standingsToggle}>
            <button style={{ ...s.toggleBtn, ...(standingsView === 'standings' ? s.toggleBtnActive : {}) }} onClick={() => setStandingsView('standings')}>Standings</button>
            <button style={{ ...s.toggleBtn, ...(standingsView === 'power' ? s.toggleBtnActive : {}) }} onClick={() => setStandingsView('power')}>Power Rankings</button>
            {league.status !== 'pre_draft' && (
              <button style={{ ...s.toggleBtn, ...(standingsView === 'picture' ? s.toggleBtnActive : {}) }} onClick={() => setStandingsView('picture')}>Playoff Picture</button>
            )}
          </div>
          {standingsView === 'standings' && <Standings leagueId={leagueId} token={token} settings={settings} />}
          {standingsView === 'power' && <PowerRankings leagueId={leagueId} token={token} />}
          {standingsView === 'picture' && <PlayoffPicture leagueId={leagueId} token={token} />}
        </>
      )}
      {tab === 'waivers' && <Waivers leagueId={leagueId} token={token} isCommissioner={isCommissioner} settings={settings} />}
      {tab === 'trades' && <Trades leagueId={leagueId} token={token} user={user} leagueTeams={league.teams} />}
      {tab === 'playoffs' && <Playoffs leagueId={leagueId} token={token} isCommissioner={isCommissioner} settings={settings} myTeamId={myTeam?.id} />}
      {tab === 'activity' && <Transactions leagueId={leagueId} token={token} />}
      {tab === 'chat' && <Announcements leagueId={leagueId} token={token} isCommissioner={isCommissioner} user={user} />}
      {tab === 'news' && <PlayerNews leagueId={leagueId} token={token} />}
      {tab === 'queue' && <DraftQueue leagueId={leagueId} token={token} />}
      {tab === 'recap' && <DraftRecap leagueId={leagueId} token={token} myTeamId={myTeam?.id} />}
      {tab === 'compare' && <PlayerComparison leagueId={leagueId} token={token} sport={sport} />}
      {tab === 'bench' && <BenchReport leagueId={leagueId} token={token} />}
      {tab === 'tradeblock' && <TradeBlock leagueId={leagueId} token={token} sport={sport} />}
      {tab === 'projections' && <Projections leagueId={leagueId} token={token} settings={settings} />}
{tab === 'tools' && isCommissioner && <CommissionerTools leagueId={leagueId} token={token} league={league} onLeagueUpdate={load} sport={sport} />}

      {tab === 'overview' && (
        <>
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.cardTitle}>Invite Code</div>
              <div style={s.inviteRow}>
                <div style={s.code}>{league.invite_code}</div>
                <button style={s.copyBtn} onClick={copyCode}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#4a5568', marginTop: '0.6rem' }}>
                Share this code so others can join via "Join via Code"
                {isFull && <span style={{ color: '#fc8181', marginLeft: '0.4rem' }}>— League is full</span>}
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardTitle}>Roster Slots</div>
              {Object.entries(settings.rosterSlots || {}).filter(([, n]) => n > 0).map(([slot, n]) => (
                <div key={slot} style={s.slotRow}>
                  <span style={s.slotLabel}>{SLOT_LABELS[slot] || slot}</span>
                  <span style={s.slotVal}>{n}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#718096' }}>
                Waivers: {settings.waiverType === 'faab' ? `FAAB ($${settings.faabBudget})` : 'Priority'}
                &nbsp;&bull;&nbsp;Playoffs: Top {settings.playoffTeams}, Week {settings.playoffStartWeek}
              </div>
            </div>
          </div>

          <div style={{ ...s.card, marginTop: '1.25rem' }}>
            <div style={s.cardTitle}>Teams ({league.teams.length}/{settings.numTeams})</div>
            {league.teams.map(t => (
              <div key={t.id} style={s.memberRow}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {t.user_id === user.id && editingTeamName ? (
                      <>
                        <input style={s.editInput} value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveTeamName()} autoFocus />
                        <button style={s.saveBtn} onClick={saveTeamName} disabled={savingTeam}>Save</button>
                        <button style={{ ...s.saveBtn, background: '#2d3748' }} onClick={() => setEditingTeamName(false)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={s.memberName}>{t.team_name}</span>
                        {t.user_id === user.id && (
                          <button style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => { setNewTeamName(t.team_name); setEditingTeamName(true); }}>✎</button>
                        )}
                        {league.commissioner_id === t.user_id && <span style={s.commBadge}>Commissioner</span>}
                        {t.user_id === user.id && <span style={{ fontSize: '0.7rem', color: '#4a5568' }}>(you)</span>}
                      </>
                    )}
                  </div>
                  <div style={s.memberEmail}>{t.email}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>Slot #{t.draft_slot}</div>
              </div>
            ))}
            {spotsLeft > 0 && (
              <div style={{ padding: '0.6rem 0', fontSize: '0.82rem', color: '#4a5568', fontStyle: 'italic' }}>
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
              </div>
            )}
          </div>

          {isCommissioner && league.status === 'pre_draft' && (
            <div style={s.draftCta}>
              <div style={s.ctaTitle}>
                {isFull ? 'Ready to draft!' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} still open`}
              </div>
              <div style={s.ctaSubtitle}>
                {isFull
                  ? 'All teams have joined. Start the draft when everyone is ready.'
                  : 'Share the invite code above, or start now with the current teams.'}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button style={s.btnPrimary} onClick={() => onStartDraft(league)}>
                  {isFull ? 'Start Draft' : `Start Draft (${league.teams.length}/${settings.numTeams} teams)`}
                </button>
                <button style={s.btnSecondary} onClick={() => setTab('queue')}>My Queue</button>
              </div>
            </div>
          )}

          {!isCommissioner && league.status === 'pre_draft' && (
            <div style={{ ...s.draftCta, marginTop: '1.25rem' }}>
              <div style={s.ctaTitle}>Waiting for the draft to start</div>
              <div style={s.ctaSubtitle}>The commissioner will start the draft when everyone has joined.</div>
              <button style={s.btnSecondary} onClick={() => setTab('queue')}>Set My Queue</button>
            </div>
          )}

          {league.status !== 'pre_draft' && (
            <div style={{ ...s.draftCta, marginTop: '1.25rem' }}>
              <div style={s.ctaTitle}>
                {league.status === 'drafting' ? 'Draft in progress' : 'Draft complete'}
              </div>
              <div style={s.ctaSubtitle}>
                {league.status === 'drafting'
                  ? 'The draft is currently in progress.'
                  : 'The draft has been completed. View your picks below.'}
              </div>
              <button style={s.btnPrimary} onClick={handleOpenDraft} disabled={loadingDraft}>
                {loadingDraft ? 'Loading...' : league.status === 'drafting' ? 'Resume Draft' : 'View Draft'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
