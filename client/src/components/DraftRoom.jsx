import React, { useState, useEffect, useRef, useMemo } from 'react';
import PlayerList from './PlayerList';
import TeamRoster from './TeamRoster';
import DraftBoard from './DraftBoard';
import PlayerStats from './PlayerStats';
import TradeSimulator from './TradeSimulator';
import useIsMobile from '../hooks/useIsMobile';

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: '#141824', borderBottom: '1px solid #2d3748', flexShrink: 0 },
  headerMobile: { padding: '0.6rem 0.85rem' },
  title: { fontSize: '1.1rem', fontWeight: '700', color: '#68d391' },
  pickBanner: { padding: '0.75rem 1.25rem', background: '#1a2035', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 },
  pickLabel: { fontSize: '0.8rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' },
  pickValue: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  teamHighlight: { color: '#68d391' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  left: { width: '340px', flexShrink: 0, borderRight: '1px solid #2d3748', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  center: { flex: 1, overflow: 'auto' },
  tabs: { display: 'flex', borderBottom: '1px solid #2d3748' },
  tab: { flex: 1, padding: '0.6rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: '#718096', border: 'none', background: 'transparent' },
  tabActive: { color: '#68d391', borderBottom: '2px solid #68d391' },
  btnSmall: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#a0aec0', fontSize: '0.8rem', cursor: 'pointer' },
  btnDanger: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.8rem', cursor: 'pointer' },
  bottomNav: { display: 'flex', borderTop: '1px solid #2d3748', background: '#141824', flexShrink: 0 },
  bottomNavBtn: { flex: 1, padding: '0.75rem 0.5rem', background: 'transparent', border: 'none', color: '#718096', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' },
  bottomNavBtnActive: { color: '#68d391', borderTop: '2px solid #68d391' },
  bottomNavIcon: { fontSize: '1.1rem' },
};

const ROSTER_TARGETS = { QB: 2, RB: 4, WR: 4, TE: 2, DST: 1, K: 1 };

function getRecommendedPlayer(available, teamRoster) {
  if (available.length === 0) return null;
  const posCount = {};
  teamRoster.forEach(p => { posCount[p.position] = (posCount[p.position] || 0) + 1; });
  const scored = available.map(p => {
    const target = ROSTER_TARGETS[p.position] || 1;
    const have = posCount[p.position] || 0;
    const needFactor = have < target ? (target - have) / target : 0.1;
    return { player: p, score: needFactor / p.adp };
  });
  return scored.sort((a, b) => b.score - a.score)[0].player;
}

export default function DraftRoom({ draft, setDraft, allPlayers, token, onExit, readOnly = false }) {
  const [tab, setTab] = useState('Players');
  const [mobileTab, setMobileTab] = useState('players');
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showTrade, setShowTrade] = useState(false);
  const isMobile = useIsMobile();
  const handlePickRef = useRef(null);
  const recommendedRef = useRef(null);

  const isDone = draft.currentPickIndex >= draft.pickOrder.length;
  const current = !isDone ? draft.pickOrder[draft.currentPickIndex] : null;

  const availableSet = new Set(draft.availablePlayers);
  const available = allPlayers.filter(p => availableSet.has(p.id));

  const getRosterForTeam = (teamIndex) =>
    draft.picks
      .filter(pick => pick.teamIndex === teamIndex)
      .map(pick => ({ ...allPlayers.find(p => p.id === pick.playerId), round: pick.round, pickNumber: pick.pickNumber }));

  const currentRoster = current ? getRosterForTeam(current.teamIndex) : [];
  const recommended = !isDone ? getRecommendedPlayer(available, currentRoster) : null;

  const timerSeconds = draft.timerSeconds || 0;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const currentPickNum = draft.currentPickIndex + 1;

  // Elite player sets per position (top-N by ADP from the full player pool)
  const eliteIds = useMemo(() => {
    const topN = { QB: 6, RB: 14, WR: 14, TE: 5 };
    const result = {};
    for (const [pos, n] of Object.entries(topN)) {
      result[pos] = new Set(
        allPlayers.filter(p => p.position === pos).sort((a, b) => a.adp - b.adp).slice(0, n).map(p => p.id)
      );
    }
    return result;
  }, [allPlayers]);

  const scarcityAlerts = useMemo(() => {
    const alerts = [];
    const warn = { QB: 2, RB: 3, WR: 3, TE: 2 };
    for (const [pos, ids] of Object.entries(eliteIds)) {
      const remaining = available.filter(p => ids.has(p.id)).length;
      if (remaining > 0 && remaining <= warn[pos]) alerts.push({ pos, remaining });
    }
    return alerts;
  }, [available, eliteIds]);

  const handlePick = async (player) => {
    const res = await fetch('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ playerId: player.id }),
    });
    if (res.ok) {
      const newDraft = await res.json();
      setDraft(newDraft);
      const nextPick = newDraft.pickOrder[newDraft.currentPickIndex];
      if (nextPick) setSelectedTeam(nextPick.teamIndex);
    }
  };

  const handleUndo = async () => {
    const res = await fetch('/api/draft/pick', { method: 'DELETE', headers: authHeaders });
    if (res.ok) setDraft(await res.json());
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const csv = await file.text();
    const res = await fetch('/api/stats/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    if (res.ok) alert(`Imported stats for ${data.imported} players.`);
    else alert('Import failed: ' + (data.error || 'Unknown error'));
  };

  const handleDelete = async () => {
    if (!draft.dbId) return onExit();
    if (!window.confirm('Delete this draft permanently?')) return;
    await fetch(`/api/drafts/${draft.dbId}`, { method: 'DELETE', headers: authHeaders });
    onExit();
  };

  // Refs must be assigned after function declarations to avoid temporal dead zone
  handlePickRef.current = handlePick;
  recommendedRef.current = recommended;

  useEffect(() => {
    if (!timerSeconds || isDone || readOnly) { setTimeLeft(null); return; }
    setTimeLeft(timerSeconds);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          if (recommendedRef.current) handlePickRef.current(recommendedRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [draft.currentPickIndex, timerSeconds, isDone, readOnly]);

  const sharedRosterProps = {
    draft, allPlayers, selectedTeam,
    onSelectTeam: setSelectedTeam,
    getRosterForTeam,
    onPlayerClick: setSelectedPlayer,
    selectedPlayerId: selectedPlayer?.id,
  };

  const timerPct = timerSeconds > 0 && timeLeft !== null ? timeLeft / timerSeconds : null;
  const timerColor = timerPct === null ? null : timerPct > 0.5 ? '#68d391' : timerPct > 0.25 ? '#f6ad55' : '#fc8181';

  const sharedPlayerListProps = {
    players: available,
    onPick: readOnly ? null : handlePick,
    isDone: isDone || readOnly,
    recommendedId: recommended?.id,
    onPlayerClick: setSelectedPlayer,
    selectedId: selectedPlayer?.id,
    currentPickNum: isDone ? null : currentPickNum,
  };

  const ScarcityBar = () => scarcityAlerts.length === 0 ? null : (
    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 1.25rem', background: '#0f1420', borderBottom: '1px solid #2d3748', flexWrap: 'wrap', flexShrink: 0 }}>
      <span style={{ fontSize: '0.7rem', color: '#718096', alignSelf: 'center', marginRight: '0.25rem' }}>⚠ Scarcity:</span>
      {scarcityAlerts.map(({ pos, remaining }) => (
        <span key={pos} style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.55rem', borderRadius: '20px', background: remaining === 1 ? '#2d1515' : '#2d2007', color: remaining === 1 ? '#fc8181' : '#f6ad55' }}>
          {remaining === 1 ? 'Last' : remaining} elite {pos} left
        </span>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div style={s.root}>
        {showTrade && <TradeSimulator draft={draft} getRosterForTeam={getRosterForTeam} onClose={() => setShowTrade(false)} />}
        {/* Mobile header */}
        <div style={{ ...s.header, ...s.headerMobile }}>
          <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={onExit}>
            {readOnly ? '← Admin' : '← Drafts'}
          </button>
          <span style={{ ...s.title, fontSize: '1rem' }}>Fantasy Draft</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {readOnly && <span style={{ fontSize: '0.7rem', color: '#f6ad55', padding: '0.25rem 0.5rem', background: '#2d2000', borderRadius: '6px' }}>Admin</span>}
            {draft.picks.length > 0 && (
              <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#63b3ed', borderColor: '#2c4a6e' }} onClick={() => setShowTrade(true)}>Trade</button>
            )}
            {!readOnly && draft.picks.length > 0 && (
              <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={handleUndo}>Undo</button>
            )}
            {!readOnly && (
              <button style={{ ...s.btnDanger, fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={handleDelete}>Delete</button>
            )}
          </div>
        </div>

        {/* Mobile pick banner */}
        {isDone ? (
          <div style={{ padding: '0.6rem 1rem', background: '#22543d', borderBottom: '1px solid #276749', textAlign: 'center', color: '#68d391', fontWeight: '700', fontSize: '0.9rem' }}>
            Draft Complete!
          </div>
        ) : (
          <div style={{ padding: '0.6rem 0.85rem', background: '#1a2035', borderBottom: '1px solid #2d3748', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            {timerPct !== null && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: timerColor, width: `${timerPct * 100}%`, transition: 'width 1s linear, background 0.3s' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#718096' }}>
                Pick #{draft.currentPickIndex + 1} &bull; Round {current.round}/{draft.rounds}
              </span>
              <span style={{ fontSize: '0.75rem', color: timerPct !== null ? timerColor : '#718096', fontVariantNumeric: 'tabular-nums' }}>
                {timerPct !== null ? `${timeLeft}s` : `${draft.pickOrder.length - draft.currentPickIndex} remaining`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#68d391' }}>
                {draft.teams[current.teamIndex]}
              </span>
              {recommended && !readOnly && (
                <button
                  style={{ padding: '0.35rem 0.75rem', background: '#744210', border: '1px solid #975a16', borderRadius: '6px', color: '#f6ad55', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handlePick(recommended)}
                >
                  Pick: {recommended.name.split(' ').pop()}
                </button>
              )}
            </div>
          </div>
        )}

        <ScarcityBar />
        {/* Mobile content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileTab === 'players' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <PlayerList {...sharedPlayerListProps} />
              <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} />
            </div>
          )}
          {mobileTab === 'team' && (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <TeamRoster {...sharedRosterProps} />
              </div>
              <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} />
            </div>
          )}
          {mobileTab === 'board' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <DraftBoard draft={draft} allPlayers={allPlayers} />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={s.bottomNav}>
          {[
            { key: 'players', icon: '👤', label: 'Players' },
            { key: 'team', icon: '📋', label: 'My Team' },
            { key: 'board', icon: '📊', label: 'Board' },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              style={{ ...s.bottomNavBtn, ...(mobileTab === key ? s.bottomNavBtnActive : {}) }}
              onClick={() => setMobileTab(key)}
            >
              <span style={s.bottomNavIcon}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div style={s.root}>
      {showTrade && <TradeSimulator draft={draft} getRosterForTeam={getRosterForTeam} onClose={() => setShowTrade(false)} />}
      <div style={s.header}>
        <span style={s.title}>Fantasy Draft</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!readOnly && draft.picks.length > 0 && <button style={s.btnSmall} onClick={handleUndo}>Undo Pick</button>}
          {draft.picks.length > 0 && (
            <button style={{ ...s.btnSmall, color: '#63b3ed', borderColor: '#2c4a6e' }} onClick={() => setShowTrade(true)}>Trade Sim</button>
          )}
          {!readOnly && (
            <label style={{ ...s.btnSmall, cursor: 'pointer' }}>
              Import Stats
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          )}
          {readOnly && <span style={{ fontSize: '0.75rem', color: '#f6ad55', padding: '0.3rem 0.6rem', background: '#2d2000', borderRadius: '6px' }}>Admin View</span>}
          <button style={s.btnSmall} onClick={onExit}>{readOnly ? '← Admin' : 'My Drafts'}</button>
          {!readOnly && <button style={s.btnDanger} onClick={handleDelete}>Delete Draft</button>}
        </div>
      </div>

      {!isDone ? (
        <div style={{ ...s.pickBanner, position: 'relative', overflow: 'hidden' }}>
          {timerPct !== null && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: timerColor, width: `${timerPct * 100}%`, transition: 'width 1s linear, background 0.3s' }} />
          )}
          <div>
            <div style={s.pickLabel}>Current Pick</div>
            <div style={s.pickValue}>#{draft.currentPickIndex + 1}</div>
          </div>
          <div>
            <div style={s.pickLabel}>Round</div>
            <div style={s.pickValue}>{current.round} of {draft.rounds}</div>
          </div>
          <div>
            <div style={s.pickLabel}>On the Clock</div>
            <div style={{ ...s.pickValue, ...s.teamHighlight }}>{draft.teams[current.teamIndex]}</div>
          </div>
          {recommended && (
            <div>
              <div style={s.pickLabel}>Best Pick</div>
              <div style={{ ...s.pickValue, color: '#f6ad55' }}>{recommended.name}</div>
            </div>
          )}
          {timerPct !== null && (
            <div>
              <div style={s.pickLabel}>Time</div>
              <div style={{ ...s.pickValue, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}s</div>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {recommended && !readOnly && (
              <button
                style={{ padding: '0.4rem 0.9rem', background: '#744210', border: '1px solid #975a16', borderRadius: '6px', color: '#f6ad55', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => handlePick(recommended)}
              >
                Pick Recommended
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>
              {draft.pickOrder.length - draft.currentPickIndex} picks remaining
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 1.25rem', background: '#22543d', borderBottom: '1px solid #276749', textAlign: 'center', color: '#68d391', fontWeight: '700' }}>
          Draft Complete!
        </div>
      )}

      <ScarcityBar />
      <div style={s.body}>
        <div style={s.left}>
          <div style={s.tabs}>
            {['Players', 'Board'].map(t => (
              <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {tab === 'Players' && <PlayerList {...sharedPlayerListProps} />}
            {tab === 'Board' && <DraftBoard draft={draft} allPlayers={allPlayers} />}
          </div>
        </div>

        <div style={{ ...s.center, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <TeamRoster {...sharedRosterProps} />
          </div>
          <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} />
        </div>
      </div>
    </div>
  );
}
