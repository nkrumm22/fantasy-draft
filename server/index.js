const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const players = require('./players.json');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory draft state
let draftState = null;

function buildSnakeOrder(numTeams, numRounds) {
  const order = [];
  for (let round = 0; round < numRounds; round++) {
    const roundPicks = Array.from({ length: numTeams }, (_, i) => i);
    if (round % 2 === 1) roundPicks.reverse();
    roundPicks.forEach(teamIndex => order.push({ round: round + 1, teamIndex }));
  }
  return order;
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'fantasy-draft-app' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// Sleeper cache: built once at startup, used for all stats requests
let sleeperNameMap = null;  // normalized name → sleeper player_id
let sleeperSeasonStats = null;  // sleeper player_id → aggregated season stats

function normalizeName(name) {
  return name.toLowerCase().replace(/['.]/g, '').replace(/\s+/g, ' ').trim();
}

async function buildSleeperCache() {
  console.log('Building Sleeper stats cache...');
  const [playerList, ...weeklyStats] = await Promise.all([
    fetchJSON('https://api.sleeper.app/v1/players/nfl'),
    ...Array.from({ length: 18 }, (_, i) =>
      fetchJSON(`https://api.sleeper.app/v1/stats/nfl/regular/2025/${i + 1}`)
    ),
  ]);

  // Build name → sleeper_id map from player list
  sleeperNameMap = {};
  for (const [id, p] of Object.entries(playerList)) {
    if (p.full_name) sleeperNameMap[normalizeName(p.full_name)] = id;
  }

  // Aggregate weekly stats into season totals
  sleeperSeasonStats = {};
  for (const week of weeklyStats) {
    for (const [id, stats] of Object.entries(week)) {
      if (!sleeperSeasonStats[id]) sleeperSeasonStats[id] = {};
      for (const [k, v] of Object.entries(stats)) {
        if (typeof v === 'number') {
          sleeperSeasonStats[id][k] = (sleeperSeasonStats[id][k] || 0) + v;
        }
      }
    }
  }
  console.log('Sleeper stats cache ready.');
}

// Kick off cache build at startup (non-blocking)
buildSleeperCache().catch(err => console.error('Sleeper cache build failed:', err));

let sleeperProjections = null; // player_id → aggregated 2026 season projections

async function buildProjectionsCache() {
  console.log('Building projections cache...');
  const weeks = await Promise.all(
    Array.from({ length: 18 }, (_, i) =>
      fetchJSON(`https://api.sleeper.app/v1/projections/nfl/regular/2026/${i + 1}`)
    )
  );
  sleeperProjections = {};
  for (const week of weeks) {
    for (const [id, stats] of Object.entries(week)) {
      if (!sleeperProjections[id]) sleeperProjections[id] = {};
      for (const [k, v] of Object.entries(stats)) {
        if (typeof v === 'number') {
          sleeperProjections[id][k] = (sleeperProjections[id][k] || 0) + v;
        }
      }
    }
  }
  console.log('Projections cache ready.');
}

buildProjectionsCache().catch(err => console.error('Projections cache build failed:', err));

function generateStats(player) {
  const quality = Math.max(0, 1 - (player.adp - 1) / 200);
  const g = (base, range) => Math.round(base + quality * range);
  switch (player.position) {
    case 'QB': return {
      gamesPlayed: g(14, 3), passYards: g(2200, 2600), passTDs: g(15, 23),
      ints: Math.round(14 - quality * 6), rushYards: g(80, player.id % 3 === 0 ? 580 : 120),
      fantasyPts: g(180, 170),
    };
    case 'RB': return {
      gamesPlayed: g(12, 5), rushAttempts: g(80, 200), rushYards: g(350, 1450),
      rushTDs: g(3, 11), receptions: g(15, 75), recYards: g(80, 670),
      fantasyPts: g(100, 280),
    };
    case 'WR': return {
      gamesPlayed: g(13, 4), targets: g(50, 130), receptions: g(30, 95),
      recYards: g(450, 1350), recTDs: g(3, 14), fantasyPts: g(100, 300),
    };
    case 'TE': return {
      gamesPlayed: g(12, 5), targets: g(40, 120), receptions: g(22, 88),
      recYards: g(200, 1200), recTDs: g(2, 11), fantasyPts: g(60, 270),
    };
    case 'K': return {
      gamesPlayed: 17, fgMade: g(25, 10), fgAttempts: g(29, 12),
      fgLong: g(50, 12), xpMade: g(20, 35), fantasyPts: g(90, 70),
    };
    case 'DST': return {
      sacks: g(25, 30), ints: g(8, 14), fumblesRecovered: g(4, 10),
      defensiveTDs: g(0, 6), fantasyPts: g(80, 100),
    };
    default: return {};
  }
}

function formatSleeperStats(position, raw) {
  const n = (k) => Math.round(raw[k] || 0);
  const f = (k) => parseFloat((raw[k] || 0).toFixed(1));
  switch (position) {
    case 'QB': return { gamesPlayed: n('gp'), passYards: n('pass_yd'), passTDs: n('pass_td'), ints: n('pass_int'), rushYards: n('rush_yd'), fantasyPts: f('pts_ppr') };
    case 'RB': return { gamesPlayed: n('gp'), rushAttempts: n('rush_att'), rushYards: n('rush_yd'), rushTDs: n('rush_td'), receptions: n('rec'), recYards: n('rec_yd'), fantasyPts: f('pts_ppr') };
    case 'WR':
    case 'TE': return { gamesPlayed: n('gp'), targets: n('rec_tgt'), receptions: n('rec'), recYards: n('rec_yd'), recTDs: n('rec_td'), fantasyPts: f('pts_ppr') };
    case 'K': return { gamesPlayed: n('gp'), fgMade: n('fgm'), fgAttempts: n('fga'), xpMade: n('xpm'), fantasyPts: f('pts_ppr') };
    case 'DST': return { gamesPlayed: n('gp'), sacks: n('def_sack'), ints: n('def_int'), fumblesRecovered: n('def_fum_rec'), defensiveTDs: n('def_td'), fantasyPts: f('pts_ppr') };
    default: return {};
  }
}

function formatSleeperProjections(position, raw) {
  const r = (k) => parseFloat((raw[k] || 0).toFixed(1));
  switch (position) {
    case 'QB': return { passYards: r('pass_yd'), passTDs: r('pass_td'), ints: r('pass_int'), rushYards: r('rush_yd'), fantasyPts: r('pts_ppr') };
    case 'RB': return { rushAttempts: r('rush_att'), rushYards: r('rush_yd'), rushTDs: r('rush_td'), receptions: r('rec'), recYards: r('rec_yd'), fantasyPts: r('pts_ppr') };
    case 'WR':
    case 'TE': return { targets: r('rec_tgt'), receptions: r('rec'), recYards: r('rec_yd'), recTDs: r('rec_td'), fantasyPts: r('pts_ppr') };
    case 'K': return { fgMade: r('fgm'), fgAttempts: r('fga'), xpMade: r('xpm'), fantasyPts: r('pts_ppr') };
    case 'DST': return { sacks: r('def_sack'), ints: r('def_int'), fumblesRecovered: r('def_fum_rec'), defensiveTDs: r('def_td'), fantasyPts: r('pts_ppr') };
    default: return {};
  }
}

// GET /api/players/:id/projections
app.get('/api/players/:id/projections', async (req, res) => {
  const player = players.find(p => p.id === parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!sleeperProjections || !sleeperNameMap) {
    return res.json({ ...player, projections: null, source: 'unavailable' });
  }
  const sleeperId = player.position === 'DST'
    ? `TEAM_${player.team}`
    : sleeperNameMap[normalizeName(player.name)];
  const raw = sleeperId && sleeperProjections[sleeperId];
  if (!raw) return res.json({ ...player, projections: null, source: 'not_found' });
  res.json({ ...player, projections: formatSleeperProjections(player.position, raw), source: 'sleeper' });
});

// CSV import helpers
const COL_MAP = {
  name: 'name', player: 'name', playername: 'name', fullname: 'name',
  gp: 'gamesPlayed', g: 'gamesPlayed', gms: 'gamesPlayed', games: 'gamesPlayed', gamesplayed: 'gamesPlayed',
  passyd: 'passYards', passyds: 'passYards', passingyards: 'passYards', passyards: 'passYards',
  passtd: 'passTDs', passingtds: 'passTDs', passtds: 'passTDs',
  int: 'ints', interceptions: 'ints', passint: 'ints', ints: 'ints',
  rushyd: 'rushYards', rushyds: 'rushYards', rushingyards: 'rushYards', rushyards: 'rushYards',
  rushatt: 'rushAttempts', car: 'rushAttempts', carries: 'rushAttempts', rushattempts: 'rushAttempts',
  rushtd: 'rushTDs', rushingtds: 'rushTDs', rushtds: 'rushTDs',
  rec: 'receptions', receptions: 'receptions',
  recyd: 'recYards', recyds: 'recYards', receivingyards: 'recYards', recyards: 'recYards',
  rectd: 'recTDs', receivingtds: 'recTDs', rectds: 'recTDs',
  tgt: 'targets', targets: 'targets', rectgt: 'targets',
  fgm: 'fgMade', fgmade: 'fgMade',
  fga: 'fgAttempts', fgatt: 'fgAttempts', fgattempts: 'fgAttempts',
  xpm: 'xpMade', xpmade: 'xpMade',
  sacks: 'sacks', sack: 'sacks', defsack: 'sacks',
  deftd: 'defensiveTDs', deftds: 'defensiveTDs',
  fumrec: 'fumblesRecovered', fumblesrecovered: 'fumblesRecovered',
  fpts: 'fantasyPts', fantasypoints: 'fantasyPts', ptsppr: 'fantasyPts', pts: 'fantasyPts', fantasypts: 'fantasyPts',
};

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  values.push(current.trim());
  return values;
}

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trimEnd()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// Custom imported stats: normalized player name → stats object
let customStats = {};

// POST /api/stats/import
app.post('/api/stats/import', (req, res) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'No CSV data provided' });
  const rows = parseCSV(csv);
  if (rows.length === 0) return res.status(400).json({ error: 'No data found in CSV' });

  customStats = {};
  let imported = 0;
  for (const row of rows) {
    const nameCol = Object.keys(row).find(k => COL_MAP[k] === 'name');
    if (!nameCol || !row[nameCol]) continue;
    const stats = {};
    for (const [col, val] of Object.entries(row)) {
      const field = COL_MAP[col];
      if (!field || field === 'name' || !val) continue;
      const num = parseFloat(val);
      if (!isNaN(num)) stats[field] = num;
    }
    if (Object.keys(stats).length > 0) {
      customStats[normalizeName(row[nameCol])] = stats;
      imported++;
    }
  }
  res.json({ imported, total: rows.length });
});

