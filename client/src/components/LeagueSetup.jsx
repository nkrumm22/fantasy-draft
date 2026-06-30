import React, { useState } from 'react';

const SPORTS = {
  nfl: {
    label: 'NFL Football',
    scoringFormats: [['half_ppr','0.5 PPR'],['ppr','PPR'],['std','Standard']],
    defaultScoringFormat: 'half_ppr', defaultNumRounds: 15,
    defaultRosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BN: 6 },
    rosterSlotKeys: ['QB','RB','WR','TE','FLEX','DST','K','BN'],
  },
  nba: {
    label: 'NBA Basketball',
    scoringFormats: [['std','Standard']],
    defaultScoringFormat: 'std', defaultNumRounds: 13,
    defaultRosterSlots: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1, FLEX: 2, BN: 4 },
    rosterSlotKeys: ['PG','SG','SF','PF','C','FLEX','BN'],
  },
  mlb: {
    label: 'MLB Baseball',
    scoringFormats: [['std','Standard']],
    defaultScoringFormat: 'std', defaultNumRounds: 14,
    defaultRosterSlots: { P: 2, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 1, BN: 4 },
    rosterSlotKeys: ['P','C','1B','2B','3B','SS','OF','UTIL','BN'],
  },
  nhl: {
    label: 'NHL Hockey',
    scoringFormats: [['std','Standard']],
    defaultScoringFormat: 'std', defaultNumRounds: 14,
    defaultRosterSlots: { C: 2, LW: 2, RW: 2, D: 2, G: 1, FLEX: 1, BN: 4 },
    rosterSlotKeys: ['C','LW','RW','D','G','FLEX','BN'],
  },
  epl: {
    label: 'EPL Soccer',
    scoringFormats: [['std','Standard']],
    defaultScoringFormat: 'std', defaultNumRounds: 15,
    defaultRosterSlots: { GKP: 1, DEF: 3, MID: 3, FWD: 2, FLEX: 2, BN: 4 },
    rosterSlotKeys: ['GKP','DEF','MID','FWD','FLEX','BN'],
  },
};

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', gap: '1.5rem', background: 'transparent' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '560px' },
  title: { fontSize: '1.5rem', fontWeight: '700', color: '#68d391', marginBottom: '0.25rem', textAlign: 'center' },
  subtitle: { color: '#718096', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' },
  input: { width: '100%', padding: '0.65rem 0.8rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.25rem', boxSizing: 'border-box' },
  select: { width: '100%', padding: '0.6rem 2rem 0.6rem 0.8rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.25rem', appearance: 'none', WebkitAppearance: 'none', colorScheme: 'dark', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a5568' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem center' },
  row: { display: 'flex', gap: '1rem' },
  col: { flex: 1 },
  section: { marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #2d3748' },
  rosterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' },
  rosterItem: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  rosterLabel: { fontSize: '0.75rem', color: '#718096' },
  rosterInput: { padding: '0.4rem 0.6rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '0.85rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' },
  btnBack: { background: 'transparent', border: 'none', color: '#718096', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.5rem' },
  error: { color: '#fc8181', fontSize: '0.82rem', marginBottom: '0.75rem' },
  sportGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' },
  sportBtn: { padding: '0.55rem 0.5rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', textAlign: 'center' },
  sportBtnActive: { background: '#1a3a1a', border: '1px solid #276749', color: '#68d391' },
  eplNote: { fontSize: '0.72rem', color: '#f6ad55', background: '#744210', border: '1px solid #975a16', borderRadius: '6px', padding: '0.4rem 0.65rem', marginBottom: '0.75rem' },
};

export default function LeagueSetup({ token, onComplete, onBack }) {
  const [sport, setSport] = useState('nfl');
  const [leagueName, setLeagueName] = useState('');
  const [myTeamName, setMyTeamName] = useState('');
  const [numTeams, setNumTeams] = useState(10);
  const [numRounds, setNumRounds] = useState(SPORTS.nfl.defaultNumRounds);
  const [scoringFormat, setScoringFormat] = useState(SPORTS.nfl.defaultScoringFormat);
  const [waiverType, setWaiverType] = useState('faab');
  const [faabBudget, setFaabBudget] = useState(100);
  const [playoffTeams, setPlayoffTeams] = useState(4);
  const [rosterSlots, setRosterSlots] = useState({ ...SPORTS.nfl.defaultRosterSlots });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const changeSport = (s) => {
    const cfg = SPORTS[s];
    setSport(s);
    setRosterSlots({ ...cfg.defaultRosterSlots });
    setScoringFormat(cfg.defaultScoringFormat);
    setNumRounds(cfg.defaultNumRounds);
  };

  const updateRoster = (slot, val) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0) setRosterSlots(prev => ({ ...prev, [slot]: n }));
  };

  const handleCreate = async () => {
    if (!leagueName.trim()) { setError('League name is required'); return; }
    if (!myTeamName.trim()) { setError('Your team name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: leagueName,
          teamName: myTeamName,
          sport,
          settings: { numTeams, numRounds, scoringFormat, waiverType, faabBudget, playoffTeams, rosterSlots,
            tradeDeadlineWeek: 11, playoffStartWeek: 14 },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create league'); return; }
      onComplete(data.id);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const cfg = SPORTS[sport];

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        {onBack && <button style={s.btnBack} onClick={onBack}>← My Leagues</button>}
        <h1 style={s.title}>Create a League</h1>
        <p style={s.subtitle}>You'll get an invite code to share with your league members</p>

        <div style={s.section}>
          <div style={s.sectionTitle}>Sport</div>
          <div style={s.sportGrid}>
            {Object.entries(SPORTS).map(([key, sc]) => (
              <button key={key} style={{ ...s.sportBtn, ...(sport === key ? s.sportBtnActive : {}) }} onClick={() => changeSport(key)}>
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <label style={s.label}>League Name</label>
          <input style={s.input} placeholder={`e.g. Office ${cfg.label} League 2026`} value={leagueName} onChange={e => setLeagueName(e.target.value)} />
          <label style={s.label}>Your Team Name</label>
          <input style={s.input} placeholder="e.g. The Champions" value={myTeamName} onChange={e => setMyTeamName(e.target.value)} />
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>League Settings</div>
          <div style={s.row}>
            <div style={s.col}>
              <label style={s.label}>Teams</label>
              <select style={s.select} value={numTeams} onChange={e => setNumTeams(parseInt(e.target.value))}>
                {[8, 10, 12, 14].map(n => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </div>
            <div style={s.col}>
              <label style={s.label}>Rounds</label>
              <select style={s.select} value={numRounds} onChange={e => setNumRounds(parseInt(e.target.value))}>
                {[10,12,13,14,15,16,17].map(n => <option key={n} value={n}>{n} Rounds</option>)}
              </select>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.col}>
              <label style={s.label}>Scoring</label>
              <select style={s.select} value={scoringFormat} onChange={e => setScoringFormat(e.target.value)}>
                {cfg.scoringFormats.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
            <div style={s.col}>
              <label style={s.label}>Waivers</label>
              <select style={s.select} value={waiverType} onChange={e => setWaiverType(e.target.value)}>
                <option value="faab">FAAB ($)</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>
          <div style={s.row}>
            {waiverType === 'faab' && (
              <div style={s.col}>
                <label style={s.label}>FAAB Budget</label>
                <input style={s.input} type="number" min="50" max="1000" value={faabBudget} onChange={e => setFaabBudget(parseInt(e.target.value))} />
              </div>
            )}
            <div style={s.col}>
              <label style={s.label}>Playoff Teams</label>
              <select style={s.select} value={playoffTeams} onChange={e => setPlayoffTeams(parseInt(e.target.value))}>
                {[2, 4, 6, 8].map(n => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>Roster Slots</div>
          <div style={s.rosterGrid}>
            {cfg.rosterSlotKeys.map(slot => (
              <div key={slot} style={s.rosterItem}>
                <span style={s.rosterLabel}>{slot}</span>
                <input
                  style={s.rosterInput}
                  type="number" min="0" max="10"
                  value={rosterSlots[slot] ?? 0}
                  onChange={e => updateRoster(slot, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {error && <div style={s.error}>{error}</div>}
        <button style={s.btn} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create League'}
        </button>
      </div>
    </div>
  );
}
