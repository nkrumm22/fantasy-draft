import React, { useState, useEffect } from 'react';

const s = {
  wrapper: { padding: '1.25rem 0' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.85rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' },
  typeChip: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.65rem', borderRadius: '5px', padding: '0.15rem 0.45rem', letterSpacing: '0.03em', flexShrink: 0 },
  teamName: { fontSize: '0.9rem', fontWeight: '700', color: '#e2e8f0', flex: 1 },
  timestamp: { fontSize: '0.72rem', color: '#4a5568', whiteSpace: 'nowrap' },
  description: { fontSize: '0.82rem', color: '#a0aec0', marginBottom: '0.6rem', lineHeight: '1.45' },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  pill: { fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.55rem', borderRadius: '20px', background: '#1a2035', border: '1px solid #2d3748', color: '#a0aec0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' },
  pillPos: { fontSize: '0.62rem', fontWeight: '800', padding: '0.05rem 0.3rem', borderRadius: '3px' },
  empty: { color: '#4a5568', fontSize: '0.875rem', textAlign: 'center', padding: '2.5rem 0' },
  loading: { color: '#4a5568', padding: '2rem' },
};

const TYPE_CONFIG = {
  waiver:     { label: 'W',  chipBg: '#2c4a6e', chipFg: '#63b3ed', fullLabel: 'Waiver' },
  trade:      { label: 'T',  chipBg: '#44337a', chipFg: '#b794f4', fullLabel: 'Trade' },
  free_agent: { label: 'FA', chipBg: '#1a3a1a', chipFg: '#68d391', fullLabel: 'Free Agent' },
};

const POS_COLORS = {
  QB: ['#2c4a6e', '#63b3ed'],
  RB: ['#1a3a1a', '#68d391'],
  WR: ['#44337a', '#b794f4'],
  TE: ['#744210', '#f6ad55'],
  K:  ['#1a2d48', '#90cdf4'],
  DST: ['#2d1515', '#fc8181'],
};

function relativeTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Transactions({ leagueId, token }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [leagueId, token]);

  if (loading) return <div style={s.loading}>Loading transactions...</div>;

  return (
    <div style={s.wrapper}>
      {transactions.length === 0 ? (
        <div style={s.empty}>No transactions yet</div>
      ) : (
        transactions.map(tx => {
          const cfg = TYPE_CONFIG[tx.type] || { label: tx.type?.toUpperCase().slice(0, 2) || '?', chipBg: '#1a2035', chipFg: '#718096', fullLabel: tx.type };
          const players = Array.isArray(tx.players) ? tx.players : [];
          return (
            <div key={tx.id} style={s.card}>
              <div style={s.cardHeader}>
                <span
                  style={{ ...s.typeChip, background: cfg.chipBg, color: cfg.chipFg }}
                  title={cfg.fullLabel}
                >
                  {cfg.label}
                </span>
                <span style={s.teamName}>{tx.team_name}</span>
                <span style={s.timestamp}>{relativeTime(tx.created_at)}</span>
              </div>
              {tx.description && (
                <div style={s.description}>{tx.description}</div>
              )}
              {players.length > 0 && (
                <div style={s.pillRow}>
                  {players.map(p => {
                    const [posBg, posFg] = POS_COLORS[p.position] || ['#1a2035', '#718096'];
                    return (
                      <span key={p.id} style={s.pill}>
                        <span style={{ ...s.pillPos, background: posBg, color: posFg }}>{p.position}</span>
                        {p.name}
                        {p.team && <span style={{ color: '#4a5568' }}>{p.team}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
