// Per-sport "healthy roster" position targets — how many of each position a
// well-built team wants. Shared by the draft room's pick recommender and the
// trade analyzer's needs-impact check, so both agree on what "a need" means.
export const POSITION_TARGETS = {
  nfl: { order: ['QB', 'RB', 'WR', 'TE', 'DST', 'K'], targets: { QB: 2, RB: 4, WR: 4, TE: 2, DST: 1, K: 1 } },
  nba: { order: ['PG', 'SG', 'SF', 'PF', 'C'], targets: { PG: 2, SG: 2, SF: 2, PF: 2, C: 2 } },
  mlb: { order: ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'], targets: { P: 4, C: 2, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 4 } },
  nhl: { order: ['C', 'LW', 'RW', 'D', 'G'], targets: { C: 3, LW: 3, RW: 3, D: 4, G: 2 } },
  epl: { order: ['GKP', 'DEF', 'MID', 'FWD'], targets: { GKP: 2, DEF: 5, MID: 5, FWD: 3 } },
};

export function getPositionCounts(roster) {
  const counts = {};
  (roster || []).forEach(p => { if (p?.position) counts[p.position] = (counts[p.position] || 0) + 1; });
  return counts;
}

// Compares a roster's position counts before/after gaining and losing a set of
// players against the sport's targets — the core of the trade needs-impact check.
export function needsImpact(roster, sport, gaining = [], losing = []) {
  const cfg = POSITION_TARGETS[sport] || POSITION_TARGETS.nfl;
  const before = getPositionCounts(roster);
  const gainCounts = getPositionCounts(gaining);
  const loseCounts = getPositionCounts(losing);
  const positions = new Set([...Object.keys(before), ...Object.keys(gainCounts), ...Object.keys(loseCounts)]);
  return [...positions]
    .filter(pos => cfg.targets[pos] != null)
    .map(pos => {
      const b = before[pos] || 0;
      const a = b - (loseCounts[pos] || 0) + (gainCounts[pos] || 0);
      return { pos, before: b, after: a, target: cfg.targets[pos] };
    })
    .sort((x, y) => cfg.order.indexOf(x.pos) - cfg.order.indexOf(y.pos));
}
