import React, { useState, useEffect } from 'react';

const POS_COLOR = {
  QB: '#9f7aea', RB: '#68d391', WR: '#63b3ed', TE: '#f6ad55', DST: '#fc8181', K: '#b794f4',
  PG: '#63b3ed', SG: '#76e4f7', SF: '#68d391', PF: '#f6ad55', C: '#fc8181',
  P: '#9f7aea', '1B': '#68d391', '2B': '#63b3ed', '3B': '#f6ad55', SS: '#fc8181', OF: '#76e4f7', UTIL: '#b794f4',
  LW: '#68d391', RW: '#63b3ed', D: '#f6ad55', G: '#fc8181',
  GKP: '#9f7aea', DEF: '#68d391', MID: '#63b3ed', FWD: '#fc8181',
};

const s = {
  topBar: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  weekLabel: { fontSize: '0.8rem', color: '#718096', fontWeight: '600', textTransform: 'uppercase' },
  weekSelect: { padding: '0.4rem 0.7rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', colorScheme: 'dark' },
  note: { fontSize: '0.78rem', color: '#4a5568', marginLeft: 'auto' },
  grid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', overflow: 'hidden' },
  matchRow: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', padding: '1rem 1.25rem', alignItems: 'start' },
  teamSide: { minWidth: 0 },
  teamRight: { minWidth: 0 },
  teamName: { fontSize: '0.9rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  teamNameRight: { textAlign: 'right' },
  teamProj: { fontSize: '1.6rem', fontWeight: '800', color: '#68d391', lineHeight: 1.1 },
  teamProjRight: { textAlign: 'right' },
  vsWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '0.5rem', gap: '0.3rem' },
  vsLabel: { fontSize: '0.8rem', color: '#4a5568', fontWeight: '700' },
  noLineup: { fontSize: '0.75rem', color: '#4a5568', fontStyle: 'italic' },
  divider: { borderTop: '1px solid #1a2035' },
  players: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' },
  playerCol: { padding: '0.5rem 1.25rem' },
  playerColRight: { padding: '0.5rem 1.25rem', borderLeft: '1px solid #1a2035' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.2rem 0' },
  playerRowRight: { display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.2rem 0', flexDirection: 'row-reverse' },
  posBadge: { fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '3px', color: '#000', flexShrink: 0 },
  playerName: { fontSize: '0.78rem', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  playerProj: { fontSize: '0.75rem', fontWeight: '700', color: '#68d391', flexShrink: 0 },
  projZero: { color: '#4a5568' },
  winBadge: { fontSize: '0.65rem', fontWeight: '800', padding: '0.1rem 0.4rem', borderRadius: '10px', background: '#1a3a1a', color: '#68d391', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '3rem', color: '#4a5568', fontSize: '0.875rem' },
};

export default function Projections({ leagueId, token, settings }) {
  const [week, setWeek] = useState(settings?.currentWeek || 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/projections/${week}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leagueId, week, token]);

  return (
    <div>
      <div style={s.topBar}>
        <span style={s.weekLabel}>Week</span>
        <select style={s.weekSelect} value={week} onChange={e => setWeek(parseInt(e.target.value))}>
          {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <span style={s.note}>Based on Sleeper projections · Update lineups to refresh</span>
      </div>

      {loading ? (
        <div style={{ color: '#4a5568', padding: '2rem' }}>Loading projections...</div>
      ) : !data?.matchups?.length ? (
        <div style={s.empty}>No matchups found for this week. Generate a schedule first.</div>
      ) : (
        <div style={s.grid}>
          {data.matchups.map(m => {
            const homeWins = m.home.projected > m.away.projected;
            const awayWins = m.away.projected > m.home.projected;
            return (
              <div key={m.matchupId} style={s.card}>
                <div style={s.matchRow}>
                  <div style={s.teamSide}>
                    <div style={{ ...s.teamName, ...(m.home.teamId === data.myTeamId ? { color: '#63b3ed' } : {}) }}>
                      {m.home.teamName}
                      {m.home.teamId === data.myTeamId && <span style={{ fontSize: '0.65rem', color: '#63b3ed', marginLeft: '0.35rem' }}>(you)</span>}
                    </div>
                    <div style={s.teamProj}>{m.home.projected.toFixed(1)}</div>
                    {!m.home.lineupSet && <div style={s.noLineup}>No lineup set</div>}
                  </div>
                  <div style={s.vsWrap}>
                    <span style={s.vsLabel}>vs</span>
                    {homeWins && <span style={s.winBadge}>← projected</span>}
                    {awayWins && <span style={s.winBadge}>projected →</span>}
                  </div>
                  <div style={{ ...s.teamSide, ...s.teamRight }}>
                    <div style={{ ...s.teamName, ...s.teamNameRight, ...(m.away.teamId === data.myTeamId ? { color: '#63b3ed' } : {}) }}>
                      {m.away.teamName}
                      {m.away.teamId === data.myTeamId && <span style={{ fontSize: '0.65rem', color: '#63b3ed', marginLeft: '0.35rem' }}>(you)</span>}
                    </div>
                    <div style={{ ...s.teamProj, ...s.teamProjRight }}>{m.away.projected.toFixed(1)}</div>
                    {!m.away.lineupSet && <div style={{ ...s.noLineup, textAlign: 'right' }}>No lineup set</div>}
                  </div>
                </div>

                {(m.home.starters.length > 0 || m.away.starters.length > 0) && (
                  <>
                    <div style={s.divider} />
                    <div style={s.players}>
                      <div style={s.playerCol}>
                        {m.home.starters.map(p => (
                          <div key={p.id} style={s.playerRow}>
                            <span style={{ ...s.posBadge, background: POS_COLOR[p.position] || '#4a5568' }}>{p.position}</span>
                            <span style={s.playerName} title={p.name}>{p.name}</span>
                            <span style={{ ...s.playerProj, ...(p.projected === 0 ? s.projZero : {}) }}>
                              {p.projected > 0 ? p.projected.toFixed(1) : '–'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={s.playerColRight}>
                        {m.away.starters.map(p => (
                          <div key={p.id} style={s.playerRowRight}>
                            <span style={{ ...s.posBadge, background: POS_COLOR[p.position] || '#4a5568' }}>{p.position}</span>
                            <span style={s.playerName} title={p.name}>{p.name}</span>
                            <span style={{ ...s.playerProj, ...(p.projected === 0 ? s.projZero : {}) }}>
                              {p.projected > 0 ? p.projected.toFixed(1) : '–'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
