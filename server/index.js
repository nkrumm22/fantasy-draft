require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const players = require('./players.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

async function initDb() {
  if (!pool) { console.warn('DATABASE_URL not set — auth/persistence disabled.'); return; }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      state JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'in_progress',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leagues (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      commissioner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      season INTEGER DEFAULT 2026,
      invite_code VARCHAR(20) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'pre_draft',
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS league_teams (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      team_name VARCHAR(255) NOT NULL,
      draft_slot INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (league_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS matchups (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      home_team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      away_team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      home_score DECIMAL(8,2) DEFAULT 0,
      away_score DECIMAL(8,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'scheduled'
    );
    CREATE TABLE IF NOT EXISTS lineups (
      id SERIAL PRIMARY KEY,
      league_team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      starters JSONB NOT NULL DEFAULT '[]',
      UNIQUE (league_team_id, week)
    );
    CREATE TABLE IF NOT EXISTS roster_moves (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL,
      action VARCHAR(10) NOT NULL,
      source VARCHAR(20) DEFAULT 'waiver',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS waiver_claims (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      add_player_id INTEGER NOT NULL,
      drop_player_id INTEGER,
      bid_amount INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      processed_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      proposing_team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      receiving_team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      offering_players JSONB DEFAULT '[]',
      requesting_players JSONB DEFAULT '[]',
      note TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS playoff_matchups (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      week INTEGER NOT NULL,
      round INTEGER NOT NULL,
      bracket_slot INTEGER NOT NULL DEFAULT 1,
      home_team_id INTEGER REFERENCES league_teams(id),
      away_team_id INTEGER REFERENCES league_teams(id),
      home_score DECIMAL(8,2) DEFAULT 0,
      away_score DECIMAL(8,2) DEFAULT 0,
      winner_id INTEGER REFERENCES league_teams(id),
      status VARCHAR(20) DEFAULT 'scheduled'
    );
    CREATE TABLE IF NOT EXISTS draft_queues (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      player_ids JSONB DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(league_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      team_name VARCHAR(255),
      message TEXT NOT NULL,
      pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      team_name VARCHAR(255),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES league_teams(id) ON DELETE SET NULL,
      team_name VARCHAR(255),
      type VARCHAR(30) NOT NULL,
      description TEXT,
      player_ids JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS trade_block (
      id SERIAL PRIMARY KEY,
      league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES league_teams(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(league_id, team_id, player_id)
    );
  `);
  await pool.query(`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id)`);
  await pool.query(`ALTER TABLE league_teams ADD COLUMN IF NOT EXISTS faab_remaining INTEGER`);
  console.log('Database ready.');
}
initDb().catch(console.error);

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ── Schedule generator ────────────────────────────────────
function generateRoundRobin(teamIds, numWeeks) {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const baseRounds = [];
  for (let round = 0; round < n - 1; round++) {
    const matchups = [];
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home !== null && away !== null) matchups.push({ homeId: home, awayId: away });
    }
    baseRounds.push(matchups);
    const last = teams.pop();
    teams.splice(1, 0, last);
  }
  const schedule = [];
  for (let week = 1; week <= numWeeks; week++) {
    const round = baseRounds[(week - 1) % baseRounds.length];
    round.forEach(m => schedule.push({ week, ...m }));
  }
  return schedule;
}

// ── Snake draft order ─────────────────────────────────────
function buildSnakeOrder(numTeams, numRounds) {
  const order = [];
  for (let round = 0; round < numRounds; round++) {
    const picks = Array.from({ length: numTeams }, (_, i) => i);
    if (round % 2 === 1) picks.reverse();
    picks.forEach(teamIndex => order.push({ round: round + 1, teamIndex }));
  }
  return order;
}

// ── Sport configuration ───────────────────────────────────
const SPORT_CONFIG = {
  nfl: {
    label: 'NFL Football', sleeperSport: 'nfl', season: '2025',
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    defaultRosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BN: 6 },
    flexPositions: ['RB', 'WR', 'TE'],
    scoringFormats: [['ppr','PPR'],['half_ppr','0.5 PPR'],['std','Standard']],
    defaultScoringFormat: 'half_ppr', defaultNumRounds: 15,
    ptField: (fmt) => fmt === 'half_ppr' ? 'pts_half_ppr' : fmt === 'std' ? 'pts_std' : 'pts_ppr',
    useOwnPlayerDb: true,
  },
  nba: {
    label: 'NBA Basketball', sleeperSport: 'nba', season: '2024',
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    defaultRosterSlots: { PG: 1, SG: 1, SF: 1, PF: 1, C: 1, FLEX: 2, BN: 4 },
    flexPositions: ['PG', 'SG', 'SF', 'PF', 'C'],
    scoringFormats: [['std','Standard']], defaultScoringFormat: 'std', defaultNumRounds: 13,
    ptField: () => 'pts_std', useOwnPlayerDb: false,
  },
  mlb: {
    label: 'MLB Baseball', sleeperSport: 'mlb', season: '2025',
    positions: ['P', 'C', '1B', '2B', '3B', 'SS', 'OF'],
    defaultRosterSlots: { P: 2, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3, UTIL: 1, BN: 4 },
    flexPositions: ['C', '1B', '2B', '3B', 'SS', 'OF'],
    scoringFormats: [['std','Standard']], defaultScoringFormat: 'std', defaultNumRounds: 14,
    ptField: () => 'pts_std', useOwnPlayerDb: false,
  },
  nhl: {
    label: 'NHL Hockey', sleeperSport: 'nhl', season: '2024',
    positions: ['C', 'LW', 'RW', 'D', 'G'],
    defaultRosterSlots: { C: 2, LW: 2, RW: 2, D: 2, G: 1, FLEX: 1, BN: 4 },
    flexPositions: ['C', 'LW', 'RW', 'D'],
    scoringFormats: [['std','Standard']], defaultScoringFormat: 'std', defaultNumRounds: 14,
    ptField: () => 'pts_std', useOwnPlayerDb: false,
  },
  epl: {
    label: 'EPL Soccer', sleeperSport: null, season: '2024',
    positions: ['GKP', 'DEF', 'MID', 'FWD'],
    defaultRosterSlots: { GKP: 1, DEF: 3, MID: 3, FWD: 2, FLEX: 2, BN: 4 },
    flexPositions: ['DEF', 'MID', 'FWD'],
    scoringFormats: [['std','Standard']], defaultScoringFormat: 'std', defaultNumRounds: 15,
    ptField: () => 'pts_std', useOwnPlayerDb: false,
  },
};

// ── Sleeper API helpers ───────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'fantasy-draft-app' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

let sleeperNameMap = null;           // NFL only: normalizedName → sleeperId
let sleeperSeasonStats = null;       // NFL only
let sleeperPlayerMeta = null;        // NFL only
const weekStatsCache = new Map();    // key: `${sport}_${week}` → stats object
const nonNflPlayersCache = {};       // sport → player array (lazy-loaded from Sleeper)

function normalizeName(name) {
  return name.toLowerCase().replace(/['.]/g, '').replace(/\s+/g, ' ').trim();
}

async function buildSleeperCache() {
  console.log('Building Sleeper stats cache...');
  const [playerList, ...weeks] = await Promise.all([
    fetchJSON('https://api.sleeper.app/v1/players/nfl'),
    ...Array.from({ length: 18 }, (_, i) =>
      fetchJSON(`https://api.sleeper.app/v1/stats/nfl/regular/2025/${i + 1}`)
    ),
  ]);
  sleeperNameMap = {};
  sleeperPlayerMeta = {};
  for (const [id, p] of Object.entries(playerList)) {
    if (p.full_name) sleeperNameMap[normalizeName(p.full_name)] = id;
    sleeperPlayerMeta[id] = {
      byeWeek: p.bye_week || null,
      injuryStatus: p.injury_status || null,
      injuryBodyPart: p.injury_body_part || null,
    };
  }
  sleeperSeasonStats = {};
  for (const week of weeks) {
    for (const [id, stats] of Object.entries(week)) {
      if (!sleeperSeasonStats[id]) sleeperSeasonStats[id] = {};
      for (const [k, v] of Object.entries(stats)) {
        if (typeof v === 'number') sleeperSeasonStats[id][k] = (sleeperSeasonStats[id][k] || 0) + v;
      }
    }
  }
  console.log('Sleeper stats cache ready.');
}
buildSleeperCache().catch(err => console.error('Sleeper cache build failed:', err));

let sleeperProjections = null;

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
        if (typeof v === 'number') sleeperProjections[id][k] = (sleeperProjections[id][k] || 0) + v;
      }
    }
  }
  console.log('Projections cache ready.');
}
buildProjectionsCache().catch(err => console.error('Projections cache build failed:', err));

async function loadEplPlayers() {
  if (nonNflPlayersCache['epl']) return nonNflPlayersCache['epl'];
  try {
    const data = await fetchJSON('https://fantasy.premierleague.com/api/bootstrap-static/');
    const posMap = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
    const teamMap = {};
    for (const t of (data.teams || [])) teamMap[t.id] = t.short_name || t.name;
    const arr = [];
    for (const p of (data.elements || [])) {
      const pos = posMap[p.element_type];
      if (!pos) continue;
      if (p.status === 'u') continue; // permanently unavailable
      const name = [p.first_name, p.second_name].filter(Boolean).join(' ');
      if (!name.trim()) continue;
      const injuryMap = { i: 'Out', d: 'Doubtful', s: 'Sus', n: 'Out' };
      arr.push({
        id: p.id,
        name,
        position: pos,
        team: teamMap[p.team] || null,
        adp: null,
        injury_status: injuryMap[p.status] || null,
      });
    }
    arr.sort((a, b) => (a.team ? 0 : 1) - (b.team ? 0 : 1) || a.name.localeCompare(b.name));
    nonNflPlayersCache['epl'] = arr;
    console.log(`Loaded ${arr.length} EPL players from FPL API`);
    return arr;
  } catch (err) {
    console.error('Failed to load EPL players:', err.message);
    return [];
  }
}

async function loadSportPlayers(sport) {
  if (sport === 'nfl') return players;
  if (nonNflPlayersCache[sport]) return nonNflPlayersCache[sport];
  const config = SPORT_CONFIG[sport];
  if (!config || !config.sleeperSport) {
    if (sport === 'epl') return loadEplPlayers();
    nonNflPlayersCache[sport] = [];
    return [];
  }
  try {
    const data = await fetchJSON(`https://api.sleeper.app/v1/players/${config.sleeperSport}`);
    const arr = [];
    for (const [id, p] of Object.entries(data)) {
      const pos = p.position;
      if (!pos || !config.positions.includes(pos)) continue;
      // Skip only players explicitly marked inactive with no team — Sleeper doesn't
      // set `active` for non-NFL sports so checking `!p.active` filters everyone out
      if (p.active === false && !p.team) continue;
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ');
      if (!name.trim()) continue;
      arr.push({
        id: parseInt(id),
        name,
        position: pos,
        team: p.team || null,
        adp: null,
        injury_status: p.injury_status || null,
      });
    }
    // Sort: players with a team first, then alphabetically
    arr.sort((a, b) => (a.team ? 0 : 1) - (b.team ? 0 : 1) || a.name.localeCompare(b.name));
    nonNflPlayersCache[sport] = arr;
    console.log(`Loaded ${arr.length} ${sport.toUpperCase()} players from Sleeper`);
    return arr;
  } catch (err) {
    console.error(`Failed to load ${sport} players:`, err.message);
    // Do not cache on error so the next request retries
    return [];
  }
}

function getSleeperPlayerId(player, sport) {
  if (sport === 'nfl') {
    if (player.position === 'DST') return `TEAM_${player.team}`;
    return sleeperNameMap ? sleeperNameMap[normalizeName(player.name)] : null;
  }
  return String(player.id);
}

async function fetchWeekStats(sport, week) {
  const config = SPORT_CONFIG[sport];
  if (!config?.sleeperSport) return {};
  const key = `${sport}_${week}`;
  if (!weekStatsCache.has(key)) {
    const stats = await fetchJSON(
      `https://api.sleeper.app/v1/stats/${config.sleeperSport}/regular/${config.season}/${week}`
    ).catch(() => ({}));
    weekStatsCache.set(key, stats);
  }
  return weekStatsCache.get(key);
}

async function getLeagueContext(leagueId) {
  const { rows: [{ settings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [leagueId]);
  const sport = settings?.sport || 'nfl';
  const config = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;
  const leaguePlayers = await loadSportPlayers(sport);
  return { sport, config, players: leaguePlayers, settings };
}

// ── Fantasy scoring ───────────────────────────────────────
async function scoreTeamLineup(teamId, week, weekStats, playerMap, ptField, sport = 'nfl') {
  if (!pool) return 0;
  const { rows: [lineup] } = await pool.query(
    'SELECT starters FROM lineups WHERE league_team_id = $1 AND week = $2',
    [teamId, week]
  );
  if (!lineup?.starters?.length) return 0;
  let total = 0;
  for (const playerId of lineup.starters) {
    const player = playerMap.get(playerId);
    if (!player) continue;
    const sleeperId = getSleeperPlayerId(player, sport);
    if (!sleeperId || !weekStats[sleeperId]) continue;
    total += weekStats[sleeperId][ptField] || 0;
  }
  return Math.round(total * 100) / 100;
}

// Optimal lineup helper — greedy: fill positional slots then FLEX with best remainder
function computeOptimalLineup(rosterIds, scoreMap, rosterSlots, playerMap, sportConfig) {
  const cfg = sportConfig || SPORT_CONFIG.nfl;
  const byPos = {};
  for (const pos of cfg.positions) byPos[pos] = [];
  for (const pid of rosterIds) {
    const p = playerMap.get(pid);
    if (!p || !byPos[p.position]) continue;
    byPos[p.position].push({ id: pid, score: scoreMap.get(pid) || 0, name: p.name, position: p.position });
  }
  Object.values(byPos).forEach(arr => arr.sort((a, b) => b.score - a.score));
  const starters = []; const used = new Set();
  for (const pos of cfg.positions) {
    const count = rosterSlots[pos] || 0;
    let n = 0;
    for (const p of (byPos[pos] || [])) {
      if (n >= count) break;
      if (!used.has(p.id)) { starters.push(p); used.add(p.id); n++; }
    }
  }
  const flexSlots = (rosterSlots.FLEX || 0) + (rosterSlots.UTIL || 0);
  if (flexSlots > 0) {
    const flex = cfg.flexPositions
      .flatMap(pos => byPos[pos] || [])
      .filter(p => !used.has(p.id))
      .sort((a, b) => b.score - a.score);
    const seen = new Set();
    for (const p of flex) {
      if (starters.length - (cfg.positions.reduce((s, pos) => s + (rosterSlots[pos] || 0), 0)) >= flexSlots) break;
      if (!seen.has(p.id)) { starters.push(p); used.add(p.id); seen.add(p.id); }
    }
  }
  return { optimalPoints: Math.round(starters.reduce((s, p) => s + p.score, 0) * 100) / 100, optimalStarters: starters, used };
}

// ── Transaction log helper ────────────────────────────────
async function logTransaction(leagueId, teamId, teamName, type, description, playerIds = []) {
  if (!pool) return;
  pool.query(
    'INSERT INTO transactions (league_id, team_id, team_name, type, description, player_ids) VALUES ($1,$2,$3,$4,$5,$6)',
    [leagueId, teamId, teamName, type, description, JSON.stringify(playerIds)]
  ).catch(console.error);
}

// ── Detailed lineup scorer (per-player) ───────────────────
async function getLineupWithScores(teamId, week, weekStats, playerMap, ptField) {
  if (!pool) return { starters: [], totalScore: 0 };
  const { rows: [lineup] } = await pool.query(
    'SELECT starters FROM lineups WHERE league_team_id = $1 AND week = $2', [teamId, week]
  );
  if (!lineup?.starters?.length) return { starters: [], totalScore: 0 };
  let total = 0;
  const starters = lineup.starters.map(playerId => {
    const player = playerMap.get(playerId);
    if (!player) return null;
    const sleeperId = player.position === 'DST'
      ? `TEAM_${player.team}`
      : (sleeperNameMap ? sleeperNameMap[normalizeName(player.name)] : null);
    const score = sleeperId && weekStats[sleeperId] ? (weekStats[sleeperId][ptField] || 0) : 0;
    total += score;
    return { ...player, score: Math.round(score * 100) / 100 };
  }).filter(Boolean);
  return { starters, totalScore: Math.round(total * 100) / 100 };
}

// ── Stats helpers ─────────────────────────────────────────
function generateStats(player) {
  const quality = Math.max(0, 1 - (player.adp - 1) / 200);
  const g = (base, range) => Math.round(base + quality * range);
  switch (player.position) {
    case 'QB': return { gamesPlayed: g(14, 3), passYards: g(2200, 2600), passTDs: g(15, 23), ints: Math.round(14 - quality * 6), rushYards: g(80, player.id % 3 === 0 ? 580 : 120), fantasyPts: g(180, 170) };
    case 'RB': return { gamesPlayed: g(12, 5), rushAttempts: g(80, 200), rushYards: g(350, 1450), rushTDs: g(3, 11), receptions: g(15, 75), recYards: g(80, 670), fantasyPts: g(100, 280) };
    case 'WR': return { gamesPlayed: g(13, 4), targets: g(50, 130), receptions: g(30, 95), recYards: g(450, 1350), recTDs: g(3, 14), fantasyPts: g(100, 300) };
    case 'TE': return { gamesPlayed: g(12, 5), targets: g(40, 120), receptions: g(22, 88), recYards: g(200, 1200), recTDs: g(2, 11), fantasyPts: g(60, 270) };
    case 'K': return { gamesPlayed: 17, fgMade: g(25, 10), fgAttempts: g(29, 12), fgLong: g(50, 12), xpMade: g(20, 35), fantasyPts: g(90, 70) };
    case 'DST': return { sacks: g(25, 30), ints: g(8, 14), fumblesRecovered: g(4, 10), defensiveTDs: g(0, 6), fantasyPts: g(80, 100) };
    default: return {};
  }
}

const FORMAT_FIELD = { ppr: 'pts_ppr', half_ppr: 'pts_half_ppr', std: 'pts_std' };

function formatSleeperStats(position, raw, format = 'ppr') {
  const n = k => Math.round(raw[k] || 0);
  const f = k => parseFloat((raw[k] || 0).toFixed(1));
  const pts = f(FORMAT_FIELD[format] || 'pts_ppr');
  switch (position) {
    case 'QB': return { gamesPlayed: n('gp'), passYards: n('pass_yd'), passTDs: n('pass_td'), ints: n('pass_int'), rushYards: n('rush_yd'), fantasyPts: pts };
    case 'RB': return { gamesPlayed: n('gp'), rushAttempts: n('rush_att'), rushYards: n('rush_yd'), rushTDs: n('rush_td'), receptions: n('rec'), recYards: n('rec_yd'), fantasyPts: pts };
    case 'WR': case 'TE': return { gamesPlayed: n('gp'), targets: n('rec_tgt'), receptions: n('rec'), recYards: n('rec_yd'), recTDs: n('rec_td'), fantasyPts: pts };
    case 'K': return { gamesPlayed: n('gp'), fgMade: n('fgm'), fgAttempts: n('fga'), xpMade: n('xpm'), fantasyPts: pts };
    case 'DST': return { gamesPlayed: n('gp'), sacks: n('def_sack'), ints: n('def_int'), fumblesRecovered: n('def_fum_rec'), defensiveTDs: n('def_td'), fantasyPts: pts };
    default: return {};
  }
}

function formatSleeperProjections(position, raw, format = 'ppr') {
  const r = k => parseFloat((raw[k] || 0).toFixed(1));
  const pts = r(FORMAT_FIELD[format] || 'pts_ppr');
  switch (position) {
    case 'QB': return { passYards: r('pass_yd'), passTDs: r('pass_td'), ints: r('pass_int'), rushYards: r('rush_yd'), fantasyPts: pts };
    case 'RB': return { rushAttempts: r('rush_att'), rushYards: r('rush_yd'), rushTDs: r('rush_td'), receptions: r('rec'), recYards: r('rec_yd'), fantasyPts: pts };
    case 'WR': case 'TE': return { targets: r('rec_tgt'), receptions: r('rec'), recYards: r('rec_yd'), recTDs: r('rec_td'), fantasyPts: pts };
    case 'K': return { fgMade: r('fgm'), fgAttempts: r('fga'), xpMade: r('xpm'), fantasyPts: pts };
    case 'DST': return { sacks: r('def_sack'), ints: r('def_int'), fumblesRecovered: r('def_fum_rec'), defensiveTDs: r('def_td'), fantasyPts: pts };
    default: return {};
  }
}

// ── CSV import ────────────────────────────────────────────
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
  fgm: 'fgMade', fgmade: 'fgMade', fga: 'fgAttempts', fgatt: 'fgAttempts', fgattempts: 'fgAttempts',
  xpm: 'xpMade', xpmade: 'xpMade',
  sacks: 'sacks', sack: 'sacks', defsack: 'sacks',
  deftd: 'defensiveTDs', deftds: 'defensiveTDs',
  fumrec: 'fumblesRecovered', fumblesrecovered: 'fumblesRecovered',
  fpts: 'fantasyPts', fantasypoints: 'fantasyPts', ptsppr: 'fantasyPts', pts: 'fantasyPts', fantasypts: 'fantasyPts',
};

function parseCSVLine(line) {
  const values = [];
  let current = '', inQuotes = false;
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

let customStats = {};

// ── Player routes ─────────────────────────────────────────
app.get('/api/players', async (req, res) => {
  const { position, search, sport: sportParam } = req.query;
  const sport = sportParam || 'nfl';
  let list;
  if (sport === 'nfl') {
    list = players.map(p => {
      const sleeperId = p.position === 'DST'
        ? `TEAM_${p.team}`
        : (sleeperNameMap ? sleeperNameMap[normalizeName(p.name)] : null);
      const meta = sleeperId && sleeperPlayerMeta ? sleeperPlayerMeta[sleeperId] : null;
      return { ...p, byeWeek: meta?.byeWeek ?? null, injuryStatus: meta?.injuryStatus ?? null, injuryBodyPart: meta?.injuryBodyPart ?? null };
    });
  } else {
    const sportPlayers = await loadSportPlayers(sport);
    list = sportPlayers.map(p => ({ ...p, byeWeek: null, injuryStatus: p.injury_status || null, injuryBodyPart: null }));
  }
  if (position && position !== 'ALL') list = list.filter(p => p.position === position);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || (p.team || '').toLowerCase().includes(q));
  }
  res.json(list);
});

app.get('/api/players/:id/stats', async (req, res) => {
  const player = players.find(p => p.id === parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const format = req.query.format || 'ppr';
  const custom = customStats[normalizeName(player.name)];
  if (custom) return res.json({ ...player, stats: custom, source: 'custom' });
  if (!sleeperSeasonStats) return res.json({ ...player, stats: generateStats(player), source: 'estimated' });
  const sleeperId = player.position === 'DST' ? `TEAM_${player.team}` : sleeperNameMap?.[normalizeName(player.name)];
  const raw = sleeperId && sleeperSeasonStats[sleeperId];
  if (!raw) return res.json({ ...player, stats: generateStats(player), source: 'estimated' });
  res.json({ ...player, stats: formatSleeperStats(player.position, raw, format), source: 'sleeper' });
});

app.get('/api/players/:id/projections', async (req, res) => {
  const player = players.find(p => p.id === parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const format = req.query.format || 'ppr';
  if (!sleeperProjections || !sleeperNameMap) return res.json({ ...player, projections: null, source: 'unavailable' });
  const sleeperId = player.position === 'DST' ? `TEAM_${player.team}` : sleeperNameMap[normalizeName(player.name)];
  const raw = sleeperId && sleeperProjections[sleeperId];
  if (!raw) return res.json({ ...player, projections: null, source: 'not_found' });
  res.json({ ...player, projections: formatSleeperProjections(player.position, raw, format), source: 'sleeper' });
});

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
    if (Object.keys(stats).length > 0) { customStats[normalizeName(row[nameCol])] = stats; imported++; }
  }
  res.json({ imported, total: rows.length });
});

// ── Auth routes ───────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { email, password } = req.body;
  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: 'Valid email and password (min 8 chars) required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), hash]
    );
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: rows[0].id, email: rows[0].email } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Admin auth & routes ───────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return res.status(503).json({ error: 'Admin not configured' });
  if (email !== adminEmail || password !== adminPassword)
    return res.status(401).json({ error: 'Invalid admin credentials' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { email, role: 'admin' } });
});

