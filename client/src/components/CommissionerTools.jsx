import React, { useState } from 'react';

const s = {
  section: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #2d3748' },
  row: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' },
  label: { fontSize: '0.82rem', color: '#a0aec0', fontWeight: '600', minWidth: '110px' },
  input: { padding: '0.45rem 0.7rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', width: '72px', colorScheme: 'dark' },
  select: { padding: '0.45rem 0.7rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', colorScheme: 'dark' },
  btn: { padding: '0.45rem 1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' },
  btnOutline: { padding: '0.45rem 1rem', background: 'transparent', border: '1px solid #276749', borderRadius: '8px', color: '#68d391', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' },
  msg: { fontSize: '0.78rem', color: '#68d391' },
  err: { fontSize: '0.78rem', color: '#fc8181' },
  hint: { fontSize: '0.72rem', color: '#4a5568', marginTop: '0.35rem' },
  orderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1a2035', fontSize: '0.875rem' },
  slot: { fontSize: '0.72rem', fontWeight: '700', color: '#718096', background: '#0f1420', padding: '0.15rem 0.5rem', borderRadius: '4px' },
  wideInput: { padding: '0.45rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', flex: 1, colorScheme: 'dark', minWidth: '180px' },
  resultRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '6px', cursor: 'pointer', marginBottom: '0.25rem', fontSize: '0.85rem', color: '#e2e8f0' },
  posBadge: { fontSize: '0.62rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '3px', color: '#000', background: '#68d391', flexShrink: 0 },
};

export default function CommissionerTools({ leagueId, token, league, onLeagueUpdate, sport, onSwitchLeague }) {
  const settings = league.settings || {};
  const [currentWeek, setCurrentWeek] = useState(settings.currentWeek || 1);
  const [leagueStatus, setLeagueStatus] = useState(league.status || 'pre_draft');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  const [scoreWeek, setScoreWeek] = useState(settings.currentWeek || 1);
  const [scoring, setScoring] = useState(false);
  const [scoreMsg, setScoreMsg] = useState('');

  const [draftOrder, setDraftOrder] = useState(
    [...(league.teams || [])].sort((a, b) => (a.draft_slot || 99) - (b.draft_slot || 99))
  );
  const [randomizing, setRandomizing] = useState(false);
  const [orderMsg, setOrderMsg] = useState('');

  const [rosterTeamId, setRosterTeamId] = useState('');
  const [rosterAction, setRosterAction] = useState('add');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterResults, setRosterResults] = useState([]);
  const [moveMsg, setMoveMsg] = useState('');

  const [startingSeason, setStartingSeason] = useState(false);
  const [seasonMsg, setSeasonMsg] = useState('');

  const auth = { Authorization: `Bearer ${token}` };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ status: leagueStatus, settings: { currentWeek: parseInt(currentWeek) } }),
      });
      if (r.ok) { setSettingsMsg('Saved!'); onLeagueUpdate(); }
      else { const d = await r.json(); setSettingsMsg(d.error || 'Error'); }
    } catch { setSettingsMsg('Network error'); }
    setSavingSettings(false);
  };

  const triggerScore = async () => {
    setScoring(true);
    setScoreMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/score/${scoreWeek}`, { method: 'POST', headers: auth });
      const d = await r.json();
      setScoreMsg(r.ok ? `Week ${scoreWeek} scored (${d.scored} matchups).` : d.error || 'Error');
    } catch { setScoreMsg('Network error'); }
    setScoring(false);
  };

  const randomizeDraftOrder = async () => {
    if (!window.confirm('Randomize all draft slots? This cannot be undone.')) return;
    setRandomizing(true);
    setOrderMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/commissioner/randomize-draft-order`, { method: 'POST', headers: auth });
      const d = await r.json();
      if (r.ok) { setDraftOrder(d.teams); setOrderMsg('Draft order randomized!'); onLeagueUpdate(); }
      else setOrderMsg(d.error || 'Error');
    } catch { setOrderMsg('Network error'); }
    setRandomizing(false);
  };

  const searchPlayers = async (q) => {
    setRosterQuery(q);
    setMoveMsg('');
    if (q.trim().length < 2) { setRosterResults([]); return; }
    try {
      const r = await fetch(`/api/players/search?q=${encodeURIComponent(q)}&sport=${sport || 'nfl'}`, { headers: auth });
      if (r.ok) setRosterResults(await r.json());
    } catch {}
  };

  const startNextSeason = async () => {
    if (!window.confirm(`Start Season ${league.season + 1}? This marks the current season complete and creates a new league with the same teams and settings.`)) return;
    setStartingSeason(true);
    setSeasonMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/next-season`, { method: 'POST', headers: auth });
      const d = await r.json();
      if (r.ok) { onSwitchLeague?.(d.id); }
      else setSeasonMsg(d.error || 'Error');
    } catch { setSeasonMsg('Network error'); }
    setStartingSeason(false);
  };

  const submitMove = async (player) => {
    if (!rosterTeamId) { setMoveMsg('Select a team first'); return; }
    setMoveMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/commissioner/roster-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ teamId: parseInt(rosterTeamId), playerId: player.id, action: rosterAction }),
      });
      const d = await r.json();
      if (r.ok) { setMoveMsg(`${rosterAction === 'add' ? 'Added' : 'Dropped'} ${player.name}`); setRosterQuery(''); setRosterResults([]); }
      else setMoveMsg(d.error || 'Error');
    } catch { setMoveMsg('Network error'); }
  };

  return (
    <div>
      <div style={s.section}>
        <div style={s.sectionTitle}>League Settings</div>
        <div style={s.row}>
          <span style={s.label}>Current Week</span>
          <input style={s.input} type="number" min="1" max="17" value={currentWeek} onChange={e => setCurrentWeek(e.target.value)} />
          <span style={s.label}>Status</span>
          <select style={s.select} value={leagueStatus} onChange={e => setLeagueStatus(e.target.value)}>
            <option value="pre_draft">Pre-Draft</option>
            <option value="drafting">Drafting</option>
            <option value="in_season">In Season</option>
            <option value="complete">Complete</option>
          </select>
          <button style={s.btn} onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save'}
          </button>
          {settingsMsg && <span style={settingsMsg.includes('Error') || settingsMsg.includes('error') ? s.err : s.msg}>{settingsMsg}</span>}
        </div>
        <div style={s.hint}>Setting current week updates the default for projections and Best Lineup.</div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Score a Week</div>
        <div style={s.row}>
          <span style={s.label}>Week</span>
          <input style={s.input} type="number" min="1" max="17" value={scoreWeek} onChange={e => setScoreWeek(e.target.value)} />
          <button style={s.btn} onClick={triggerScore} disabled={scoring}>
            {scoring ? 'Scoring...' : 'Calculate Scores'}
          </button>
          {scoreMsg && <span style={scoreMsg.includes('error') || scoreMsg.includes('Error') ? s.err : s.msg}>{scoreMsg}</span>}
        </div>
        <div style={s.hint}>Pulls live stats from Sleeper and marks all week matchups as complete.</div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Draft Order</div>
        <div style={{ marginBottom: '0.85rem' }}>
          {draftOrder.map(t => (
            <div key={t.id} style={s.orderRow}>
              <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '0.875rem' }}>{t.team_name || t.name}</span>
              <span style={s.slot}>Slot #{t.draft_slot ?? '—'}</span>
            </div>
          ))}
        </div>
        <div style={s.row}>
          <button style={s.btnOutline} onClick={randomizeDraftOrder} disabled={randomizing}>
            {randomizing ? 'Randomizing...' : 'Randomize Draft Order'}
          </button>
          {orderMsg && <span style={s.msg}>{orderMsg}</span>}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Roster Management</div>
        <div style={s.row}>
          <span style={s.label}>Team</span>
          <select style={s.select} value={rosterTeamId} onChange={e => setRosterTeamId(e.target.value)}>
            <option value="">Select team...</option>
            {(league.teams || []).map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
          </select>
          <span style={s.label}>Action</span>
          <select style={s.select} value={rosterAction} onChange={e => setRosterAction(e.target.value)}>
            <option value="add">Add</option>
            <option value="drop">Drop</option>
          </select>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            style={{ ...s.wideInput, width: '100%', boxSizing: 'border-box' }}
            placeholder="Search player name..."
            value={rosterQuery}
            onChange={e => searchPlayers(e.target.value)}
          />
        </div>
        {rosterResults.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            {rosterResults.slice(0, 6).map(p => (
              <div key={p.id} style={s.resultRow} onClick={() => submitMove(p)}>
                <span style={s.posBadge}>{p.position}</span>
                <span style={{ flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: '0.72rem', color: '#718096' }}>{p.team}</span>
              </div>
            ))}
          </div>
        )}
        {moveMsg && <div style={{ fontSize: '0.82rem', color: '#68d391', marginBottom: '0.25rem' }}>{moveMsg}</div>}
        <div style={s.hint}>Click a player to immediately {rosterAction} them for the selected team.</div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Season</div>
        <div style={s.row}>
          <button style={s.btnOutline} onClick={startNextSeason} disabled={startingSeason}>
            {startingSeason ? 'Starting...' : `Start Season ${league.season + 1}`}
          </button>
          {seasonMsg && <span style={s.err}>{seasonMsg}</span>}
        </div>
        <div style={s.hint}>
          Marks this season complete and creates a new league for next year with the same teams, sport, and settings —
          linked so it shows up together in League History. You'll be taken to the new league to start a fresh draft.
        </div>
      </div>
    </div>
  );
}
