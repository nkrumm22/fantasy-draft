import React, { useState, useEffect, useRef, useCallback } from 'react';

const POS_COLORS = {
  QB:  { bg: '#2c4a6e', color: '#63b3ed' },
  RB:  { bg: '#1a3a1a', color: '#68d391' },
  WR:  { bg: '#44337a', color: '#b794f4' },
  TE:  { bg: '#744210', color: '#f6ad55' },
  K:   { bg: '#1a2d48', color: '#90cdf4' },
  DST: { bg: '#2d1515', color: '#fc8181' },
};

const INJURY_COLORS = {
  Out:         { bg: '#2d1515', color: '#fc8181' },
  IR:          { bg: '#2d1515', color: '#fc8181' },
  Doubtful:    { bg: '#744210', color: '#f6ad55' },
  Questionable:{ bg: '#744210', color: '#fbd38d' },
};

const s = {
  wrapper: { padding: '1.25rem 0' },
  sectionTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#a0aec0', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem' },
  playerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #1a2035' },
  playerRowLast: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0' },
  playerName: { fontSize: '0.875rem', fontWeight: '700', color: '#e2e8f0' },
  playerMeta: { fontSize: '0.72rem', color: '#718096' },
  posBadge: { fontSize: '0.65rem', fontWeight: '700', padding: '0.1rem 0.4rem', borderRadius: '4px', marginRight: '0.35rem', flexShrink: 0 },
  countBadge: { fontSize: '0.72rem', fontWeight: '700', background: '#1a2d48', color: '#90cdf4', padding: '0.15rem 0.5rem', borderRadius: '20px', flexShrink: 0 },
  injuryChip: { fontSize: '0.7rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '4px', flexShrink: 0 },
  injuryBody: { fontSize: '0.7rem', color: '#4a5568', marginTop: '0.15rem' },
  empty: { color: '#4a5568', fontSize: '0.85rem', padding: '0.75rem 0', textAlign: 'center' },
  loading: { color: '#4a5568', padding: '2rem', textAlign: 'center' },
  // Search section
  searchCard: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem' },
  searchTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#a0aec0', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  searchInput: {
    width: '100%', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px',
    color: '#e2e8f0', fontSize: '0.875rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box',
    fontFamily: 'inherit', marginBottom: '0.75rem',
  },
  searchResult: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1a2035' },
  whoHasBtn: {
    padding: '0.2rem 0.6rem', background: '#2c4a6e', border: 'none', borderRadius: '6px',
    color: '#63b3ed', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0,
  },
  ownerResult: { fontSize: '0.78rem', color: '#68d391', marginTop: '0.2rem' },
  ownerFree: { fontSize: '0.78rem', color: '#718096', marginTop: '0.2rem' },
};

function PosBadge({ position }) {
  const colors = POS_COLORS[position] || { bg: '#1a2035', color: '#718096' };
  return (
    <span style={{ ...s.posBadge, background: colors.bg, color: colors.color }}>
      {position}
    </span>
  );
}

function InjuryChip({ status }) {
  const colors = INJURY_COLORS[status] || { bg: '#1a2035', color: '#718096' };
  return (
    <span style={{ ...s.injuryChip, background: colors.bg, color: colors.color }}>
      {status}
    </span>
  );
}