function requireAdmin(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(h.slice(7), JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.created_at, COUNT(d.id)::int as draft_count
      FROM users u LEFT JOIN drafts d ON d.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/all-drafts', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.name, d.status, d.created_at, d.updated_at,
        u.email as user_email, u.id as user_id,
        d.state->'teams' as teams, d.state->'rounds' as rounds,
        d.state->>'scoringFormat' as "scoringFormat",
        jsonb_array_length(d.state->'picks') as pick_count
      FROM drafts d JOIN users u ON u.id = d.user_id
      ORDER BY d.updated_at DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/drafts/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT d.state, u.email as user_email FROM drafts d JOIN users u ON u.id = d.user_id WHERE d.id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Draft not found' });
    res.json({ ...rows[0].state, userEmail: rows[0].user_email });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/drafts/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    await pool.query('DELETE FROM drafts WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/leagues', requireAdmin, async (_req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.name, l.season, l.status, l.invite_code, l.settings,
        u.email as commissioner_email,
        COUNT(lt.id)::int as team_count
      FROM leagues l
      JOIN users u ON u.id = l.commissioner_id
      LEFT JOIN league_teams lt ON lt.league_id = l.id
      GROUP BY l.id, u.email
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/leagues/:id/fill-bots', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    const numTeams = league.settings?.numTeams || 10;
    const { rows: existing } = await pool.query('SELECT id FROM league_teams WHERE league_id = $1', [req.params.id]);
    const spotsLeft = numTeams - existing.length;
    if (spotsLeft <= 0) return res.status(400).json({ error: 'League is already full' });
    for (let i = 0; i < spotsLeft; i++) {
      await pool.query(
        'INSERT INTO league_teams (league_id, user_id, team_name) VALUES ($1, NULL, $2)',
        [req.params.id, `Bot Team ${existing.length + i + 1}`]
      );
    }
    res.json({ ok: true, added: spotsLeft });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/admin/leagues/:id', requireAdmin, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    await pool.query('DELETE FROM leagues WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Draft persistence ─────────────────────────────────────
const activeDrafts = new Map(); // userId → { dbId, ...draftState }
const liveDrafts = new Map();   // dbId  → { dbId, ...draftState } (shared across all league members)

async function saveDraft(userId) {
  if (!pool) return;
  const entry = activeDrafts.get(userId);
  if (!entry?.dbId) return;
  const { dbId, ...state } = entry;
  const status = state.currentPickIndex >= state.pickOrder.length ? 'completed' : 'in_progress';
  pool.query(
    'UPDATE drafts SET state = $1, status = $2, updated_at = NOW() WHERE id = $3',
    [state, status, dbId]
  ).catch(console.error);
}

async function saveLiveDraft(dbId) {
  if (!pool) return;
  const entry = liveDrafts.get(dbId);
  if (!entry) return;
  const { dbId: _id, myTeamIndex: _mt, isOwner: _io, ...state } = entry;
  const status = state.currentPickIndex >= state.pickOrder.length ? 'completed' : 'in_progress';
  pool.query(
    'UPDATE drafts SET state = $1, status = $2, updated_at = NOW() WHERE id = $3',
    [state, status, dbId]
  ).catch(console.error);
}

app.get('/api/drafts', requireAuth, async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT id, name, status, created_at, updated_at,
       state->'teams' as teams, state->'rounds' as rounds,
       state->>'scoringFormat' as "scoringFormat",
       jsonb_array_length(state->'picks') as pick_count
       FROM drafts WHERE user_id = $1 AND league_id IS NULL ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/drafts/:id', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Draft not found' });
    const draftState = { dbId: rows[0].id, ...rows[0].state };
    activeDrafts.set(req.user.id, draftState);
    res.json(draftState);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/drafts/:id', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const result = await pool.query(
      'UPDATE drafts SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Draft not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/drafts/:id', requireAuth, async (req, res) => {
  const entry = activeDrafts.get(req.user.id);
  if (entry?.dbId === parseInt(req.params.id)) activeDrafts.delete(req.user.id);
  if (!pool) return res.json({ ok: true });
  try {
    await pool.query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Draft session routes ──────────────────────────────────
app.post('/api/draft/setup', requireAuth, async (req, res) => {
  try {
    const { teams, rounds, scoringFormat = 'ppr', name: draftName, timerSeconds = 0, leagueId, liveDraft = false } = req.body;
    if (!teams || teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });
    const pickOrder = buildSnakeOrder(teams.length, rounds);
    let draftPlayers = players;
    let lgSport = 'nfl';
    if (leagueId && pool) {
      try {
        const { rows: [lg] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [leagueId]);
        lgSport = lg?.settings?.sport || 'nfl';
        if (lgSport !== 'nfl') draftPlayers = await loadSportPlayers(lgSport);
      } catch {}
    }
    const state = { teams, rounds, scoringFormat, sport: lgSport, timerSeconds, pickOrder, picks: [], currentPickIndex: 0, availablePlayers: draftPlayers.map(p => p.id) };
    let dbId = null;
    if (pool) {
      const name = draftName?.trim() || `Draft – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      const result = await pool.query(
        'INSERT INTO drafts (user_id, name, state, league_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.user.id, name, state, leagueId || null]
      ).catch(err => { console.error('Draft insert error:', err.message); });
      dbId = result?.rows[0]?.id ?? null;
      if (leagueId && dbId) {
        try {
          const [{ rows: leagueTeams }, { rows: [leagueRow] }] = await Promise.all([
            pool.query('SELECT id, user_id FROM league_teams WHERE league_id = $1 ORDER BY created_at', [leagueId]),
            pool.query('SELECT settings FROM leagues WHERE id = $1', [leagueId]),
          ]);
          for (let i = 0; i < leagueTeams.length; i++) {
            await pool.query('UPDATE league_teams SET draft_slot = $1 WHERE id = $2', [i + 1, leagueTeams[i].id]);
          }
          // Build teamSlotMap for live draft: { userId: teamIndex (0-based) }
          if (liveDraft) {
            const teamSlotMap = {};
            for (let i = 0; i < leagueTeams.length; i++) {
              if (leagueTeams[i].user_id) teamSlotMap[leagueTeams[i].user_id] = i;
            }
            state.liveDraft = true;
            state.teamSlotMap = teamSlotMap;
            state.commissionerId = req.user.id;
          }
          await pool.query("UPDATE leagues SET status = 'drafting' WHERE id = $1", [leagueId]);
          if (leagueTeams.length >= 2) {
            const numWeeks = leagueRow?.settings?.numWeeks || 14;
            await pool.query('DELETE FROM matchups WHERE league_id = $1', [leagueId]);
            const schedule = generateRoundRobin(leagueTeams.map(t => t.id), numWeeks);
            for (const { week, homeId, awayId } of schedule) {
              await pool.query(
                'INSERT INTO matchups (league_id, week, home_team_id, away_team_id) VALUES ($1, $2, $3, $4)',
                [leagueId, week, homeId, awayId]
              );
            }
          }
          // Persist liveDraft fields into DB state now that they're set
          if (liveDraft && dbId) {
            await pool.query('UPDATE drafts SET state = $1 WHERE id = $2', [state, dbId]).catch(console.error);
          }
        } catch (leagueErr) {
          console.error('League setup error (draft will still start):', leagueErr.message);
        }
      }
    }
    const draftState = { dbId, ...state };
    activeDrafts.set(req.user.id, draftState);
    if (state.liveDraft && dbId) liveDrafts.set(dbId, draftState);
    res.json({ ...draftState, isOwner: true, myTeamIndex: state.teamSlotMap?.[req.user.id] ?? null });
  } catch (err) {
    console.error('Draft setup error:', err);
    res.status(500).json({ error: err.message || 'Failed to start draft' });
  }
});

app.get('/api/draft', requireAuth, (req, res) => {
  const state = activeDrafts.get(req.user.id);
  if (!state) return res.status(404).json({ error: 'No active draft' });
  res.json(state);
});

app.post('/api/draft/pick', requireAuth, async (req, res) => {
  const state = activeDrafts.get(req.user.id);
  if (!state) return res.status(404).json({ error: 'No active draft' });
  const { playerId } = req.body;
  if (!state.availablePlayers.includes(playerId)) return res.status(400).json({ error: 'Player not available' });
  if (state.currentPickIndex >= state.pickOrder.length) return res.status(400).json({ error: 'Draft is complete' });
  const { round, teamIndex } = state.pickOrder[state.currentPickIndex];
  state.picks.push({ playerId, teamIndex, round, pickNumber: state.currentPickIndex + 1 });
  state.availablePlayers = state.availablePlayers.filter(id => id !== playerId);
  state.currentPickIndex += 1;
  await saveDraft(req.user.id);
  res.json(state);
});

app.delete('/api/draft/pick', requireAuth, async (req, res) => {
  const state = activeDrafts.get(req.user.id);
  if (!state || state.picks.length === 0) return res.status(400).json({ error: 'No picks to undo' });
  const last = state.picks.pop();
  state.availablePlayers.push(last.playerId);
  state.availablePlayers.sort((a, b) => a - b);
  state.currentPickIndex -= 1;
  await saveDraft(req.user.id);
  res.json(state);
});

app.delete('/api/draft', requireAuth, (req, res) => {
  activeDrafts.delete(req.user.id);
  res.json({ ok: true });
});

// ── Live draft routes (shared state for all league members) ──────────────────

app.get('/api/draft/:id/state', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const dbId = parseInt(req.params.id);
  let state = liveDrafts.get(dbId);
  if (!state) {
    // Server restarted — reload from DB
    try {
      const { rows: [row] } = await pool.query('SELECT * FROM drafts WHERE id = $1', [dbId]);
      if (!row) return res.status(404).json({ error: 'Draft not found' });
      if (!row.state?.liveDraft) return res.status(400).json({ error: 'Not a live draft' });
      // Verify caller is a member of the league
      const { rows: [member] } = await pool.query(
        'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2',
        [row.league_id, req.user.id]
      );
      const isOwner = row.user_id === req.user.id;
      if (!member && !isOwner) return res.status(403).json({ error: 'Not authorized' });
      state = { dbId, ...row.state };
      liveDrafts.set(dbId, state);
    } catch (err) { return res.status(500).json({ error: 'Server error' }); }
  }
  const myTeamIndex = state.teamSlotMap ? (state.teamSlotMap[req.user.id] ?? null) : null;
  const isOwner = state.commissionerId === req.user.id;
  res.json({ ...state, myTeamIndex, isOwner });
});

app.post('/api/draft/:id/pick', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const dbId = parseInt(req.params.id);
  const state = liveDrafts.get(dbId);
  if (!state) return res.status(404).json({ error: 'Draft not active — refresh to reconnect' });
  const { playerId } = req.body;
  if (!state.availablePlayers.includes(playerId)) return res.status(400).json({ error: 'Player not available' });
  if (state.currentPickIndex >= state.pickOrder.length) return res.status(400).json({ error: 'Draft is complete' });
  const { round, teamIndex } = state.pickOrder[state.currentPickIndex];
  // Enforce turn order for non-commissioners
  const isCommissioner = state.commissionerId === req.user.id;
  if (!isCommissioner) {
    const myTeamIndex = state.teamSlotMap?.[req.user.id];
    if (myTeamIndex === undefined) return res.status(403).json({ error: 'You are not in this draft' });
    if (myTeamIndex !== teamIndex) return res.status(403).json({ error: "It's not your turn" });
  }
  state.picks.push({ playerId, teamIndex, round, pickNumber: state.currentPickIndex + 1 });
  state.availablePlayers = state.availablePlayers.filter(id => id !== playerId);
  state.currentPickIndex += 1;
  await saveLiveDraft(dbId);
  const myTeamIndex = state.teamSlotMap?.[req.user.id] ?? null;
  res.json({ ...state, myTeamIndex, isOwner: isCommissioner });
});

app.delete('/api/draft/:id/pick', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const dbId = parseInt(req.params.id);
  const state = liveDrafts.get(dbId);
  if (!state) return res.status(404).json({ error: 'Draft not active' });
  if (state.commissionerId !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
  if (state.picks.length === 0) return res.status(400).json({ error: 'No picks to undo' });
  const last = state.picks.pop();
  state.availablePlayers.push(last.playerId);
  state.availablePlayers.sort((a, b) => a - b);
  state.currentPickIndex -= 1;
  await saveLiveDraft(dbId);
  const myTeamIndex = state.teamSlotMap?.[req.user.id] ?? null;
  res.json({ ...state, myTeamIndex, isOwner: true });
});

// ── League routes ─────────────────────────────────────────
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const DEFAULT_SETTINGS = {
  numTeams: 10, numRounds: 15, scoringFormat: 'half_ppr',
  rosterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BN: 6 },
  waiverType: 'faab', faabBudget: 100,
  tradeDeadlineWeek: 11, playoffStartWeek: 14, playoffTeams: 4,
};

app.post('/api/leagues', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { name, teamName, settings = {}, sport = 'nfl' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'League name is required' });
  if (!teamName?.trim()) return res.status(400).json({ error: 'Your team name is required' });
  try {
    const cfg = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      rosterSlots: cfg.defaultRosterSlots,
      scoringFormat: cfg.defaultScoringFormat,
      numRounds: cfg.defaultNumRounds,
      sport,
      ...settings,
    };
    const inviteCode = generateInviteCode();
    const { rows: [league] } = await pool.query(
      `INSERT INTO leagues (name, commissioner_id, season, invite_code, settings)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), req.user.id, new Date().getFullYear(), inviteCode, mergedSettings]
    );
    await pool.query(
      `INSERT INTO league_teams (league_id, user_id, team_name, draft_slot) VALUES ($1, $2, $3, 1)`,
      [league.id, req.user.id, teamName.trim()]
    );
    res.json(league);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues', requireAuth, async (req, res) => {
  if (!pool) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT l.*, lt.team_name as my_team_name, lt.id as my_team_id,
        (SELECT COUNT(*) FROM league_teams WHERE league_id = l.id)::int as member_count,
        u.email as commissioner_email
       FROM leagues l
       JOIN league_teams lt ON lt.league_id = l.id AND lt.user_id = $1
       JOIN users u ON u.id = l.commissioner_id
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues/:id', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query(
      `SELECT l.*, u.email as commissioner_email
       FROM leagues l JOIN users u ON u.id = l.commissioner_id WHERE l.id = $1`,
      [req.params.id]
    );
    if (!league) return res.status(404).json({ error: 'League not found' });
    const { rows: teams } = await pool.query(
      `SELECT lt.*, u.email FROM league_teams lt LEFT JOIN users u ON u.id = lt.user_id
       WHERE lt.league_id = $1 ORDER BY lt.draft_slot ASC, lt.created_at ASC`,
      [req.params.id]
    );
    const isMember = teams.some(t => t.user_id === req.user.id) || league.commissioner_id === req.user.id;
    if (!isMember) return res.status(403).json({ error: 'Not a member of this league' });
    res.json({ ...league, teams });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/join', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { inviteCode, teamName } = req.body;
  if (!inviteCode?.trim()) return res.status(400).json({ error: 'Invite code is required' });
  if (!teamName?.trim()) return res.status(400).json({ error: 'Team name is required' });
  try {
    const { rows: [league] } = await pool.query(
      'SELECT * FROM leagues WHERE invite_code = $1', [inviteCode.trim().toUpperCase()]
    );
    if (!league) return res.status(404).json({ error: 'Invalid invite code' });
    const { rows: members } = await pool.query(
      'SELECT * FROM league_teams WHERE league_id = $1', [league.id]
    );
    if (members.some(m => m.user_id === req.user.id))
      return res.status(400).json({ error: 'You are already in this league' });
    if (members.length >= league.settings.numTeams)
      return res.status(400).json({ error: 'League is full' });
    const nextSlot = members.length + 1;
    await pool.query(
      'INSERT INTO league_teams (league_id, user_id, team_name, draft_slot) VALUES ($1, $2, $3, $4)',
      [league.id, req.user.id, teamName.trim(), nextSlot]
    );
    res.json(league);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/leagues/:id', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Only the commissioner can edit this league' });
    const { name, settings, status } = req.body;
    const updates = [];
    const vals = [];
    if (name?.trim()) { updates.push(`name = $${vals.length + 1}`); vals.push(name.trim()); }
    if (settings) { updates.push(`settings = $${vals.length + 1}`); vals.push({ ...league.settings, ...settings }); }
    if (status) { updates.push(`status = $${vals.length + 1}`); vals.push(status); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id);
    const { rows: [updated] } = await pool.query(
      `UPDATE leagues SET ${updates.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals
    );
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/leagues/:id/teams/:teamId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { teamName } = req.body;
  if (!teamName?.trim()) return res.status(400).json({ error: 'Team name required' });
  try {
    const { rows: [updated] } = await pool.query(
      'UPDATE league_teams SET team_name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [teamName.trim(), req.params.teamId, req.user.id]
    );
    if (!updated) return res.status(404).json({ error: 'Team not found' });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/leagues/:id', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Only the commissioner can delete this league' });
    await pool.query('DELETE FROM leagues WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/leagues/:id/leave', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id === req.user.id) return res.status(400).json({ error: 'Commissioner cannot leave — delete the league instead' });
    await pool.query('DELETE FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues/:id/draft', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    const isCommissioner = league.commissioner_id === req.user.id;
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!member && !isCommissioner) return res.status(403).json({ error: 'Not a member' });
    const { rows: [row] } = await pool.query(
      'SELECT * FROM drafts WHERE league_id = $1',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'No draft found for this league' });
    const draftState = { dbId: row.id, ...row.state };
    const isOwner = row.user_id === req.user.id;
    if (isOwner) activeDrafts.set(req.user.id, draftState);
    // Populate liveDrafts cache on reconnect if this is a live draft
    if (draftState.liveDraft && !liveDrafts.has(row.id)) liveDrafts.set(row.id, draftState);
    const myTeamIndex = draftState.teamSlotMap ? (draftState.teamSlotMap[req.user.id] ?? null) : null;
    res.json({ ...draftState, isOwner, myTeamIndex, leagueId: parseInt(req.params.id) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── League season routes ──────────────────────────────────

app.post('/api/leagues/:id/schedule', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const { rows: teams } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 ORDER BY draft_slot NULLS LAST, created_at',
      [req.params.id]
    );
    if (teams.length < 2) return res.status(400).json({ error: 'Need at least 2 teams' });
    await pool.query('DELETE FROM matchups WHERE league_id = $1', [req.params.id]);
    const numWeeks = league.settings?.numWeeks || 14;
    const schedule = generateRoundRobin(teams.map(t => t.id), numWeeks);
    for (const { week, homeId, awayId } of schedule) {
      await pool.query(
        'INSERT INTO matchups (league_id, week, home_team_id, away_team_id) VALUES ($1, $2, $3, $4)',
        [req.params.id, week, homeId, awayId]
      );
    }
    await pool.query("UPDATE leagues SET status = 'in_season' WHERE id = $1", [req.params.id]);
    res.json({ ok: true, weeks: numWeeks, matchups: schedule.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues/:id/schedule', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(`
      SELECT m.id, m.week, m.home_score, m.away_score, m.status,
        ht.id as home_team_id, ht.team_name as home_team_name,
        at.id as away_team_id, at.team_name as away_team_name
      FROM matchups m
      JOIN league_teams ht ON ht.id = m.home_team_id
      JOIN league_teams at ON at.id = m.away_team_id
      WHERE m.league_id = $1
      ORDER BY m.week, m.id
    `, [req.params.id]);
    const weeks = {};
    for (const row of rows) {
      if (!weeks[row.week]) weeks[row.week] = [];
      weeks[row.week].push(row);
    }
    res.json({ myTeamId: member.id, weeks });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Shared helper: get a team's current roster (draft picks + waiver adds - drops)
async function getTeamRosterIds(teamId, draftState) {
  const { rows: [team] } = await pool.query('SELECT draft_slot FROM league_teams WHERE id = $1', [teamId]);
  const drafted = new Set(
    (draftState?.picks || []).filter(p => p.teamIndex === (team?.draft_slot ?? -2) - 1).map(p => p.playerId)
  );
  const { rows: moves } = await pool.query(
    'SELECT player_id, action FROM roster_moves WHERE team_id = $1 ORDER BY created_at', [teamId]
  );
  for (const m of moves) {
    if (m.action === 'add') drafted.add(m.player_id);
    else drafted.delete(m.player_id);
  }
  return [...drafted];
}

app.get('/api/leagues/:id/roster', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT * FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    const { rows: [{ settings: rSettings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const rSport = rSettings?.sport || 'nfl';
    const rPlayers = await loadSportPlayers(rSport);
    const playerMap = new Map(rPlayers.map(p => [p.id, p]));
    const rosterIds = await getTeamRosterIds(myTeam.id, draft?.state);
    res.json(rosterIds.map(id => playerMap.get(id)).filter(Boolean));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues/:id/lineup/:week', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows: [lineup] } = await pool.query(
      'SELECT starters FROM lineups WHERE league_team_id = $1 AND week = $2',
      [myTeam.id, req.params.week]
    );
    res.json({ starters: lineup?.starters || [] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/lineup/:week', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { starters } = req.body;
  if (!Array.isArray(starters)) return res.status(400).json({ error: 'starters must be an array' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    await pool.query(`
      INSERT INTO lineups (league_team_id, week, starters)
      VALUES ($1, $2, $3)
      ON CONFLICT (league_team_id, week) DO UPDATE SET starters = $3
    `, [myTeam.id, req.params.week, JSON.stringify(starters)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/score/:week', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const week = parseInt(req.params.week);
    const sport = league.settings?.sport || 'nfl';
    const config = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;
    const format = league.settings?.scoringFormat || config.defaultScoringFormat;
    const ptField = config.ptField(format);
    const weekStats = await fetchWeekStats(sport, week);
    const { rows: matchups } = await pool.query(
      'SELECT * FROM matchups WHERE league_id = $1 AND week = $2', [req.params.id, week]
    );
    if (!matchups.length) return res.status(404).json({ error: 'No matchups found for this week' });
    const leaguePlayers = await loadSportPlayers(sport);
    const playerMap = new Map(leaguePlayers.map(p => [p.id, p]));
    for (const m of matchups) {
      const [homeScore, awayScore] = await Promise.all([
        scoreTeamLineup(m.home_team_id, week, weekStats, playerMap, ptField, sport),
        scoreTeamLineup(m.away_team_id, week, weekStats, playerMap, ptField, sport),
      ]);
      await pool.query(
        "UPDATE matchups SET home_score = $1, away_score = $2, status = 'complete' WHERE id = $3",
        [homeScore, awayScore, m.id]
      );
    }
    await pool.query("UPDATE leagues SET status = 'in_season' WHERE id = $1 AND status = 'drafting'", [req.params.id]);
    res.json({ ok: true, week, scored: matchups.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/leagues/:id/standings', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: teams } = await pool.query(
      'SELECT id, team_name FROM league_teams WHERE league_id = $1 ORDER BY draft_slot NULLS LAST, created_at',
      [req.params.id]
    );
    const { rows: matchups } = await pool.query(
      "SELECT * FROM matchups WHERE league_id = $1 AND status = 'complete' ORDER BY week",
      [req.params.id]
    );
    const stats = {};
    for (const t of teams) stats[t.id] = { teamId: t.id, teamName: t.team_name, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, results: [], luckyWins: 0, unluckyLosses: 0, medianWins: 0, medianLosses: 0 };

    // Group completed matchups by week to compute median per week
    const byWeek = {};
    for (const m of matchups) {
      if (!byWeek[m.week]) byWeek[m.week] = [];
      byWeek[m.week].push(m);
    }

    for (const m of matchups) {
      const home = stats[m.home_team_id];
      const away = stats[m.away_team_id];
      if (!home || !away) continue;
      const hs = parseFloat(m.home_score), as_ = parseFloat(m.away_score);
      home.pf += hs; home.pa += as_;
      away.pf += as_; away.pa += hs;
      if (hs > as_) { home.wins++; home.results.push('W'); away.losses++; away.results.push('L'); }
      else if (as_ > hs) { away.wins++; away.results.push('W'); home.losses++; home.results.push('L'); }
      else { home.ties++; home.results.push('T'); away.ties++; away.results.push('T'); }
    }

    // Lucky/unlucky: compare each team's score to the median for that week
    for (const wms of Object.values(byWeek)) {
      const scores = [];
      for (const m of wms) {
        scores.push({ teamId: m.home_team_id, score: parseFloat(m.home_score), won: parseFloat(m.home_score) > parseFloat(m.away_score) });
        scores.push({ teamId: m.away_team_id, score: parseFloat(m.away_score), won: parseFloat(m.away_score) > parseFloat(m.home_score) });
      }
      const sorted = [...scores].map(s => s.score).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      for (const { teamId, score, won } of scores) {
        if (!stats[teamId]) continue;
        const aboveMedian = score > median;
        if (won) { stats[teamId].medianWins++; if (!aboveMedian) stats[teamId].luckyWins++; }
        else { stats[teamId].medianLosses++; if (aboveMedian) stats[teamId].unluckyLosses++; }
      }
    }

    const standings = Object.values(stats).map(s => {
      const streak = s.results.length === 0 ? '' : (() => {
        const last = s.results[s.results.length - 1];
        let n = 0;
        for (let i = s.results.length - 1; i >= 0 && s.results[i] === last; i--) n++;
        return `${last}${n}`;
      })();
      return { ...s, pf: Math.round(s.pf * 100) / 100, pa: Math.round(s.pa * 100) / 100, streak, results: undefined };
    }).sort((a, b) => b.wins - a.wins || b.pf - a.pf);
    res.json({ standings, myTeamId: member.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Bench Report ─────────────────────────────────────────
app.get('/api/leagues/:id/bench-report', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const { rows: [{ settings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const sport = settings?.sport || 'nfl';
    const config = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;
    const format = settings?.scoringFormat || config.defaultScoringFormat;
    const ptField = config.ptField(format);
    const rosterSlots = settings?.rosterSlots || config.defaultRosterSlots;

    const { rows: teams } = await pool.query('SELECT id, team_name FROM league_teams WHERE league_id = $1', [req.params.id]);
    const { rows: completedMatchups } = await pool.query(
      "SELECT DISTINCT week FROM matchups WHERE league_id = $1 AND status = 'complete' ORDER BY week", [req.params.id]
    );
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    const draftState = draft?.state;
    const leaguePlayers = await loadSportPlayers(sport);
    const playerMap = new Map(leaguePlayers.map(p => [p.id, p]));
    const weeks = completedMatchups.map(r => r.week);

    const teamReports = [];
    for (const team of teams) {
      let totalLeft = 0; let weeksPlayed = 0;
      const rosterIds = await getTeamRosterIds(team.id, draftState);

      for (const week of weeks) {
        const weekStats = await fetchWeekStats(sport, week);

        // Build score map for all roster players
        const scoreMap = new Map();
        for (const pid of rosterIds) {
          const p = playerMap.get(pid);
          if (!p) continue;
          const sleeperId = getSleeperPlayerId(p, sport);
          scoreMap.set(pid, sleeperId && weekStats[sleeperId] ? (weekStats[sleeperId][ptField] || 0) : 0);
        }

        const actual = await scoreTeamLineup(team.id, week, weekStats, playerMap, ptField, sport);
        const { optimalPoints } = computeOptimalLineup(rosterIds, scoreMap, rosterSlots, playerMap, config);
        const left = Math.max(0, Math.round((optimalPoints - actual) * 100) / 100);
        totalLeft += left;
        weeksPlayed++;
      }

      teamReports.push({
        teamId: team.id,
        teamName: team.team_name,
        totalLeft: Math.round(totalLeft * 100) / 100,
        avgLeft: weeksPlayed > 0 ? Math.round((totalLeft / weeksPlayed) * 100) / 100 : 0,
        weeksPlayed,
      });
    }

    teamReports.sort((a, b) => b.totalLeft - a.totalLeft);
    res.json({ report: teamReports, myTeamId: member.id, weeks });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Trade Block ───────────────────────────────────────────
app.get('/api/leagues/:id/trade-block', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      `SELECT tb.id, tb.team_id, tb.player_id, tb.note, tb.created_at, lt.team_name
       FROM trade_block tb JOIN league_teams lt ON lt.id = tb.team_id
       WHERE tb.league_id = $1 ORDER BY tb.created_at DESC`, [req.params.id]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    const items = rows.map(r => ({ ...r, player: playerMap.get(r.player_id) || null }));
    res.json({ items, myTeamId: member.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/trade-block', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { playerId, note } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const { rows: [row] } = await pool.query(
      `INSERT INTO trade_block (league_id, team_id, player_id, note) VALUES ($1, $2, $3, $4)
       ON CONFLICT (league_id, team_id, player_id) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`, [req.params.id, myTeam.id, playerId, note || null]
    );
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/leagues/:id/trade-block/:blockId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rowCount } = await pool.query(
      'DELETE FROM trade_block WHERE id = $1 AND team_id = $2', [req.params.blockId, myTeam.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Waiver Wire ───────────────────────────────────────────

// Get free agents (players not on any team's roster in this league)
app.get('/api/leagues/:id/free-agents', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    const { rows: [{ settings: lgSettings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const lgSport = lgSettings?.sport || 'nfl';
    const lgPlayers = await loadSportPlayers(lgSport);
    const { rows: teams } = await pool.query('SELECT id, draft_slot FROM league_teams WHERE league_id = $1', [req.params.id]);
    const onRoster = new Set();
    const draftPicks = draft?.state?.picks || [];
    for (const t of teams) {
      if (t.draft_slot == null) continue;
      draftPicks.filter(p => p.teamIndex === t.draft_slot - 1).forEach(p => onRoster.add(p.playerId));
    }
    const { rows: moves } = await pool.query(
      'SELECT player_id, action FROM roster_moves WHERE league_id = $1 ORDER BY created_at', [req.params.id]
    );
    for (const m of moves) {
      if (m.action === 'add') onRoster.add(m.player_id);
      else onRoster.delete(m.player_id);
    }
    const { pos } = req.query;
    let freeAgents = lgPlayers.filter(p => !onRoster.has(p.id));
    if (pos) freeAgents = freeAgents.filter(p => p.position === pos.toUpperCase());
    res.json(freeAgents.slice(0, 100));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get my team's pending waiver claims
app.get('/api/leagues/:id/waivers', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT * FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      "SELECT * FROM waiver_claims WHERE league_id = $1 AND status = 'pending' ORDER BY created_at",
      [req.params.id]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    const { rows: [{ settings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const budget = settings?.faabBudget || 100;
    const { rows: allTeams } = await pool.query('SELECT id, team_name, faab_remaining FROM league_teams WHERE league_id = $1', [req.params.id]);
    const teamMap = new Map(allTeams.map(t => [t.id, t.team_name]));
    res.json({
      myClaims: rows.filter(r => r.team_id === myTeam.id).map(r => ({
        ...r, addPlayer: playerMap.get(r.add_player_id), dropPlayer: r.drop_player_id ? playerMap.get(r.drop_player_id) : null,
      })),
      allClaims: rows.map(r => ({ ...r, teamName: teamMap.get(r.team_id), addPlayer: playerMap.get(r.add_player_id) })),
      myTeamId: myTeam.id,
      faabRemaining: myTeam.faab_remaining ?? budget,
      allTeamBudgets: allTeams.map(t => ({ id: t.id, team_name: t.team_name, faab_remaining: t.faab_remaining ?? budget, budget })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Submit a waiver claim
app.post('/api/leagues/:id/waivers', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { addPlayerId, dropPlayerId, bidAmount = 0 } = req.body;
  if (!addPlayerId) return res.status(400).json({ error: 'addPlayerId required' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT * FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows: [existing] } = await pool.query(
      "SELECT id FROM waiver_claims WHERE league_id = $1 AND team_id = $2 AND add_player_id = $3 AND status = 'pending'",
      [req.params.id, myTeam.id, addPlayerId]
    );
    if (existing) return res.status(400).json({ error: 'You already have a pending claim for this player' });
    const { rows: [{ settings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const budget = settings?.faabBudget || 100;
    const faabLeft = myTeam.faab_remaining ?? budget;
    if (bidAmount > faabLeft) return res.status(400).json({ error: `Bid exceeds FAAB remaining ($${faabLeft})` });
    await pool.query(
      'INSERT INTO waiver_claims (league_id, team_id, add_player_id, drop_player_id, bid_amount) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, myTeam.id, addPlayerId, dropPlayerId || null, bidAmount]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Cancel a waiver claim
app.delete('/api/leagues/:id/waivers/:claimId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rowCount } = await pool.query(
      "DELETE FROM waiver_claims WHERE id = $1 AND team_id = $2 AND status = 'pending'",
      [req.params.claimId, myTeam.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Claim not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Commissioner: process waivers (FAAB — highest bid wins)
app.post('/api/leagues/:id/waivers/process', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const budget = league.settings?.faabBudget || 100;
    const { rows: claims } = await pool.query(
      "SELECT wc.*, lt.faab_remaining FROM waiver_claims wc JOIN league_teams lt ON lt.id = wc.team_id WHERE wc.league_id = $1 AND wc.status = 'pending' ORDER BY wc.bid_amount DESC, wc.created_at ASC",
      [req.params.id]
    );
    const awardedPlayers = new Set();
    let approved = 0, denied = 0;
    for (const claim of claims) {
      if (awardedPlayers.has(claim.add_player_id)) {
        await pool.query("UPDATE waiver_claims SET status = 'denied', processed_at = NOW() WHERE id = $1", [claim.id]);
        denied++;
        continue;
      }
      const faabLeft = claim.faab_remaining ?? budget;
      if (claim.bid_amount > faabLeft) {
        await pool.query("UPDATE waiver_claims SET status = 'denied', processed_at = NOW() WHERE id = $1", [claim.id]);
        denied++;
        continue;
      }
      // Award the claim
      awardedPlayers.add(claim.add_player_id);
      await pool.query("UPDATE waiver_claims SET status = 'approved', processed_at = NOW() WHERE id = $1", [claim.id]);
      await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1, $2, $3, $4, $5)',
        [req.params.id, claim.team_id, claim.add_player_id, 'add', 'waiver']);
      if (claim.drop_player_id) {
        await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1, $2, $3, $4, $5)',
          [req.params.id, claim.team_id, claim.drop_player_id, 'drop', 'waiver']);
      }
      const newFaab = Math.max(0, (claim.faab_remaining ?? budget) - claim.bid_amount);
      await pool.query('UPDATE league_teams SET faab_remaining = $1 WHERE id = $2', [newFaab, claim.team_id]);
      const { rows: [claimTeam] } = await pool.query('SELECT team_name FROM league_teams WHERE id = $1', [claim.team_id]);
      const playerMap2 = new Map(players.map(p => [p.id, p]));
      const addedName = playerMap2.get(claim.add_player_id)?.name || `Player #${claim.add_player_id}`;
      const droppedName = claim.drop_player_id ? playerMap2.get(claim.drop_player_id)?.name : null;
      const txDesc = droppedName ? `Added ${addedName}, dropped ${droppedName}` : `Added ${addedName}`;
      const txIds = claim.drop_player_id ? [claim.add_player_id, claim.drop_player_id] : [claim.add_player_id];
      await logTransaction(req.params.id, claim.team_id, claimTeam?.team_name, 'waiver', txDesc, txIds);
      approved++;
    }
    res.json({ ok: true, approved, denied });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Waiver claim history (processed claims)
app.get('/api/leagues/:id/waivers/history', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      `SELECT wc.id, wc.add_player_id, wc.drop_player_id, wc.bid_amount, wc.status, wc.processed_at, lt.team_name, wc.team_id
       FROM waiver_claims wc
       JOIN league_teams lt ON lt.id = wc.team_id
       WHERE wc.league_id = $1 AND wc.status IN ('approved', 'denied')
       ORDER BY wc.processed_at DESC LIMIT 50`,
      [req.params.id]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    res.json(rows.map(r => ({
      ...r,
      addPlayer: playerMap.get(r.add_player_id),
      dropPlayer: r.drop_player_id ? playerMap.get(r.drop_player_id) : null,
    })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Trades ────────────────────────────────────────────────

app.get('/api/leagues/:id/trades', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      `SELECT t.*, pt.team_name as proposing_name, rt.team_name as receiving_name
       FROM trades t
       JOIN league_teams pt ON pt.id = t.proposing_team_id
       JOIN league_teams rt ON rt.id = t.receiving_team_id
       WHERE t.league_id = $1 AND (t.proposing_team_id = $2 OR t.receiving_team_id = $2)
       ORDER BY t.created_at DESC`,
      [req.params.id, myTeam.id]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    const enrich = trade => ({
      ...trade,
      offeringPlayers: (trade.offering_players || []).map(id => playerMap.get(id)).filter(Boolean),
      requestingPlayers: (trade.requesting_players || []).map(id => playerMap.get(id)).filter(Boolean),
      isMine: trade.proposing_team_id === myTeam.id,
    });
    res.json({ trades: rows.map(enrich), myTeamId: myTeam.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get any team's roster (for trade proposal UI)
app.get('/api/leagues/:id/teams/:teamId/roster', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    const playerMap = new Map(players.map(p => [p.id, p]));
    const rosterIds = await getTeamRosterIds(parseInt(req.params.teamId), draft?.state);
    res.json(rosterIds.map(id => playerMap.get(id)).filter(Boolean));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/trades', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { receivingTeamId, offeringPlayers, requestingPlayers, note } = req.body;
  if (!receivingTeamId || !offeringPlayers?.length || !requestingPlayers?.length)
    return res.status(400).json({ error: 'receivingTeamId, offeringPlayers, and requestingPlayers required' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    if (myTeam.id === receivingTeamId) return res.status(400).json({ error: 'Cannot trade with yourself' });
    const { rows: [trade] } = await pool.query(
      'INSERT INTO trades (league_id, proposing_team_id, receiving_team_id, offering_players, requesting_players, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, myTeam.id, receivingTeamId, JSON.stringify(offeringPlayers), JSON.stringify(requestingPlayers), note || null]
    );
    res.json(trade);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/leagues/:id/trades/:tradeId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { action } = req.body; // 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be accept or reject' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rows: [trade] } = await pool.query(
      "SELECT * FROM trades WHERE id = $1 AND league_id = $2 AND status = 'pending'", [req.params.tradeId, req.params.id]
    );
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.receiving_team_id !== myTeam.id) return res.status(403).json({ error: 'Only the receiving team can respond' });
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await pool.query("UPDATE trades SET status = $1, responded_at = NOW() WHERE id = $2", [status, trade.id]);
    if (action === 'accept') {
      // Execute the trade: swap players
      for (const pid of trade.offering_players) {
        await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, trade.proposing_team_id, pid, 'drop', 'trade']);
        await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, trade.receiving_team_id, pid, 'add', 'trade']);
      }
      for (const pid of trade.requesting_players) {
        await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, trade.receiving_team_id, pid, 'drop', 'trade']);
        await pool.query('INSERT INTO roster_moves (league_id, team_id, player_id, action, source) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, trade.proposing_team_id, pid, 'add', 'trade']);
      }
      const { rows: tradeTeams } = await pool.query(
        'SELECT id, team_name FROM league_teams WHERE id = ANY($1)', [[trade.proposing_team_id, trade.receiving_team_id]]
      );
      const tMap = new Map(tradeTeams.map(t => [t.id, t.team_name]));
      const allPids = [...trade.offering_players, ...trade.requesting_players];
      await logTransaction(req.params.id, trade.proposing_team_id, tMap.get(trade.proposing_team_id), 'trade',
        `Trade with ${tMap.get(trade.receiving_team_id)}`, allPids);
      await logTransaction(req.params.id, trade.receiving_team_id, tMap.get(trade.receiving_team_id), 'trade',
        `Trade with ${tMap.get(trade.proposing_team_id)}`, allPids);
    }
    res.json({ ok: true, status });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/leagues/:id/trades/:tradeId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    const { rowCount } = await pool.query(
      "UPDATE trades SET status = 'cancelled', responded_at = NOW() WHERE id = $1 AND proposing_team_id = $2 AND status = 'pending'",
      [req.params.tradeId, myTeam.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Trade not found or already responded' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Playoffs ──────────────────────────────────────────────

app.get('/api/leagues/:id/playoffs', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: matchups } = await pool.query(
      `SELECT pm.*, ht.team_name as home_name, at2.team_name as away_name
       FROM playoff_matchups pm
       LEFT JOIN league_teams ht ON ht.id = pm.home_team_id
       LEFT JOIN league_teams at2 ON at2.id = pm.away_team_id
       WHERE pm.league_id = $1 ORDER BY pm.round DESC, pm.bracket_slot ASC`,
      [req.params.id]
    );
    res.json({ matchups, myTeamId: member.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Seed playoff bracket from current standings
app.post('/api/leagues/:id/playoffs/seed', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const playoffTeams = league.settings?.playoffTeams || 4;
    const startWeek = league.settings?.playoffStartWeek || 15;
    // Build standings to get seeds
    const { rows: teams } = await pool.query('SELECT id, team_name FROM league_teams WHERE league_id = $1', [req.params.id]);
    const { rows: matchups } = await pool.query(
      "SELECT * FROM matchups WHERE league_id = $1 AND status = 'complete'", [req.params.id]
    );
    const stats = {};
    for (const t of teams) stats[t.id] = { id: t.id, wins: 0, pf: 0 };
    for (const m of matchups) {
      const hs = parseFloat(m.home_score), as_ = parseFloat(m.away_score);
      if (stats[m.home_team_id]) { stats[m.home_team_id].pf += hs; if (hs > as_) stats[m.home_team_id].wins++; }
      if (stats[m.away_team_id]) { stats[m.away_team_id].pf += as_; if (as_ > hs) stats[m.away_team_id].wins++; }
    }
    const seeds = Object.values(stats).sort((a, b) => b.wins - a.wins || b.pf - a.pf).slice(0, playoffTeams);
    await pool.query('DELETE FROM playoff_matchups WHERE league_id = $1', [req.params.id]);
    const inserts = [];
    if (playoffTeams === 4) {
      // Round 2 (semis): slot 1 = 1v4, slot 2 = 2v3
      inserts.push([req.params.id, startWeek, 2, 1, seeds[0].id, seeds[3].id]);
      inserts.push([req.params.id, startWeek, 2, 2, seeds[1].id, seeds[2].id]);
      // Round 1 (final): TBD
      inserts.push([req.params.id, startWeek + 1, 1, 1, null, null]);
    } else if (playoffTeams === 6) {
      // Round 3 (QF): slot 1 = 3v6, slot 2 = 4v5; seeds 1&2 have byes
      inserts.push([req.params.id, startWeek, 3, 1, seeds[2].id, seeds[5].id]);
      inserts.push([req.params.id, startWeek, 3, 2, seeds[3].id, seeds[4].id]);
      // Round 2 (semis): seed 1 waits for QF-1 winner, seed 2 waits for QF-2 winner
      inserts.push([req.params.id, startWeek + 1, 2, 1, seeds[0].id, null]);
      inserts.push([req.params.id, startWeek + 1, 2, 2, seeds[1].id, null]);
      // Round 1 (final): TBD
      inserts.push([req.params.id, startWeek + 2, 1, 1, null, null]);
    } else if (playoffTeams === 8) {
      inserts.push([req.params.id, startWeek, 3, 1, seeds[0].id, seeds[7].id]);
      inserts.push([req.params.id, startWeek, 3, 2, seeds[1].id, seeds[6].id]);
      inserts.push([req.params.id, startWeek, 3, 3, seeds[2].id, seeds[5].id]);
      inserts.push([req.params.id, startWeek, 3, 4, seeds[3].id, seeds[4].id]);
      inserts.push([req.params.id, startWeek + 1, 2, 1, null, null]);
      inserts.push([req.params.id, startWeek + 1, 2, 2, null, null]);
      inserts.push([req.params.id, startWeek + 2, 1, 1, null, null]);
    }
    for (const [lid, week, round, slot, home, away] of inserts) {
      await pool.query(
        'INSERT INTO playoff_matchups (league_id, week, round, bracket_slot, home_team_id, away_team_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [lid, week, round, slot, home, away]
      );
    }
    res.json({ ok: true, playoffTeams, startWeek });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Score a playoff week and auto-advance winners
app.post('/api/leagues/:id/playoffs/score/:week', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT * FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const week = parseInt(req.params.week);
    const format = league.settings?.scoringFormat || 'half_ppr';
    const ptField = format === 'half_ppr' ? 'pts_half_ppr' : format === 'std' ? 'pts_std' : 'pts_ppr';
    const weekStats = await fetchJSON(`https://api.sleeper.app/v1/stats/nfl/regular/2025/${week}`).catch(() => ({}));
    const { rows: matchups } = await pool.query(
      "SELECT * FROM playoff_matchups WHERE league_id = $1 AND week = $2 AND status = 'scheduled'", [req.params.id, week]
    );
    if (!matchups.length) return res.status(404).json({ error: 'No playoff matchups found for this week' });
    const playerMap = new Map(players.map(p => [p.id, p]));
    for (const m of matchups) {
      const [homeScore, awayScore] = await Promise.all([
        m.home_team_id ? scoreTeamLineup(m.home_team_id, week, weekStats, playerMap, ptField) : Promise.resolve(0),
        m.away_team_id ? scoreTeamLineup(m.away_team_id, week, weekStats, playerMap, ptField) : Promise.resolve(0),
      ]);
      const winnerId = homeScore >= awayScore ? m.home_team_id : m.away_team_id;
      await pool.query(
        "UPDATE playoff_matchups SET home_score=$1, away_score=$2, winner_id=$3, status='complete' WHERE id=$4",
        [homeScore, awayScore, winnerId, m.id]
      );
      // Auto-advance winner to next round
      const nextRound = m.round - 1;
      if (nextRound >= 1) {
        const nextSlot = Math.ceil(m.bracket_slot / 2);
        const side = m.bracket_slot % 2 === 1 ? 'home_team_id' : 'away_team_id';
        await pool.query(
          `UPDATE playoff_matchups SET ${side} = $1 WHERE league_id = $2 AND round = $3 AND bracket_slot = $4`,
          [winnerId, req.params.id, nextRound, nextSlot]
        );
      }
    }
    res.json({ ok: true, week, scored: matchups.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Matchup Detail & Score Override ──────────────────────

app.get('/api/leagues/:id/matchups/:matchupId/detail', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: [matchup] } = await pool.query(
      `SELECT m.*, ht.team_name as home_name, at2.team_name as away_name, m.week
       FROM matchups m
       JOIN league_teams ht ON ht.id = m.home_team_id
       JOIN league_teams at2 ON at2.id = m.away_team_id
       WHERE m.id = $1 AND m.league_id = $2`,
      [req.params.matchupId, req.params.id]
    );
    if (!matchup) return res.status(404).json({ error: 'Matchup not found' });
    const { rows: [league] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const format = league?.settings?.scoringFormat || 'half_ppr';
    const ptField = format === 'half_ppr' ? 'pts_half_ppr' : format === 'std' ? 'pts_std' : 'pts_ppr';
    const weekStats = await fetchJSON(`https://api.sleeper.app/v1/stats/nfl/regular/2025/${matchup.week}`).catch(() => ({}));
    const playerMap = new Map(players.map(p => [p.id, p]));
    const [homeDetail, awayDetail] = await Promise.all([
      getLineupWithScores(matchup.home_team_id, matchup.week, weekStats, playerMap, ptField),
      getLineupWithScores(matchup.away_team_id, matchup.week, weekStats, playerMap, ptField),
    ]);
    res.json({
      matchupId: matchup.id,
      week: matchup.week,
      status: matchup.status,
      home: { teamId: matchup.home_team_id, name: matchup.home_name, score: parseFloat(matchup.home_score) || 0, ...homeDetail },
      away: { teamId: matchup.away_team_id, name: matchup.away_name, score: parseFloat(matchup.away_score) || 0, ...awayDetail },
      myTeamId: member.id,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/leagues/:id/matchups/:matchupId/override', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const { homeScore, awayScore } = req.body;
    if (homeScore == null || awayScore == null) return res.status(400).json({ error: 'homeScore and awayScore required' });
    await pool.query(
      "UPDATE matchups SET home_score=$1, away_score=$2, status='complete' WHERE id=$3 AND league_id=$4",
      [parseFloat(homeScore), parseFloat(awayScore), req.params.matchupId, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Power Rankings ────────────────────────────────────────

app.get('/api/leagues/:id/power-rankings', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: teams } = await pool.query(
      'SELECT id, team_name FROM league_teams WHERE league_id = $1', [req.params.id]
    );
    const { rows: matchups } = await pool.query(
      "SELECT * FROM matchups WHERE league_id = $1 AND status = 'complete' ORDER BY week", [req.params.id]
    );
    // Collect weekly scores per team
    const weekScores = {}; // teamId -> [{ week, score }]
    for (const t of teams) weekScores[t.id] = [];
    for (const m of matchups) {
      if (weekScores[m.home_team_id]) weekScores[m.home_team_id].push({ week: m.week, score: parseFloat(m.home_score) });
      if (weekScores[m.away_team_id]) weekScores[m.away_team_id].push({ week: m.week, score: parseFloat(m.away_score) });
    }
    // All-play record: each week, count how many teams you outscored
    const rankings = teams.map(t => {
      const scores = weekScores[t.id];
      let allPlayWins = 0, allPlayLosses = 0, totalPF = 0;
      for (const { week, score } of scores) {
        totalPF += score;
        const weekAllScores = teams
          .filter(ot => ot.id !== t.id)
          .map(ot => weekScores[ot.id].find(s => s.week === week)?.score ?? 0);
        allPlayWins += weekAllScores.filter(s => score > s).length;
        allPlayLosses += weekAllScores.filter(s => score < s).length;
      }
      // Actual record
      let wins = 0, losses = 0;
      for (const m of matchups) {
        if (m.home_team_id === t.id) { parseFloat(m.home_score) > parseFloat(m.away_score) ? wins++ : losses++; }
        else if (m.away_team_id === t.id) { parseFloat(m.away_score) > parseFloat(m.home_score) ? wins++ : losses++; }
      }
      return { teamId: t.id, teamName: t.team_name, wins, losses, allPlayWins, allPlayLosses, totalPF: Math.round(totalPF * 100) / 100 };
    }).sort((a, b) => b.allPlayWins - a.allPlayWins || b.totalPF - a.totalPF);
    res.json({ rankings, myTeamId: member.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Transaction Log ───────────────────────────────────────

app.get('/api/leagues/:id/transactions', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const limit = parseInt(req.query.limit) || 50;
    const { rows } = await pool.query(
      'SELECT * FROM transactions WHERE league_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.params.id, limit]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    const enriched = rows.map(tx => ({
      ...tx,
      players: (tx.player_ids || []).map(id => playerMap.get(id)).filter(Boolean),
    }));
    res.json(enriched);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Draft recap
app.get('/api/leagues/:id/draft-recap', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member && league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Not a member' });
    const { rows: [row] } = await pool.query('SELECT * FROM drafts WHERE league_id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'No draft found' });
    const state = row.state;
    const picks = state.picks || [];
    if (picks.length === 0) return res.json({ picks: [], numTeams: 0, totalRounds: state.rounds || 0 });
    const { rows: leagueTeams } = await pool.query(
      'SELECT team_name, draft_slot FROM league_teams WHERE league_id = $1', [req.params.id]
    );
    const slotToTeam = new Map(leagueTeams.map(t => [t.draft_slot, t.team_name]));
    const playerMap = new Map(players.map(p => [p.id, p]));
    const enrichedPicks = picks.map(pick => {
      const player = playerMap.get(pick.playerId);
      const teamName = slotToTeam.get(pick.teamIndex + 1) || state.teams?.[pick.teamIndex] || `Team ${pick.teamIndex + 1}`;
      const adp = player?.adp || null;
      const adpDiff = adp != null ? Math.round(adp - pick.pickNumber) : null;
      return {
        pickNumber: pick.pickNumber,
        round: pick.round,
        teamIndex: pick.teamIndex,
        teamName,
        playerId: pick.playerId,
        playerName: player?.name || `Player #${pick.playerId}`,
        position: player?.position || '?',
        nflTeam: player?.team || '',
        adp,
        adpDiff,
      };
    });
    res.json({ picks: enrichedPicks, numTeams: state.teams?.length || leagueTeams.length, totalRounds: state.rounds });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Draft Queue ───────────────────────────────────────────

app.get('/api/leagues/:id/queue', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: [row] } = await pool.query(
      'SELECT player_ids FROM draft_queues WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const playerMap = new Map(players.map(p => [p.id, p]));
    const ids = row?.player_ids || [];
    res.json(ids.map(id => playerMap.get(id)).filter(Boolean));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/leagues/:id/queue', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { playerIds } = req.body;
  if (!Array.isArray(playerIds)) return res.status(400).json({ error: 'playerIds must be an array' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    await pool.query(`
      INSERT INTO draft_queues (league_id, user_id, player_ids, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (league_id, user_id) DO UPDATE SET player_ids = $3, updated_at = NOW()
    `, [req.params.id, req.user.id, JSON.stringify(playerIds)]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get draft queue by user_id (for auto-pick in live draft)
app.get('/api/leagues/:id/queue/:userId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const { rows: [row] } = await pool.query(
      'SELECT player_ids FROM draft_queues WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ playerIds: row?.player_ids || [] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Announcements ─────────────────────────────────────────

app.get('/api/leagues/:id/announcements', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!member && league?.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Not a member' });
    const { rows } = await pool.query(
      'SELECT * FROM announcements WHERE league_id = $1 ORDER BY pinned DESC, created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/announcements', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { message, pinned = false } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!league) return res.status(404).json({ error: 'League not found' });
    if (league.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    const { rows: [myTeam] } = await pool.query(
      'SELECT team_name FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    const { rows: [ann] } = await pool.query(
      'INSERT INTO announcements (league_id, user_id, team_name, message, pinned) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.id, myTeam?.team_name || 'Commissioner', message.trim(), pinned]
    );
    res.json(ann);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/leagues/:id/announcements/:annId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (league?.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Commissioners only' });
    await pool.query('DELETE FROM announcements WHERE id = $1 AND league_id = $2', [req.params.annId, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── League Chat ───────────────────────────────────────────

app.get('/api/leagues/:id/chat', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!member && league?.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Not a member' });
    const since = req.query.since;
    const query = since
      ? 'SELECT * FROM chat_messages WHERE league_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 100'
      : 'SELECT * FROM chat_messages WHERE league_id = $1 ORDER BY created_at DESC LIMIT 100';
    const { rows } = await pool.query(query, since ? [req.params.id, since] : [req.params.id]);
    res.json(since ? rows : rows.reverse());
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/leagues/:id/chat', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id, team_name FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    const { rows: [league] } = await pool.query('SELECT commissioner_id FROM leagues WHERE id = $1', [req.params.id]);
    if (!member && league?.commissioner_id !== req.user.id) return res.status(403).json({ error: 'Not a member' });
    const { rows: [msg] } = await pool.query(
      'INSERT INTO chat_messages (league_id, user_id, team_name, message) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, req.user.id, member?.team_name || 'Commissioner', message.trim()]
    );
    res.json(msg);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Player Owner Lookup ───────────────────────────────────

app.get('/api/leagues/:id/player-owner/:playerId', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [member] } = await pool.query(
      'SELECT id FROM league_teams WHERE league_id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const playerId = parseInt(req.params.playerId);
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    const { rows: [{ settings: ownerSettings }] } = await pool.query('SELECT settings FROM leagues WHERE id = $1', [req.params.id]);
    const ownerSport = ownerSettings?.sport || 'nfl';
    const ownerPlayers = await loadSportPlayers(ownerSport);
    const { rows: allTeams } = await pool.query(
      'SELECT id, team_name, draft_slot FROM league_teams WHERE league_id = $1', [req.params.id]
    );
    for (const team of allTeams) {
      const roster = await getTeamRosterIds(team.id, draft?.state);
      if (roster.includes(playerId)) {
        const player = ownerPlayers.find(p => p.id === playerId);
        return res.json({ owner: { teamId: team.id, teamName: team.team_name }, player: player || null });
      }
    }
    res.json({ owner: null, player: ownerPlayers.find(p => p.id === playerId) || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── Player News & Trending ────────────────────────────────

let sleeperTrendingCache = null;
let sleeperTrendingExpiry = 0;

app.get('/api/players/news', requireAuth, async (_req, res) => {
  try {
    const now = Date.now();
    if (!sleeperTrendingCache || now > sleeperTrendingExpiry) {
      const [adds, drops] = await Promise.all([
        fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25').catch(() => []),
        fetchJSON('https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=25').catch(() => []),
      ]);
      sleeperTrendingCache = { adds, drops };
      sleeperTrendingExpiry = now + 15 * 60 * 1000; // 15-min cache
    }
    const playerMap = new Map(players.map(p => [p.id, p]));
    const enrichTrending = (list, action) => list.map(item => {
      const slId = item.player_id;
      // Find player by sleeper ID
      const player = slId && sleeperNameMap
        ? players.find(p => {
            const sid = p.position === 'DST' ? `TEAM_${p.team}` : sleeperNameMap[normalizeName(p.name)];
            return sid === slId;
          })
        : null;
      return player ? { ...player, count: item.count, action } : null;
    }).filter(Boolean);
    // Injured players from our player list
    const injured = players.filter(p => {
      const sid = p.position === 'DST' ? `TEAM_${p.team}` : (sleeperNameMap ? sleeperNameMap[normalizeName(p.name)] : null);
      const meta = sid && sleeperPlayerMeta ? sleeperPlayerMeta[sid] : null;
      return meta?.injuryStatus && ['Out', 'IR', 'Doubtful', 'Questionable'].includes(meta.injuryStatus);
    }).map(p => {
      const sid = p.position === 'DST' ? `TEAM_${p.team}` : sleeperNameMap[normalizeName(p.name)];
      return { ...p, injuryStatus: sleeperPlayerMeta[sid]?.injuryStatus, injuryBodyPart: sleeperPlayerMeta[sid]?.injuryBodyPart };
    }).slice(0, 30);
    res.json({
      trending_adds: enrichTrending(sleeperTrendingCache.adds, 'add'),
      trending_drops: enrichTrending(sleeperTrendingCache.drops, 'drop'),
      injured,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Player name search (all players, sorted by ADP)
app.get('/api/players/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (q.length < 2) return res.json([]);
  const searchSport = req.query.sport || 'nfl';
  const searchPlayers = await loadSportPlayers(searchSport);
  const results = searchPlayers
    .filter(p => p.name?.toLowerCase().includes(q))
    .sort((a, b) => (a.adp || 9999) - (b.adp || 9999))
    .slice(0, 12);
  res.json(results.map(p => ({ id: p.id, name: p.name, position: p.position, team: p.team, adp: p.adp, injury_status: p.injury_status })));
});

// ── Production static ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
