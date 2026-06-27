import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#718096', marginBottom: '0.4rem' },
  weekTabs: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  weekBtn: { padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  weekBtnActive: { background: '#1a3a1a', border: '1px solid #276749', color: '#68d391' },
  weekBtnDone: { borderColor: '#1a2d48', color: '#63b3ed' },
  matchupCard: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  matchupCardHighlight: { borderColor: '#276749' },
  teamCol: { flex: 1 },
  teamName: { fontSize: '0.92rem', fontWeight: '700', color: '#e2e8f0' },
  teamNameYou: { color: '#68d391' },
  teamNameWin: { color: '#68d391' },
  teamNameLoss: { color: '#718096' },
  score: { fontSize: '1.1rem', fontWeight: '800', color: '#e2e8f0', minWidth: '2.8rem', textAlign: 'center' },
  scoreWin: { color: '#68d391' },
  scoreLoss: { color: '#718096' },
  vs: { fontSize: '0.75rem', color: '#4a5568', fontWeight: '700', textAlign: 'center', minWidth: '1.5rem' },
  statusChip: { fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px', flexShrink: 0 },
  actionBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  btnGhost: { padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer' },
  btnScore: { padding: '0.4rem 0.9rem', background: '#1a2d48', border: '1px solid #2c4a6e', borderRadius: '8px', color: '#63b3ed', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' },
  genBtn: { padding: '0.55rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  error: { color: '#fc8181', fontSize: '0.82rem' },
  successMsg: { color: '#68d391', fontSize: '0.82rem' },
};

const MATCHUP_STATUS = {
  scheduled: { label: 'Upcoming', bg: '#1a2035', color: '#718096' },
  in_progress: { label: 'Live', bg: '#744210', color: '#f6ad55' },
  complete: { label: 'Final', bg: '#1a2d48', color: '#63b3ed' },
};

export default function Schedule({ leagueId, token, isCommissioner }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [msg, setMsg] = useState('');
  const [week, setWeek] = useState(1);

  const load = () => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/schedule`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  const generateSchedule = async () => {
    setGenerating(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/schedule`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed to generate'); return; }
      load();
    } catch { setMsg('Connection error'); }
    finally { setGenerating(false); }
  };

  const scoreWeek = async () => {
    setScoring(true); setMsg('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/score/${week}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Failed to score'); return; }
      setMsg(`Week ${week} scored!`);
      load();
    } catch { setMsg('Connection error'); }
    finally { setScoring(false); }
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading schedule...</div>;

  const weeks = data?.weeks || {};
  const weekNums = Object.keys(weeks).map(Number).sort((a, b) => a - b);
  const myTeamId = data?.myTeamId;

  if (weekNums.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyTitle}>No schedule yet</div>
        <div style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '1rem' }}>
          {isCommissioner
            ? 'Schedule is auto-generated when the draft starts. If missing, regenerate below.'
            : 'The commissioner will start the draft to generate the schedule.'}
        </div>
        {isCommissioner && (
          <button style={s.genBtn} onClick={generateSchedule} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Schedule'}
          </button>
        )}
        {msg && <div style={{ ...s.error, marginTop: '0.5rem' }}>{msg}</div>}
      </div>
    );
  }

  const currentWeekMatchups = weeks[week] || [];
  const weekIsDone = currentWeekMatchups.every(m => m.status === 'complete');

  return (
    <div style={s.wrapper}>
      <div style={s.actionBar}>
        {isCommissioner && (
          <>
            <button style={s.btnGhost} onClick={generateSchedule} disabled={generating}>
              {generating ? 'Regenerating...' : 'Regenerate Schedule'}
            </button>
            <button style={s.btnScore} onClick={scoreWeek} disabled={scoring}>
              {scoring ? 'Scoring...' : `Score Week ${week}`}
            </button>
          </>
        )}
        {msg && (
          <span style={msg.includes('scored') ? s.successMsg : s.error}>{msg}</span>
        )}
      </div>

      <div style={s.weekTabs}>
        {weekNums.map(w => {
          const done = (weeks[w] || []).every(m => m.status === 'complete');
          return (
            <button
              key={w}
              style={{ ...s.weekBtn, ...(week === w ? s.weekBtnActive : done ? s.weekBtnDone : {}) }}
              onClick={() => { setWeek(w); setMsg(''); }}
            >
              Wk {w}
            </button>
          );
        })}
      </div>

      {weekIsDone && (
        <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: '0.75rem' }}>
          Week {week} — Final
        </div>
      )}

      <div>
        {currentWeekMatchups.map(m => {
          const isMyMatchup = m.home_team_id === myTeamId || m.away_team_id === myTeamId;
          const isDone = m.status === 'complete';
          const hs = parseFloat(m.home_score) || 0;
          const as_ = parseFloat(m.away_score) || 0;
          const homeWon = isDone && hs > as_;
          const awayWon = isDone && as_ > hs;
          const status = MATCHUP_STATUS[m.status] || MATCHUP_STATUS.scheduled;

          return (
            <div key={m.id} style={{ ...s.matchupCard, ...(isMyMatchup ? s.matchupCardHighlight : {}) }}>
              <div style={s.teamCol}>
                <span style={{ ...s.teamName, ...(m.home_team_id === myTeamId ? s.teamNameYou : homeWon ? s.teamNameWin : isDone ? s.teamNameLoss : {}) }}>
                  {m.home_team_name}
                </span>
                {m.home_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: '#68d391', marginLeft: '0.4rem' }}>(you)</span>}
              </div>
              <div style={{ ...s.score, ...(homeWon ? s.scoreWin : isDone ? s.scoreLoss : {}) }}>
                {isDone ? hs.toFixed(1) : '–'}
              </div>
              <div style={s.vs}>vs</div>
              <div style={{ ...s.score, ...(awayWon ? s.scoreWin : isDone ? s.scoreLoss : {}) }}>
                {isDone ? as_.toFixed(1) : '–'}
              </div>
              <div style={{ ...s.teamCol, textAlign: 'right' }}>
                {m.away_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: '#68d391', marginRight: '0.4rem' }}>(you)</span>}
                <span style={{ ...s.teamName, ...(m.away_team_id === myTeamId ? s.teamNameYou : awayWon ? s.teamNameWin : isDone ? s.teamNameLoss : {}) }}>
                  {m.away_team_name}
                </span>
              </div>
              <span style={{ ...s.statusChip, background: status.bg, color: status.color }}>{status.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