// GET /api/players/:id/stats
app.get('/api/players/:id/stats', async (req, res) => {
  const player = players.find(p => p.id === parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Custom imported stats take priority
  const custom = customStats[normalizeName(player.name)];
  if (custom) return res.json({ ...player, stats: custom, source: 'custom' });

  if (!sleeperSeasonStats) {
    return res.json({ ...player, stats: generateStats(player), source: 'estimated' });
  }

  const sleeperId = player.position === 'DST'
    ? `TEAM_${player.team}`
    : sleeperNameMap?.[normalizeName(player.name)];

  const raw = sleeperId && sleeperSeasonStats[sleeperId];
  if (!raw) {
    return res.json({ ...player, stats: generateStats(player), source: 'estimated' });
  }

  res.json({ ...player, stats: formatSleeperStats(player.position, raw), source: 'sleeper' });
});

// GET /api/players
app.get('/api/players', (req, res) => {
  const { position, search } = req.query;
  let list = players;
  if (position && position !== 'ALL') {
    list = list.filter(p => p.position === position);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  }
  res.json(list);
});

// POST /api/draft/setup
app.post('/api/draft/setup', (req, res) => {
  const { teams, rounds } = req.body;
  if (!teams || teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });
  const pickOrder = buildSnakeOrder(teams.length, rounds);
  draftState = {
    teams,
    rounds,
    pickOrder,
    picks: [],
    currentPickIndex: 0,
    availablePlayers: players.map(p => p.id),
  };
  res.json(draftState);
});

