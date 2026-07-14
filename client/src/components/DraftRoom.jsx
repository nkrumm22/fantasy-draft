import React, { useState, useEffect, useRef, useMemo } from 'react';
import PlayerList from './PlayerList';
import TeamRoster from './TeamRoster';
import DraftBoard from './DraftBoard';
import PlayerStats from './PlayerStats';
import TradeSimulator from './TradeSimulator';
import DraftRecap from './DraftRecap';
import useIsMobile from '../hooks/useIsMobile';
import PulseLogo from './PulseLogo';
import Term from './Term';
import { POSITION_TARGETS, getPositionCounts } from '../sportNeeds';

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

const DRAFT_ELITE_CONFIG = {
  nfl: { eliteTopN: { QB: 6, RB: 14, WR: 14, TE: 5 }, scarcityWarn: { QB: 2, RB: 3, WR: 3, TE: 2 } },
  nba: { eliteTopN: {}, scarcityWarn: {} },
  mlb: { eliteTopN: {}, scarcityWarn: {} },
  nhl: { eliteTopN: {}, scarcityWarn: {} },
  epl: { eliteTopN: {}, scarcityWarn: {} },
};

// Draft-time roster targets reuse the same position-needs config as the trade
// analyzer, plus draft-only concepts (elite-player thresholds, scarcity alerts).
const SPORT_DRAFT_CONFIG = Object.fromEntries(
  Object.keys(POSITION_TARGETS).map(sport => [sport, {
    posOrder: POSITION_TARGETS[sport].order,
    targets: POSITION_TARGETS[sport].targets,
    ...DRAFT_ELITE_CONFIG[sport],
  }])
);

function getRecommendedPlayer(available, teamRoster, sportConfig) {
  if (available.length === 0) return null;
  const hasAdp = available.some(p => p.adp != null);
  if (!hasAdp) return available[0];
  const targets = sportConfig?.targets || SPORT_DRAFT_CONFIG.nfl.targets;
  const posCount = getPositionCounts(teamRoster);
  const scored = available.filter(p => p.adp != null).map(p => {
    const target = targets[p.position] || 1;
    const have = posCount[p.position] || 0;
    const needFactor = have < target ? (target - have) / target : 0.1;
    return { player: p, score: needFactor / p.adp };
  });
  if (scored.length === 0) return available[0];
  return scored.sort((a, b) => b.score - a.score)[0].player;
}

