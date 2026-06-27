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
  `);
  await pool.query(`ALTER TABLE drafts ADD COLUMN IF NOT EXISTS league_id INTEGER REFERENCES leagues(id)`);
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

let sleeperNameMap = null;
let sleeperSeasonStats = null;
let sleeperPlayerMeta = null; // sleeper id → { byeWeek, injuryStatus, injuryBodyPart }

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

// ── Fantasy scoring ───────────────────────────────────────
async function scoreTeamLineup(teamId, week, weekStats, playerMap, ptField) {
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
    const sleeperId = player.position === 'DST'
      ? `TEAM_${player.team}`
      : (sleeperNameMap ? sleeperNameMap[normalizeName(player.name)] : null);
    if (!sleeperId || !weekStats[sleeperId]) continue;
    total += weekStats[sleeperId][ptField] || 0;
  }
  return Math.round(total * 100) / 100;
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
app.get('/api/players', (req, res) => {
  const { position, search } = req.query;
  let list = players.map(p => {
    const sleeperId = p.position === 'DST'
      ? `TEAM_${p.team}`
      : (sleeperNameMap ? sleeperNameMap[normalizeName(p.name)] : null);
    const meta = sleeperId && sleeperPlayerMeta ? sleeperPlayerMeta[sleeperId] : null;
    return { ...p, byeWeek: meta?.byeWeek ?? null, injuryStatus: meta?.injuryStatus ?? null, injuryBodyPart: meta?.injuryBodyPart ?? null };
  });
  if (position && position !== 'ALL') list = list.filter(p => p.position === position);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
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
    const state = { teams, rounds, scoringFormat, timerSeconds, pickOrder, picks: [], currentPickIndex: 0, availablePlayers: players.map(p => p.id) };
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
  const { name, teamName, settings = {} } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'League name is required' });
  if (!teamName?.trim()) return res.status(400).json({ error: 'Your team name is required' });
  try {
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
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
    res.json({ ...draftState, isOwner, myTeamIndex });
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

app.get('/api/leagues/:id/roster', requireAuth, async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { rows: [myTeam] } = await pool.query(
      'SELECT * FROM league_teams WHERE league_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!myTeam) return res.status(403).json({ error: 'Not a member' });
    if (myTeam.draft_slot === null) return res.json([]);
    const { rows: [draft] } = await pool.query('SELECT state FROM drafts WHERE league_id = $1', [req.params.id]);
    if (!draft) return res.json([]);
    const teamIndex = myTeam.draft_slot - 1;
    const playerMap = new Map(players.map(p => [p.id, p]));
    const roster = draft.state.picks
      .filter(p => p.teamIndex === teamIndex)
      .map(pick => ({ ...playerMap.get(pick.playerId), pickNumber: pick.pickNumber }))
      .filter(Boolean);
    res.json(roster);
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
    const format = league.settings?.scoringFormat || 'half_ppr';
    const ptField = format === 'half_ppr' ? 'pts_half_ppr' : format === 'std' ? 'pts_std' : 'pts_ppr';
    const weekStats = await fetchJSON(`https://api.sleeper.app/v1/stats/nfl/regular/2025/${week}`).catch(() => ({}));
    const { rows: matchups } = await pool.query(
      'SELECT * FROM matchups WHERE league_id = $1 AND week = $2', [req.params.id, week]
    );
    if (!matchups.length) return res.status(404).json({ error: 'No matchups found for this week' });
    const playerMap = new Map(players.map(p => [p.id, p]));
    for (const m of matchups) {
      const [homeScore, awayScore] = await Promise.all([
        scoreTeamLineup(m.home_team_id, week, weekStats, playerMap, ptField),
        scoreTeamLineup(m.away_team_id, week, weekStats, playerMap, ptField),
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
    for (const t of teams) stats[t.id] = { teamId: t.id, teamName: t.team_name, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, results: [] };
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

// ── Production static ─────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
