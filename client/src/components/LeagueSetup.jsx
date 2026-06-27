import React, { useState } from 'react';

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', gap: '1.5rem', background: '#0a0e1a' },
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
};

const DEFAULT_ROSTER = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BN: 6 };
const ROSTER_SLOTS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST', 'K', 'BN'];

export default function LeagueSetup({ token, onComplete, onBack }) {
  const [leagueName, setLeagueName] = useState('');
  const [myTeamName, setMyTeamName] = useState('');
  const [numTeams, setNumTeams] = useState(10);
  const [numRounds, setNumRounds] = useState(15);
  const [scoringFormat, setScoringFormat] = useState('half_ppr');
  const [waiverType, setWaiverType] = useState('faab');
  const [faabBudget, setFaabBudget] = useState(100);
  const [playoffTeams, setPlayoffTeams] = useState(4);
  const [rosterSlots, setRosterSlots] = useState({ ...DEFAULT_ROSTER });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        {onBack && <button style={s.btnBack} onClick={onBack}>← My Leagues</button>}
        <h1 style={s.title}>Create a League</h1>
        <p style={s.subtitle}>You'll get an invite code to share with your league members</p>

        <div style={s.section}>
          <label style={s.label}>League Name</label>
          <input style={s.input} placeholder="e.g. Office Fantasy League 2026" value={leagueName} onChange={e => setLeagueName(e.target.value)} />
          <label style={s.label}>Your Team Name</label>
          <input style={s.input} placeholder="e.g. Touchdown Kings" value={myTeamName} onChange={e => setMyTeamName(e.target.value)} />
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
                {[13, 14, 15, 16, 17].map(n => <option key={n} value={n}>{n} Rounds</option>)}
              </select>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.col}>
              <label style={s.label}>Scoring</label>
              <select style={s.select} value={scoringFormat} onChange={e => setScoringFormat(e.target.value)}>
                <option value="half_ppr">0.5 PPR</option>
                <option value="ppr">PPR</option>
                <option value="std">Standard</option>
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
            {ROSTER_SLOTS.map(slot => (
              <div key={slot} style={s.rosterItem}>
                <span style={s.rosterLabel}>{slot}</span>
                <input
                  style={s.rosterInput}
                  type="number"
                  min="0"
                  max="10"
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
