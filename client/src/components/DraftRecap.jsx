import React, { useState, useEffect } from 'react';

const POS_COLORS = { QB: ['#2c4a6e','#63b3ed'], RB: ['#1a3a1a','#68d391'], WR: ['#44337a','#b794f4'], TE: ['#744210','#f6ad55'], K: ['#1a2d48','#90cdf4'], DST: ['#2d1515','#fc8181'] };

const s = {
  wrapper: { padding: '1.25rem 0' },
  toggleRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  toggleBtn: { padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '20px', color: '#718096', fontSize: '0.8rem', cursor: 'pointer' },
  toggleBtnActive: { background: '#1a2d48', border: '1px solid #2c4a6e', color: '#63b3ed' },
  roundHeader: { fontSize: '0.72rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.6rem 0 0.3rem', borderTop: '1px solid #2d3748', marginTop: '0.5rem' },
  pickRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid #1a2035' },
  pickNum: { fontSize: '0.72rem', color: '#4a5568', fontWeight: '700', minWidth: '2rem', textAlign: 'right' },
  posBadge: { fontSize: '0.62rem', fontWeight: '700', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  playerName: { fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0', flex: 1 },
  nflTeam: { fontSize: '0.72rem', color: '#718096' },
  teamName: { fontSize: '0.75rem', color: '#a0aec0', minWidth: '7rem', textAlign: 'right' },
  steal: { fontSize: '0.7rem', fontWeight: '700', color: '#68d391', background: '#1a3a1a', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 },
  reach: { fontSize: '0.7rem', fontWeight: '700', color: '#fc8181', background: '#2d1515', padding: '0.1rem 0.4rem', borderRadius: '4px', flexShrink: 0 },
  teamCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.75rem' },
  teamCardTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.6rem' },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '2rem 0', textAlign: 'center' },
  legend: { display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#718096', flexWrap: 'wrap' },
};

function PickRow({ pick, showTeam }) {
  const [bg, fg] = POS_COLORS[pick.position] || ['#1a2035', '#718096'];
  const isSteal = pick.adpDiff != null && pick.adpDiff >= 8;
  const isReach = pick.adpDiff != null && pick.adpDiff <= -8;
  return (
    <div style={s.pickRow}>
      <span style={s.pickNum}>#{pick.pickNumber}</span>
      <span style={{ ...s.posBadge, background: bg, color: fg }}>{pick.position}</span>
      <div style={{ flex: 1 }}>
        <div style={s.playerName}>{pick.playerName}</div>
        <div style={s.nflTeam}>{pick.nflTeam}{pick.adp != null ? ` · ADP ${pick.adp.toFixed(0)}` : ''}</div>
      </div>
      {isSteal && <span style={s.steal}>+{pick.adpDiff} steal</span>}
      {isReach && <span style={s.reach}>{pick.adpDiff} reach</span>}
      {showTeam && <span style={s.teamName}>{pick.teamName}</span>}
    </div>
  );
}

export default function DraftRecap({ leagueId, token, myTeamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('rounds'); // 'rounds' | 'teams'

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/draft-recap`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); } else { setData(d); } setLoading(false); })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [leagueId]);

  if (loading) return <div style={s.empty}>Loading draft recap...</div>;
  if (error) return <div style={{ ...s.empty, color: '#fc8181' }}>{error}</div>;
  if (!data || data.picks.length === 0) return <div style={s.empty}>No draft picks found. The draft may not have started yet.</div>;

  const { picks, numTeams, totalRounds } = data;

  if (view === 'teams') {
    const byTeam = {};
    picks.forEach(p => {
      if (!byTeam[p.teamName]) byTeam[p.teamName] = [];
      byTeam[p.teamName].push(p);
    });
    return (
      <div style={s.wrapper}>
        <div style={s.toggleRow}>
          <button style={{ ...s.toggleBtn, ...(view === 'rounds' ? s.toggleBtnActive : {}) }} onClick={() => setView('rounds')}>By Round</button>
          <button style={{ ...s.toggleBtn, ...(view === 'teams' ? s.toggleBtnActive : {}) }} onClick={() => setView('teams')}>By Team</button>
        </div>
        <div style={s.legend}>
          <span style={{ color: '#68d391' }}>+N steal</span> = picked later than ADP (good value) &nbsp;
          <span style={{ color: '#fc8181' }}>−N reach</span> = picked earlier than ADP
        </div>
        {Object.entries(byTeam).sort(([a], [b]) => a.localeCompare(b)).map(([teamName, teamPicks]) => (
          <div key={teamName} style={s.teamCard}>
            <div style={s.teamCardTitle}>{teamName}</div>
            {teamPicks.map(p => <PickRow key={p.pickNumber} pick={p} showTeam={false} />)}
          </div>
        ))}
      </div>
    );
  }

  // By round view
  const byRound = {};
  picks.forEach(p => {
    if (!byRound[p.round]) byRound[p.round] = [];
    byRound[p.round].push(p);
  });
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  return (
    <div style={s.wrapper}>
      <div style={s.toggleRow}>
        <button style={{ ...s.toggleBtn, ...(view === 'rounds' ? s.toggleBtnActive : {}) }} onClick={() => setView('rounds')}>By Round</button>
        <button style={{ ...s.toggleBtn, ...(view === 'teams' ? s.toggleBtnActive : {}) }} onClick={() => setView('teams')}>By Team</button>
      </div>
      <div style={s.legend}>
        <span style={{ color: '#68d391' }}>+N steal</span> = picked later than ADP (good value) &nbsp;
        <span style={{ color: '#fc8181' }}>−N reach</span> = picked earlier than ADP
      </div>
      {rounds.map(r => (
        <div key={r}>
          <div style={s.roundHeader}>Round {r}</div>
          {byRound[r].map(p => <PickRow key={p.pickNumber} pick={p} showTeam={true} />)}
        </div>
      ))}
    </div>
  );
}
