import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#718096', marginBottom: '0.4rem' },
  seedBtn: { padding: '0.55rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  actionBar: { display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' },
  btn: { padding: '0.45rem 0.9rem', background: '#1a2d48', border: '1px solid #2c4a6e', borderRadius: '8px', color: '#63b3ed', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' },
  msg: { fontSize: '0.82rem' },
  bracket: { display: 'flex', gap: '2rem', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: '1rem' },
  roundCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '200px' },
  roundLabel: { fontSize: '0.7rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' },
  matchCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', overflow: 'hidden' },
  matchRow: { display: 'flex', alignItems: 'center', padding: '0.6rem 0.85rem', gap: '0.5rem', borderBottom: '1px solid #1a2035' },
  matchRowLast: { borderBottom: 'none' },
  seed: { fontSize: '0.65rem', color: '#4a5568', fontWeight: '700', width: '16px', flexShrink: 0 },
  teamLabel: { flex: 1, fontSize: '0.85rem', fontWeight: '600', color: '#a0aec0' },
  teamLabelWin: { color: '#68d391' },
  teamLabelMe: { color: '#63b3ed' },
  score: { fontSize: '0.9rem', fontWeight: '800', color: '#e2e8f0', minWidth: '2.5rem', textAlign: 'right' },
  scoreWin: { color: '#68d391' },
  byeRow: { padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: '#4a5568', fontStyle: 'italic' },
  tbd: { color: '#4a5568' },
  champBadge: { textAlign: 'center', padding: '0.5rem', background: '#1a3a1a', borderTop: '1px solid #276749', fontSize: '0.75rem', color: '#68d391', fontWeight: '700' },
};

const ROUND_NAMES = { 3: 'Quarterfinals', 2: 'Semifinals', 1: 'Championship' };

export default function Playoffs({ leagueId, token, isCommissioner, settings, myTeamId: propMyTeamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [scoreWeek, setScoreWeek] = useState(settings?.playoffStartWeek || 15);
  const [msg, setMsg] = useState('');

  const auth = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/playoffs`, { headers: auth })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  const seed = async () => {
    if (!window.confirm('Generate playoff bracket from current standings?')) return;
    setSeeding(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/playoffs/seed`, { method: 'POST', headers: auth });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed'); return; }
      setMsg(`Bracket seeded — ${d.playoffTeams} teams, starting week ${d.startWeek}`);
      load();
    } catch { setMsg('Connection error'); }
    finally { setSeeding(false); }
  };

  const score = async () => {
    setScoring(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/playoffs/score/${scoreWeek}`, { method: 'POST', headers: auth });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed'); return; }
      setMsg(`Week ${scoreWeek} playoff scores updated`);
      load();
    } catch { setMsg('Connection error'); }
    finally { setScoring(false); }
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading playoffs...</div>;

  const matchups = data?.matchups || [];
  const myTeamId = data?.myTeamId || propMyTeamId;

  if (matchups.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyTitle}>Playoff bracket not set up yet</div>
        <div style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '1rem' }}>
          {isCommissioner
            ? 'Generate the bracket once the regular season is complete.'
            : 'The commissioner will generate the playoff bracket after the regular season.'}
        </div>
        {isCommissioner && (
          <button style={s.seedBtn} onClick={seed} disabled={seeding}>
            {seeding ? 'Generating...' : 'Generate Playoff Bracket'}
          </button>
        )}
        {msg && <div style={{ ...s.msg, color: '#fc8181', marginTop: '0.5rem' }}>{msg}</div>}
      </div>
    );
  }

  // Group by round (highest round number first = earliest games)
  const rounds = [...new Set(matchups.map(m => m.round))].sort((a, b) => b - a);

  // Find champion
  const final = matchups.find(m => m.round === 1);
  const champion = final?.status === 'complete' ? (final.winner_id === final.home_team_id ? final.home_name : final.away_name) : null;

  // Determine available weeks for scoring
  const weeks = [...new Set(matchups.map(m => m.week))].sort((a, b) => a - b);

  return (
    <div style={s.wrapper}>
      {isCommissioner && (
        <div style={s.actionBar}>
          <button style={{ ...s.seedBtn, background: 'transparent', border: '1px solid #2d3748', color: '#718096', fontSize: '0.82rem', padding: '0.4rem 0.85rem' }} onClick={seed} disabled={seeding}>
            {seeding ? 'Reseeding...' : 'Reseed Bracket'}
          </button>
          <select
            value={scoreWeek}
            onChange={e => setScoreWeek(parseInt(e.target.value))}
            style={{ padding: '0.4rem 0.7rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.82rem', colorScheme: 'dark' }}
          >
            {weeks.map(w => <option key={w} value={w}>Week {w}</option>)}
          </select>
          <button style={s.btn} onClick={score} disabled={scoring}>
            {scoring ? 'Scoring...' : `Score Week ${scoreWeek}`}
          </button>
          {msg && <span style={{ ...s.msg, color: msg.includes('updated') ? '#68d391' : '#fc8181' }}>{msg}</span>}
        </div>
      )}

      {champion && (
        <div style={{ background: '#1a3a1a', border: '1px solid #276749', borderRadius: '10px', padding: '1rem', textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#68d391', fontWeight: '700', marginBottom: '0.25rem' }}>CHAMPION</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e2e8f0' }}>{champion}</div>
        </div>
      )}

      <div style={s.bracket}>
        {rounds.map(round => {
          const roundMatchups = matchups.filter(m => m.round === round).sort((a, b) => a.bracket_slot - b.bracket_slot);
          return (
            <div key={round} style={s.roundCol}>
              <div style={s.roundLabel}>{ROUND_NAMES[round] || `Round ${round}`}</div>
              {roundMatchups.map(m => {
                const isDone = m.status === 'complete';
                const hs = parseFloat(m.home_score) || 0;
                const as_ = parseFloat(m.away_score) || 0;
                const homeWon = isDone && m.winner_id === m.home_team_id;
                const awayWon = isDone && m.winner_id === m.away_team_id;

                return (
                  <div key={m.id} style={s.matchCard}>
                    {m.home_team_id ? (
                      <div style={s.matchRow}>
                        <span style={s.seed}>{m.bracket_slot * 2 - 1}</span>
                        <span style={{ ...s.teamLabel, ...(homeWon ? s.teamLabelWin : {}), ...(m.home_team_id === myTeamId ? s.teamLabelMe : {}) }}>
                          {m.home_name}
                        </span>
                        {isDone && <span style={{ ...s.score, ...(homeWon ? s.scoreWin : {}) }}>{hs.toFixed(1)}</span>}
                      </div>
                    ) : (
                      <div style={s.matchRow}><span style={{ ...s.teamLabel, ...s.tbd }}>TBD</span></div>
                    )}
                    {m.away_team_id ? (
                      <div style={{ ...s.matchRow, ...s.matchRowLast }}>
                        <span style={s.seed}>{m.bracket_slot * 2}</span>
                        <span style={{ ...s.teamLabel, ...(awayWon ? s.teamLabelWin : {}), ...(m.away_team_id === myTeamId ? s.teamLabelMe : {}) }}>
                          {m.away_name}
                        </span>
                        {isDone && <span style={{ ...s.score, ...(awayWon ? s.scoreWin : {}) }}>{as_.toFixed(1)}</span>}
                      </div>
                    ) : (
                      <div style={{ ...s.matchRow, ...s.matchRowLast }}><span style={{ ...s.teamLabel, ...s.tbd }}>TBD</span></div>
                    )}
                    {isDone && round === 1 && m.winner_id && (
                      <div style={s.champBadge}>Champion</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