// ---- Who Has Search ----
function WhoHasSearch({ leagueId, token }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [owners, setOwners] = useState({}); // playerId -> { owner, loading }
  const debounceRef = useRef(null);
  const auth = { Authorization: `Bearer ${token}` };

  const search = useCallback((q) => {
    if (!q.trim()) { setResults([]); return; }
    fetch(`/api/players?search=${encodeURIComponent(q)}`, { headers: auth })
      .then(r => r.json())
      .then(d => setResults(Array.isArray(d) ? d.slice(0, 10) : []))
      .catch(() => setResults([]));
  }, [token]);

  const onQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const whoHas = async (playerId) => {
    setOwners(prev => ({ ...prev, [playerId]: { loading: true, owner: null } }));
    try {
      const r = await fetch(`/api/leagues/${leagueId}/player-owner/${playerId}`, { headers: auth });
      const d = await r.json();
      setOwners(prev => ({ ...prev, [playerId]: { loading: false, owner: d } }));
    } catch {
      setOwners(prev => ({ ...prev, [playerId]: { loading: false, owner: null } }));
    }
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  if (!leagueId) return null;

  return (
    <div style={s.searchCard}>
      <div style={s.searchTitle}>Who Has This Player?</div>
      <input
        style={s.searchInput}
        placeholder="Search player name..."
        value={query}
        onChange={onQueryChange}
      />
      {results.length > 0 && (
        <div>
          {results.map((p, i) => {
            const ownerState = owners[p.id];
            const isLast = i === results.length - 1;
            return (
              <div key={p.id} style={isLast ? s.playerRowLast : s.searchResult}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                  <PosBadge position={p.position} />
                  <div style={{ minWidth: 0 }}>
                    <div style={s.playerName}>{p.name}</div>
                    <div style={s.playerMeta}>{p.team}</div>
                    {ownerState && !ownerState.loading && (
                      ownerState.owner?.teamName
                        ? <div style={s.ownerResult}>Owned by: {ownerState.owner.teamName}</div>
                        : <div style={s.ownerFree}>Free Agent</div>
                    )}
                  </div>
                </div>
                <button
                  style={s.whoHasBtn}
                  onClick={() => whoHas(p.id)}
                  disabled={ownerState?.loading}
                >
                  {ownerState?.loading ? '...' : 'Who has?'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {query.trim() && results.length === 0 && (
        <div style={s.empty}>No players found</div>
      )}
    </div>
  );
}

// ---- Player row for trending lists ----
function TrendingRow({ player, showCount, isLast }) {
  const rowStyle = isLast ? s.playerRowLast : s.playerRow;
  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <PosBadge position={player.position} />
        <div>
          <div style={s.playerName}>{player.name}</div>
          <div style={s.playerMeta}>{player.team}</div>
        </div>
      </div>
      {showCount && (
        <span style={s.countBadge}>+{player.count.toLocaleString()}</span>
      )}
    </div>
  );
}

// ---- Injury row ----
function InjuryRow({ player, isLast }) {
  const rowStyle = isLast ? s.playerRowLast : s.playerRow;
  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
        <PosBadge position={player.position} />
        <div>
          <div style={s.playerName}>{player.name}</div>
          <div style={s.playerMeta}>{player.team}</div>
          {player.injuryBodyPart && (
            <div style={s.injuryBody}>{player.injuryBodyPart}</div>
          )}
        </div>
      </div>
      <InjuryChip status={player.injuryStatus} />
    </div>
  );
}

// ---- Main Export ----
export default function PlayerNews({ leagueId, token }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setLoading(true);
    fetch('/api/players/news', { headers: auth })
      .then(r => r.json())
      .then(d => { setNews(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={s.loading}>Loading player news...</div>;

  const trendingAdds = news?.trending_adds || [];
  const trendingDrops = news?.trending_drops || [];
  const injured = news?.injured || [];
  const hasTrending = trendingAdds.length > 0 || trendingDrops.length > 0;

  return (
    <div style={s.wrapper}>
      <WhoHasSearch leagueId={leagueId} token={token} />

      {hasTrending && (
        <>
          {/* Trending Adds */}
          {trendingAdds.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>🔥 Trending Adds (last 24h)</div>
              {trendingAdds.map((p, i) => (
                <TrendingRow key={p.id} player={p} showCount isLast={i === trendingAdds.length - 1} />
              ))}
            </div>
          )}

          {/* Trending Drops */}
          {trendingDrops.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionTitle}>📉 Trending Drops (last 24h)</div>
              {trendingDrops.map((p, i) => (
                <TrendingRow key={p.id} player={p} showCount={false} isLast={i === trendingDrops.length - 1} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Injury Report — always shown if data present */}
      {injured.length > 0 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>🏥 Injury Report</div>
          {injured.map((p, i) => (
            <InjuryRow key={p.id} player={p} isLast={i === injured.length - 1} />
          ))}
        </div>
      )}

      {!hasTrending && injured.length === 0 && (
        <div style={{ ...s.card, ...s.empty }}>No player news available</div>
      )}
    </div>
  );
}
