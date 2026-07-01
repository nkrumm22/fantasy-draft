import React, { useState, useEffect } from 'react';
import { getSportColors } from '../sportTheme';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#718096', marginBottom: '0.4rem' },
  weekTabs: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  weekBtn: { padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  weekBtnDone: { borderColor: '#1a2d48', color: '#63b3ed' },
  actionBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  btnGhost: { padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer' },
  btnScore: { padding: '0.4rem 0.9rem', background: '#1a2d48', border: '1px solid #2c4a6e', borderRadius: '8px', color: '#63b3ed', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' },
  genBtn: { padding: '0.55rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  error: { color: '#fc8181', fontSize: '0.82rem' },
  successMsg: { color: '#68d391', fontSize: '0.82rem' },
};

export default function Schedule({ leagueId, token, isCommissioner, onMatchupClick, sport = 'nfl' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [msg, setMsg] = useState('');
  const [week, setWeek] = useState(1);
  const [liveScores, setLiveScores] = useState({});
  const [showH2H, setShowH2H] = useState(false);
  const [h2hData, setH2hData] = useState(null);

  const sc = getSportColors(sport);

  const load = () => {
    setLoading(true);
    return fetch(`/api/leagues/${leagueId}/schedule`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); return d; })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [leagueId]);

  useEffect(() => {
    const fetchLive = () => {
      fetch(`/api/leagues/${leagueId}/live-scores/${week}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const map = {};
          for (const m of d.matchups) map[m.matchupId] = m;
          setLiveScores(map);
        })
        .catch(() => {});
    };
    fetchLive();
    const timer = setInterval(fetchLive, 60000);
    return () => clearInterval(timer);
  }, [leagueId, week, token]);

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
      const fresh = await load();
      if (fresh?.weeks) {
        const sorted = Object.keys(fresh.weeks).map(Number).sort((a, b) => a - b);
        const next = sorted.find(w => w > week && !(fresh.weeks[w] || []).every(m => m.status === 'complete'));
        if (next) { setWeek(next); setMsg(''); }
      }
    } catch { setMsg('Connection error'); }
    finally { setScoring(false); }
  };

  const loadH2H = () => {
    fetch(`/api/leagues/${leagueId}/h2h`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setH2hData).catch(() => {});
  };

  const toggleH2H = () => {
    if (!showH2H && !h2hData) loadH2H();
    setShowH2H(v => !v);
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
        <button
          style={{ ...s.btnGhost, marginLeft: isCommissioner ? '0' : 'auto', ...(showH2H ? { borderColor: sc.accent, color: sc.soft } : {}) }}
          onClick={toggleH2H}
        >
          H2H Records
        </button>
        {msg && (
          <span style={msg.includes('scored') ? s.successMsg : s.error}>{msg}</span>
        )}
      </div>

      <div style={s.weekTabs}>
        {weekNums.map(w => {
          const done = (weeks[w] || []).every(m => m.status === 'complete');
          const isActive = week === w;
          return (
            <button
              key={w}
              style={{
                ...s.weekBtn,
                ...(isActive
                  ? { background: sc.dim, border: `1px solid ${sc.accent}`, color: sc.soft }
                  : done ? s.weekBtnDone : {}),
              }}
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

      {showH2H && (
        <div style={{ marginBottom: '1.25rem', background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #2d3748', fontSize: '0.72rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Head-to-Head Records
          </div>
          {!h2hData
            ? <div style={{ padding: '1rem', color: '#4a5568', fontSize: '0.85rem' }}>Loading...</div>
            : h2hData.pairs?.length === 0
            ? <div style={{ padding: '1rem', color: '#4a5568', fontSize: '0.85rem' }}>No completed matchups yet</div>
            : h2hData.pairs?.map((pair, i) => {
              const aIsMe = pair.teamA.id === h2hData.myTeamId;
              const bIsMe = pair.teamB.id === h2hData.myTeamId;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 1rem', borderBottom: '1px solid #1a2035', fontSize: '0.875rem' }}>
                  <span style={{ flex: 1, fontWeight: aIsMe ? '700' : '400', color: aIsMe ? sc.soft : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pair.teamA.name}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: pair.teamA.wins > pair.teamB.wins ? '#68d391' : pair.teamA.wins < pair.teamB.wins ? '#fc8181' : '#e2e8f0', minWidth: '40px', textAlign: 'center' }}>
                    {pair.teamA.wins}-{pair.teamA.losses}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#4a5568', fontWeight: '700' }}>vs</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: pair.teamB.wins > pair.teamA.wins ? '#68d391' : pair.teamB.wins < pair.teamA.wins ? '#fc8181' : '#e2e8f0', minWidth: '40px', textAlign: 'center' }}>
                    {pair.teamB.wins}-{pair.teamB.losses}
                  </span>
                  <span style={{ flex: 1, fontWeight: bIsMe ? '700' : '400', color: bIsMe ? sc.soft : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {pair.teamB.name}
                  </span>
                </div>
              );
            })
          }
        </div>
      )}

      <div>
        {currentWeekMatchups.map(m => {
          const isMyMatchup = m.home_team_id === myTeamId || m.away_team_id === myTeamId;
          const isDone = m.status === 'complete';
          const isLive = m.status === 'in_progress';
          const live = liveScores[m.id];
          const hs = isDone ? (parseFloat(m.home_score) || 0) : (live ? live.home.score : 0);
          const as_ = isDone ? (parseFloat(m.away_score) || 0) : (live ? live.away.score : 0);
          const hasScores = isDone || (live && (live.home.score > 0 || live.away.score > 0));
          const homeWon = isDone && hs > as_;
          const awayWon = isDone && as_ > hs;

          const cardStyle = {
            background: isMyMatchup
              ? `linear-gradient(90deg, ${sc.dim} 0%, #0f1420 40%)`
              : '#0f1420',
            border: `1px solid ${isMyMatchup ? sc.accent : '#2d3748'}`,
            borderLeft: `3px solid ${isMyMatchup ? sc.accent : '#2d3748'}`,
            borderRadius: '10px',
            padding: '0.9rem 1.25rem',
            marginBottom: '0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: onMatchupClick ? 'pointer' : 'default',
            animation: 'fade-in-up 0.25s ease both',
          };

          return (
            <div key={m.id} style={cardStyle} onClick={() => onMatchupClick?.(m.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  color: m.home_team_id === myTeamId ? sc.soft : homeWon ? '#68d391' : isDone ? '#718096' : '#e2e8f0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                }}>
                  {m.home_team_name}
                  {m.home_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: sc.soft, marginLeft: '0.4rem', opacity: 0.8 }}>(you)</span>}
                </span>
              </div>

              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: homeWon ? '#68d391' : isDone ? '#718096' : '#e2e8f0',
                minWidth: '3.5rem',
                textAlign: 'center',
                animation: hasScores && isLive ? 'score-pop 0.4s ease' : 'none',
              }}>
                {hasScores ? hs.toFixed(1) : '–'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', minWidth: '2rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#4a5568', fontWeight: '700' }}>vs</span>
                {isLive && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#f6ad55',
                    animation: 'pulse-live 1.4s ease-in-out infinite',
                    display: 'block',
                  }} />
                )}
                {isDone && (
                  <span style={{ fontSize: '0.55rem', fontWeight: '700', color: '#63b3ed', background: '#1a2d48', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                    FINAL
                  </span>
                )}
              </div>

              <div style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: awayWon ? '#68d391' : isDone ? '#718096' : '#e2e8f0',
                minWidth: '3.5rem',
                textAlign: 'center',
                animation: hasScores && isLive ? 'score-pop 0.4s ease' : 'none',
              }}>
                {hasScores ? as_.toFixed(1) : '–'}
              </div>

              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.92rem',
                  fontWeight: '700',
                  color: m.away_team_id === myTeamId ? sc.soft : awayWon ? '#68d391' : isDone ? '#718096' : '#e2e8f0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                }}>
                  {m.away_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: sc.soft, marginRight: '0.4rem', opacity: 0.8 }}>(you)</span>}
                  {m.away_team_name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
