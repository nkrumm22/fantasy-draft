import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#718096', marginBottom: '0.4rem' },
  weekTabs: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' },
  weekBtn: { padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' },
  weekBtnActive: { background: '#1a3a1a', border: '1px solid #276749', color: '#68d391' },
  matchupCard: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  matchupCardHighlight: { borderColor: '#276749' },
  teamCol: { flex: 1 },
  teamName: { fontSize: '0.92rem', fontWeight: '700', color: '#e2e8f0' },
  teamNameYou: { color: '#68d391' },
  score: { fontSize: '1.1rem', fontWeight: '800', color: '#e2e8f0', minWidth: '2.5rem', textAlign: 'center' },
  vs: { fontSize: '0.75rem', color: '#4a5568', fontWeight: '700', textAlign: 'center', minWidth: '1.5rem' },
  statusChip: { fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '20px', marginLeft: '0.5rem' },
  genBtn: { padding: '0.55rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  error: { color: '#fc8181', fontSize: '0.82rem', marginTop: '0.5rem' },
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
  const [error, setError] = useState('');
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
    setGenerating(true);
    setError('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Failed to generate'); return; }
      load();
    } catch { setError('Connection error'); }
    finally { setGenerating(false); }
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
          {isCommissioner ? 'Generate a schedule once the draft is complete.' : 'The commissioner will generate the schedule after the draft.'}
        </div>
        {isCommissioner && (
          <>
            <button style={s.genBtn} onClick={generateSchedule} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Schedule'}
            </button>
            {error && <div style={s.error}>{error}</div>}
          </>
        )}
      </div>
    );
  }

  const currentWeekMatchups = weeks[week] || [];

  return (
    <div style={s.wrapper}>
      {isCommissioner && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={{ ...s.genBtn, background: 'transparent', border: '1px solid #2d3748', color: '#718096', fontSize: '0.8rem' }} onClick={generateSchedule} disabled={generating}>
            {generating ? 'Regenerating...' : 'Regenerate Schedule'}
          </button>
          {error && <span style={s.error}>{error}</span>}
        </div>
      )}

      <div style={s.weekTabs}>
        {weekNums.map(w => (
          <button
            key={w}
            style={{ ...s.weekBtn, ...(week === w ? s.weekBtnActive : {}) }}
            onClick={() => setWeek(w)}
          >
            Wk {w}
          </button>
        ))}
      </div>

      <div>
        {currentWeekMatchups.map(m => {
          const isMyMatchup = m.home_team_id === myTeamId || m.away_team_id === myTeamId;
          const status = MATCHUP_STATUS[m.status] || MATCHUP_STATUS.scheduled;
          return (
            <div key={m.id} style={{ ...s.matchupCard, ...(isMyMatchup ? s.matchupCardHighlight : {}) }}>
              <div style={s.teamCol}>
                <span style={{ ...s.teamName, ...(m.home_team_id === myTeamId ? s.teamNameYou : {}) }}>
                  {m.home_team_name}
                </span>
                {m.home_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: '#68d391', marginLeft: '0.4rem' }}>(you)</span>}
              </div>
              <div style={s.score}>{m.status === 'scheduled' ? '–' : m.home_score.toFixed(1)}</div>
              <div style={s.vs}>vs</div>
              <div style={s.score}>{m.status === 'scheduled' ? '–' : m.away_score.toFixed(1)}</div>
              <div style={{ ...s.teamCol, textAlign: 'right' }}>
                <span style={{ ...s.teamName, ...(m.away_team_id === myTeamId ? s.teamNameYou : {}) }}>
                  {m.away_team_name}
                </span>
                {m.away_team_id === myTeamId && <span style={{ fontSize: '0.7rem', color: '#68d391', marginLeft: '0.4rem' }}>(you)</span>}
              </div>
              <span style={{ ...s.statusChip, background: status.bg, color: status.color }}>{status.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