// Plain-language explanation for why a player is the recommended pick —
// helps beginners understand the "Best Pick" call instead of just trusting it.
function getRecommendReason(player, teamRoster, sportConfig) {
  if (!player) return '';
  const targets = sportConfig?.targets || SPORT_DRAFT_CONFIG.nfl.targets;
  const target = targets[player.position];
  const have = teamRoster.filter(p => p?.position === player.position).length;
  if (player.adp == null) return 'Highest-rated player left on the board';
  if (target && have < target) {
    const remaining = target - have;
    return `Best available ${player.position} by ADP — you still need ${remaining} more`;
  }
  return `Best player left by ADP among your roster's needs`;
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
  const availableRef = useRef([]);
  const myQueueRef = useRef([]);

  const [myQueue, setMyQueue] = useState([]);

  const isLiveDraft = !!draft.liveDraft;
  const myTeamIndex = draft.myTeamIndex ?? null; // null = commissioner / solo (can pick for all)
  const isOwner = draft.isOwner !== false;

  const isDone = draft.currentPickIndex >= draft.pickOrder.length;
  const current = !isDone ? draft.pickOrder[draft.currentPickIndex] : null;

  // Post-draft recap countdown (20s auto-return to league, skipped for admin read-only view)
  const [recapCountdown, setRecapCountdown] = useState(null);
  useEffect(() => {
    if (isDone && !readOnly && recapCountdown === null) setRecapCountdown(20);
  }, [isDone]);
  useEffect(() => {
    if (recapCountdown === null || recapCountdown <= 0) return;
    const t = setTimeout(() => setRecapCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [recapCountdown]);
  useEffect(() => {
    if (recapCountdown === 0) onExit();
  }, [recapCountdown]);

  // In live mode: it's "your turn" only when the current pick belongs to your team (or you're the commissioner)
  const isMyTurn = !isDone && current !== null && (!isLiveDraft || isOwner || myTeamIndex === current.teamIndex);
  const canPick = !readOnly && isMyTurn;

  const sport = draft.sport || 'nfl';
  const sportCfg = SPORT_DRAFT_CONFIG[sport] || SPORT_DRAFT_CONFIG.nfl;

  const availableSet = new Set(draft.availablePlayers);
  const pickedIds = new Set(draft.picks.map(p => p.playerId));
  let available = allPlayers.filter(p => availableSet.has(p.id));
  // Fallback: if available is empty but players loaded and set is empty, show all non-picked
  if (available.length === 0 && allPlayers.length > 0 && availableSet.size === 0) {
    available = allPlayers.filter(p => !pickedIds.has(p.id));
  }

  const getRosterForTeam = (teamIndex) =>
    draft.picks
      .filter(pick => pick.teamIndex === teamIndex)
      .map(pick => ({ ...allPlayers.find(p => p.id === pick.playerId), round: pick.round, pickNumber: pick.pickNumber }));

  const currentRoster = current ? getRosterForTeam(current.teamIndex) : [];
  const recommended = !isDone ? getRecommendedPlayer(available, currentRoster, sportCfg) : null;
  const recommendReason = recommended ? getRecommendReason(recommended, currentRoster, sportCfg) : '';

  const timerSeconds = draft.timerSeconds || 0;
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const currentPickNum = draft.currentPickIndex + 1;

  // Poll for state updates in live draft mode
  useEffect(() => {
    if (!isLiveDraft || !draft.dbId || isDone) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/draft/${draft.dbId}/state`, { headers: authHeaders });
        if (!res.ok) return;
        const newState = await res.json();
        if (newState.currentPickIndex !== draft.currentPickIndex) {
          setDraft(prev => ({ ...prev, ...newState }));
          const nextPick = newState.pickOrder[newState.currentPickIndex];
          if (nextPick) setSelectedTeam(nextPick.teamIndex);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [isLiveDraft, draft.dbId, draft.currentPickIndex, isDone]);

  // Elite player sets per position (top-N by ADP — NFL only, other sports have no ADP)
  const eliteIds = useMemo(() => {
    const result = {};
    for (const [pos, n] of Object.entries(sportCfg.eliteTopN)) {
      result[pos] = new Set(
        allPlayers.filter(p => p.position === pos && p.adp != null).sort((a, b) => a.adp - b.adp).slice(0, n).map(p => p.id)
      );
    }
    return result;
  }, [allPlayers, sportCfg]);

  const scarcityAlerts = useMemo(() => {
    const alerts = [];
    for (const [pos, ids] of Object.entries(eliteIds)) {
      const warnAt = sportCfg.scarcityWarn[pos];
      if (!warnAt) continue;
      const remaining = available.filter(p => ids.has(p.id)).length;
      if (remaining > 0 && remaining <= warnAt) alerts.push({ pos, remaining });
    }
    return alerts;
  }, [available, eliteIds, sportCfg]);

  const handlePick = async (player) => {
    const url = isLiveDraft && draft.dbId ? `/api/draft/${draft.dbId}/pick` : '/api/draft/pick';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ playerId: player.id }),
    });
    if (res.ok) {
      const newDraft = await res.json();
      setDraft(prev => ({ ...prev, ...newDraft }));
      const nextPick = newDraft.pickOrder[newDraft.currentPickIndex];
      if (nextPick) setSelectedTeam(nextPick.teamIndex);
    }
  };

  const handleUndo = async () => {
    const url = isLiveDraft && draft.dbId ? `/api/draft/${draft.dbId}/pick` : '/api/draft/pick';
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders });
    if (res.ok) { const data = await res.json(); setDraft(prev => ({ ...prev, ...data })); }
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
  availableRef.current = draft.availablePlayers || [];
  myQueueRef.current = myQueue;

  // Load draft queue for auto-pick (live league drafts only)
  const leagueId = draft.leagueId || null;
  useEffect(() => {
    if (!leagueId || !isLiveDraft || !token) return;
    fetch(`/api/leagues/${leagueId}/queue`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(q => { if (Array.isArray(q)) setMyQueue(q.map(p => p.id)); })
      .catch(() => {});
  }, [leagueId, isLiveDraft, token]);

  useEffect(() => {
    if (!timerSeconds || isDone || !canPick) { setTimeLeft(null); return; }
    setTimeLeft(timerSeconds);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          // Auto-pick: check queue first, fall back to recommended
          const avail = new Set(availableRef.current);
          const queuedId = myQueueRef.current.find(pid => avail.has(pid));
          const pickTarget = queuedId
            ? { id: queuedId }
            : recommendedRef.current;
          if (pickTarget) handlePickRef.current(pickTarget);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [draft.currentPickIndex, timerSeconds, isDone, canPick]);

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
    onPick: canPick ? handlePick : null,
    isDone: isDone || !canPick,
    recommendedId: recommended?.id,
    onPlayerClick: setSelectedPlayer,
    selectedId: selectedPlayer?.id,
    currentPickNum: isDone ? null : currentPickNum,
  };

  // Which team to show position needs for: my team in live mode, on-the-clock team in solo mode
  const trackerTeamIndex = (isLiveDraft && myTeamIndex !== null) ? myTeamIndex : (current?.teamIndex ?? 0);
  const trackerRoster = getRosterForTeam(trackerTeamIndex);
  const posCount = {};
  trackerRoster.forEach(p => { if (p?.position) posCount[p.position] = (posCount[p.position] || 0) + 1; });

  const PositionTracker = () => {
    const trackerLabel = isLiveDraft && myTeamIndex !== null ? 'My needs' : `${draft.teams[trackerTeamIndex]} needs`;
    const roundsLeft = draft.pickOrder.length - draft.currentPickIndex;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 1.25rem', background: '#080c16', borderBottom: '1px solid #1a2035', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: '0.65rem', color: '#4a5568', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.15rem', whiteSpace: 'nowrap' }}>
          <Term term="needs">{trackerLabel}:</Term>
        </span>
        {sportCfg.posOrder.map(pos => {
          const target = sportCfg.targets[pos];
          const have = posCount[pos] || 0;
          const diff = target - have;
          const urgent = diff > 0 && diff >= roundsLeft / draft.teams.length;
          const bg   = diff <= 0 ? '#0d2b1a' : urgent ? '#2d1010' : diff === 1 ? '#2d2007' : '#1a1420';
          const color = diff <= 0 ? '#68d391' : urgent ? '#fc8181' : diff === 1 ? '#f6ad55' : '#a0aec0';
          return (
            <span key={pos} style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '4px', background: bg, color, whiteSpace: 'nowrap' }}>
              {pos} {have}/{target}
            </span>
          );
        })}
      </div>
    );
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

  // Post-draft: show full-screen recap (for both league drafts with leagueId and solo drafts)
  if (isDone) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.25rem', background: '#1c3a2a', borderBottom: '2px solid #276749', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#68d391' }}>Draft Complete!</div>
            <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.1rem' }}>
              {draft.teams.length} teams &bull; {draft.rounds} rounds &bull; {draft.picks.length} picks
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {recapCountdown !== null && recapCountdown > 0 && (
              <span style={{ fontSize: '0.8rem', color: '#718096' }}>Returning to league in {recapCountdown}s</span>
            )}
            <button
              style={{ padding: '0.5rem 1.1rem', background: '#276749', border: '1px solid #48bb78', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' }}
              onClick={onExit}
            >
              {readOnly ? '← Admin' : 'Back to League'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {draft.leagueId
            ? <DraftRecap leagueId={draft.leagueId} token={token} myTeamId={null} />
            : (
              <div style={{ padding: '2rem', color: '#718096', textAlign: 'center' }}>
                Draft complete! {draft.picks.length} picks made across {draft.rounds} rounds.
              </div>
            )
          }
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={s.root}>
        {showTrade && <TradeSimulator draft={draft} getRosterForTeam={getRosterForTeam} onClose={() => setShowTrade(false)} />}
        {/* Mobile header */}
        <div style={{ ...s.header, ...s.headerMobile }}>
          <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={onExit}>
            {readOnly ? '← Admin' : '← Drafts'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PulseLogo size={20} />
            <span style={{ ...s.title, fontSize: '1rem' }}>Pulse League</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {readOnly && <span style={{ fontSize: '0.7rem', color: '#f6ad55', padding: '0.25rem 0.5rem', background: '#2d2000', borderRadius: '6px' }}>Admin</span>}
            {isLiveDraft && !isOwner && <span style={{ fontSize: '0.7rem', color: '#63b3ed', padding: '0.25rem 0.5rem', background: '#1a2d48', borderRadius: '6px' }}>Live</span>}
            {draft.picks.length > 0 && (
              <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#63b3ed', borderColor: '#2c4a6e' }} onClick={() => setShowTrade(true)}>Trade</button>
            )}
            {isOwner && draft.picks.length > 0 && (
              <button style={{ ...s.btnSmall, fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={handleUndo}>Undo</button>
            )}
            {isOwner && (
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
              {isLiveDraft && !isDone && (
            <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '20px',
              background: canPick ? '#1a3a1a' : '#1a2035', color: canPick ? '#68d391' : '#718096' }}>
              {canPick ? "Your turn!" : `Waiting for ${draft.teams[current.teamIndex]}…`}
            </span>
          )}
          {recommended && canPick && (
                <button
                  title={recommendReason}
                  style={{ padding: '0.35rem 0.75rem', background: '#744210', border: '1px solid #975a16', borderRadius: '6px', color: '#f6ad55', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handlePick(recommended)}
                >
                  Pick: {recommended.name.split(' ').pop()}
                </button>
              )}
            </div>
            {recommended && canPick && (
              <div style={{ fontSize: '0.68rem', color: '#718096', marginTop: '0.3rem' }}>{recommendReason}</div>
            )}
          </div>
        )}

        <ScarcityBar />
        {!isDone && <PositionTracker />}
        {/* Mobile content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mobileTab === 'players' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <PlayerList {...sharedPlayerListProps} />
              <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} sport={sport} />
            </div>
          )}
          {mobileTab === 'team' && (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <TeamRoster {...sharedRosterProps} />
              </div>
              <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} sport={sport} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PulseLogo size={24} />
          <span style={s.title}>Pulse League</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isOwner && draft.picks.length > 0 && <button style={s.btnSmall} onClick={handleUndo}>Undo Pick</button>}
          {draft.picks.length > 0 && (
            <button style={{ ...s.btnSmall, color: '#63b3ed', borderColor: '#2c4a6e' }} onClick={() => setShowTrade(true)}>Trade Sim</button>
          )}
          {isOwner && !isLiveDraft && (
            <label style={{ ...s.btnSmall, cursor: 'pointer' }}>
              Import Stats
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          )}
          {readOnly && <span style={{ fontSize: '0.75rem', color: '#f6ad55', padding: '0.3rem 0.6rem', background: '#2d2000', borderRadius: '6px' }}>Admin View</span>}
          {isLiveDraft && !isOwner && <span style={{ fontSize: '0.75rem', color: '#63b3ed', padding: '0.3rem 0.6rem', background: '#1a2d48', borderRadius: '6px' }}>Live Draft</span>}
          <button style={s.btnSmall} onClick={onExit}>{readOnly ? '← Admin' : '← League'}</button>
          {isOwner && <button style={s.btnDanger} onClick={handleDelete}>Delete Draft</button>}
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
              <div style={{ fontSize: '0.68rem', color: '#718096', marginTop: '0.15rem' }}>{recommendReason}</div>
            </div>
          )}
          {timerPct !== null && (
            <div>
              <div style={s.pickLabel}>Time</div>
              <div style={{ ...s.pickValue, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{timeLeft}s</div>
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isLiveDraft && (
              <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.25rem 0.75rem', borderRadius: '20px',
                background: canPick ? '#1a3a1a' : '#1a2035', color: canPick ? '#68d391' : '#718096' }}>
                {canPick ? "Your turn!" : `Waiting for ${draft.teams[current.teamIndex]}…`}
              </span>
            )}
            {recommended && canPick && (
              <button
                title={recommendReason}
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
      {!isDone && <PositionTracker />}
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
          <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} scoringFormat={draft.scoringFormat || 'ppr'} sport={sport} />
        </div>
      </div>
    </div>
  );
}