// GET /api/draft
app.get('/api/draft', (req, res) => {
  if (!draftState) return res.status(404).json({ error: 'No draft in progress' });
  res.json(draftState);
});

// POST /api/draft/pick
app.post('/api/draft/pick', (req, res) => {
  if (!draftState) return res.status(404).json({ error: 'No draft in progress' });
  const { playerId } = req.body;
  if (!draftState.availablePlayers.includes(playerId)) {
    return res.status(400).json({ error: 'Player not available' });
  }
  if (draftState.currentPickIndex >= draftState.pickOrder.length) {
    return res.status(400).json({ error: 'Draft is complete' });
  }
  const { round, teamIndex } = draftState.pickOrder[draftState.currentPickIndex];
  draftState.picks.push({ playerId, teamIndex, round, pickNumber: draftState.currentPickIndex + 1 });
  draftState.availablePlayers = draftState.availablePlayers.filter(id => id !== playerId);
  draftState.currentPickIndex += 1;
  res.json(draftState);
});

// DELETE /api/draft/pick (undo last pick)
app.delete('/api/draft/pick', (req, res) => {
  if (!draftState || draftState.picks.length === 0) {
    return res.status(400).json({ error: 'No picks to undo' });
  }
  const last = draftState.picks.pop();
  draftState.availablePlayers.push(last.playerId);
  draftState.availablePlayers.sort((a, b) => a - b);
  draftState.currentPickIndex -= 1;
  res.json(draftState);
});

// DELETE /api/draft (reset)
app.delete('/api/draft', (req, res) => {
  draftState = null;
  res.json({ ok: true });
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
