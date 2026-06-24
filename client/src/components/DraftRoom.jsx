import React, { useState } from 'react';
import PlayerList from './PlayerList';
import TeamRoster from './TeamRoster';
import DraftBoard from './DraftBoard';
import PlayerStats from './PlayerStats';

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: '#141824', borderBottom: '1px solid #2d3748', flexShrink: 0 },
  title: { fontSize: '1.1rem', fontWeight: '700', color: '#68d391' },
  pickBanner: { padding: '0.75rem 1.25rem', background: '#1a2035', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 },
  pickLabel: { fontSize: '0.8rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' },
  pickValue: { fontSize: '1rem', fontWeight: '700', color: '#e2e8f0' },
  teamHighlight: { color: '#68d391' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  left: { width: '340px', flexShrink: 0, borderRight: '1px solid #2d3748', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  center: { flex: 1, overflow: 'auto' },
  right: { width: '260px', flexShrink: 0, borderLeft: '1px solid #2d3748', overflow: 'auto' },
  tabs: { display: 'flex', borderBottom: '1px solid #2d3748' },
  tab: { flex: 1, padding: '0.6rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', color: '#718096', border: 'none', background: 'transparent' },
  tabActive: { color: '#68d391', borderBottom: '2px solid #68d391' },
  btnSmall: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '6px', color: '#a0aec0', fontSize: '0.8rem', cursor: 'pointer' },
  btnDanger: { padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.8rem', cursor: 'pointer' },
  complete: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#68d391' },
};

const TABS = ['Players', 'Board'];

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

export default function DraftRoom({ draft, setDraft, allPlayers, onReset }) {
  const [tab, setTab] = useState('Players');
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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

  const handlePick = async (player) => {
    const res = await fetch('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id }),
    });
    if (res.ok) setDraft(await res.json());
  };

  const handleUndo = async () => {
    const res = await fetch('/api/draft/pick', { method: 'DELETE' });
    if (res.ok) setDraft(await res.json());
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.title}>Fantasy Draft</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {draft.picks.length > 0 && <button style={s.btnSmall} onClick={handleUndo}>Undo Pick</button>}
          <button style={s.btnDanger} onClick={onReset}>Reset Draft</button>
        </div>
      </div>

      {!isDone ? (
        <div style={s.pickBanner}>
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {recommended && (
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

      <div style={s.body}>
        <div style={s.left}>
          <div style={s.tabs}>
            {TABS.map(t => (
              <button key={t} style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {tab === 'Players' && (
              <PlayerList players={available} onPick={handlePick} isDone={isDone} recommendedId={recommended?.id} onPlayerClick={setSelectedPlayer} />
            )}
            {tab === 'Board' && (
              <DraftBoard draft={draft} allPlayers={allPlayers} />
            )}
          </div>
        </div>

        <div style={{ ...s.center, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <TeamRoster
              draft={draft}
              allPlayers={allPlayers}
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              getRosterForTeam={getRosterForTeam}
            />
          </div>
          <PlayerStats player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        </div>
      </div>
    </div>
  );
}
