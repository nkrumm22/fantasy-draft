import React, { useState } from 'react';

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', gap: '2rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '640px' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#68d391', marginBottom: '0.25rem', textAlign: 'center' },
  subtitle: { color: '#718096', textAlign: 'center', marginBottom: '2rem' },
  label: { display: 'block', fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  select: { width: '100%', padding: '0.6rem 2rem 0.6rem 0.8rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', marginBottom: '1.2rem', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a5568' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem center' },
  teamRow: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' },
  input: { flex: 1, padding: '0.6rem 0.8rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem' },
  teamNum: { width: '1.8rem', textAlign: 'center', color: '#718096', fontSize: '0.85rem' },
  btn: { width: '100%', padding: '0.85rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '1.5rem', letterSpacing: '0.05em' },
  btnBack: { background: 'transparent', border: 'none', color: '#718096', fontSize: '0.85rem', cursor: 'pointer', padding: '0.25rem 0', marginBottom: '0.5rem' },
  section: { marginBottom: '1.5rem' },
};

const DEFAULT_NAMES = ['Team 1','Team 2','Team 3','Team 4','Team 5','Team 6','Team 7','Team 8','Team 9','Team 10','Team 11','Team 12'];

export default function Setup({ onComplete, onBack, token }) {
  const [draftName, setDraftName] = useState('');
  const [numTeams, setNumTeams] = useState(10);
  const [numRounds, setNumRounds] = useState(15);
  const [scoringFormat, setScoringFormat] = useState('half_ppr');
  const [teamNames, setTeamNames] = useState(DEFAULT_NAMES.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const changeTeamCount = (n) => {
    const count = parseInt(n);
    setNumTeams(count);
    setTeamNames(prev => {
      const next = [...prev];
      while (next.length < count) next.push(`Team ${next.length + 1}`);
      return next.slice(0, count);
    });
  };

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/draft/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ teams: teamNames, rounds: numRounds, scoringFormat, name: draftName }),
      });
      if (!res.ok) throw new Error('Failed to start draft');
      const data = await res.json();
      onComplete(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      <div>
        {onBack && <button style={s.btnBack} onClick={onBack}>← My Drafts</button>}
        <h1 style={s.title}>Fantasy Football Draft</h1>
        <p style={s.subtitle}>Configure your snake draft below</p>
      </div>
      <div style={s.card}>
        <div style={s.section}>
          <label style={s.label}>Draft Name</label>
          <input
            style={{ ...s.input, width: '100%', marginBottom: '1.2rem', boxSizing: 'border-box' }}
            placeholder="e.g. Work League 2026"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
          />
        </div>

        <div style={s.section}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Teams</label>
              <select style={s.select} value={numTeams} onChange={e => changeTeamCount(e.target.value)}>
                {[8,10,12,14,16].map(n => <option key={n} value={n}>{n} Teams</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Rounds</label>
              <select style={s.select} value={numRounds} onChange={e => setNumRounds(parseInt(e.target.value))}>
                {[10,12,14,15,16,17,18].map(n => <option key={n} value={n}>{n} Rounds</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Scoring</label>
              <select style={s.select} value={scoringFormat} onChange={e => setScoringFormat(e.target.value)}>
                <option value="ppr">PPR</option>
                <option value="half_ppr">0.5 PPR</option>
                <option value="std">Standard</option>
              </select>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <label style={s.label}>Team Names (draft order)</label>
          {teamNames.map((name, i) => (
            <div key={i} style={s.teamRow}>
              <span style={s.teamNum}>{i + 1}</span>
              <input
                style={s.input}
                value={name}
                onChange={e => {
                  const next = [...teamNames];
                  next[i] = e.target.value;
                  setTeamNames(next);
                }}
                placeholder={`Team ${i + 1}`}
              />
            </div>
          ))}
        </div>

        {error && <p style={{ color: '#fc8181', marginTop: '0.5rem' }}>{error}</p>}
        <button style={s.btn} onClick={handleStart} disabled={loading}>
          {loading ? 'Starting...' : `Start Draft (${numTeams} teams, ${numRounds} rounds)`}
        </button>
      </div>
    </div>
  );
}
