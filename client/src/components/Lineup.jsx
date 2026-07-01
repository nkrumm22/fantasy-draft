import React, { useState, useEffect, useMemo } from 'react';

const POS_COLOR = {
  QB: '#9f7aea', RB: '#68d391', WR: '#63b3ed', TE: '#f6ad55', DST: '#fc8181', K: '#b794f4',
  PG: '#63b3ed', SG: '#76e4f7', SF: '#68d391', PF: '#f6ad55', C: '#fc8181',
  P: '#9f7aea', '1B': '#68d391', '2B': '#63b3ed', '3B': '#f6ad55', SS: '#fc8181', OF: '#76e4f7', UTIL: '#b794f4',
  LW: '#68d391', RW: '#63b3ed', D: '#f6ad55', G: '#fc8181',
  GKP: '#9f7aea', DEF: '#68d391', MID: '#63b3ed', FWD: '#fc8181',
};

const s = {
  wrapper: { padding: '1.25rem 0' },
  topBar: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  weekLabel: { fontSize: '0.8rem', color: '#718096', fontWeight: '600', textTransform: 'uppercase' },
  weekSelect: { padding: '0.4rem 0.7rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.875rem', colorScheme: 'dark' },
  counter: { fontSize: '0.82rem', color: '#718096', marginLeft: 'auto' },
  counterOk: { color: '#68d391' },
  autoBtn: { padding: '0.5rem 1.1rem', background: 'transparent', border: '1px solid #276749', borderRadius: '8px', color: '#68d391', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  autoBtnBusy: { opacity: 0.5, cursor: 'not-allowed' },
  saveBtn: { padding: '0.5rem 1.1rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  saveBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  savedMsg: { fontSize: '0.8rem', color: '#68d391' },
  columns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  colTitle: { fontSize: '0.72rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' },
  playerCard: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', background: '#0f1420', border: '1px solid #2d3748', borderRadius: '8px', marginBottom: '0.4rem', cursor: 'pointer', userSelect: 'none' },
  playerCardStarter: { background: '#0f1f0f', borderColor: '#276749' },
  playerCardIR: { background: '#1a0f0f', borderColor: '#742a2a' },
  posBadge: { fontSize: '0.65rem', fontWeight: '800', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#000', flexShrink: 0 },
  injuryBadge: { fontSize: '0.6rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '4px', flexShrink: 0 },
  playerName: { fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0', flex: 1 },
  playerMeta: { fontSize: '0.72rem', color: '#718096' },
  toggleIcon: { fontSize: '0.85rem', color: '#4a5568', flexShrink: 0 },
  toggleIconOn: { color: '#68d391' },
  irSection: { marginTop: '1.25rem', borderTop: '1px solid #2d3748', paddingTop: '1rem' },
  irTitle: { fontSize: '0.72rem', fontWeight: '700', color: '#fc8181', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  irHint: { fontSize: '0.72rem', color: '#4a5568', marginBottom: '0.6rem' },
  empty: { textAlign: 'center', padding: '3rem 1rem', color: '#4a5568' },
  emptyTitle: { fontSize: '1rem', fontWeight: '600', color: '#718096', marginBottom: '0.4rem' },
  error: { color: '#fc8181', fontSize: '0.82rem', marginTop: '0.4rem' },
};

const IR_ELIGIBLE = new Set(['Out', 'IR', 'Doubtful', 'PUP', 'Sus', 'Suspended', 'NFI']);

function injuryBadge(status) {
  if (!status) return null;
  const isSerious = status === 'Out' || status === 'IR' || status === 'PUP' || status === 'Sus' || status === 'Suspended' || status === 'NFI';
  const label = status === 'Questionable' ? 'Q' : status === 'Doubtful' ? 'D' : status === 'Out' ? 'OUT' : status === 'IR' ? 'IR' : status.slice(0, 3).toUpperCase();
  const bg = status === 'Questionable' ? '#2d2007' : '#2d1515';
  const color = status === 'Questionable' ? '#f6ad55' : '#fc8181';
  return { label, bg, color };
}

export default function Lineup({ leagueId, token, settings }) {
  const [roster, setRoster] = useState([]);
  const [starters, setStarters] = useState(new Set());
  const [irSlot, setIrSlot] = useState(new Set());
  const [week, setWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');

  const totalStarters = useMemo(() => {
    if (!settings?.rosterSlots) return 9;
    return Object.entries(settings.rosterSlots)
      .filter(([slot]) => slot !== 'BN')
      .reduce((sum, [, n]) => sum + n, 0);
  }, [settings]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leagues/${leagueId}/roster`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/leagues/${leagueId}/lineup/${week}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([rosterData, lineupData]) => {
      setRoster(Array.isArray(rosterData) ? rosterData : []);
      setStarters(new Set(lineupData.starters || []));
      setIrSlot(new Set(lineupData.irSlot || []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [leagueId, week]);

  const toggle = (playerId) => {
    setSaved(false);
    setStarters(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (next.size < totalStarters) {
        next.add(playerId);
      }
      return next;
    });
  };

  const autoSet = async () => {
    setSuggesting(true);
    setError('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/lineup/suggest/${week}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (r.ok && Array.isArray(data.starters) && data.starters.length > 0) {
        setStarters(new Set(data.starters));
        setSaved(false);
      } else {
        setError('Could not generate a lineup suggestion.');
      }
    } catch { setError('Connection error.'); }
    finally { setSuggesting(false); }
  };

  const toggleIR = (playerId) => {
    const player = roster.find(p => p.id === playerId);
    if (!player) return;
    setSaved(false);
    setIrSlot(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else if (IR_ELIGIBLE.has(player.injuryStatus)) {
        next.add(playerId);
        setStarters(s => { const ns = new Set(s); ns.delete(playerId); return ns; });
      }
      return next;
    });
  };

  const saveLineup = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/leagues/${leagueId}/lineup/${week}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ starters: [...starters], irSlot: [...irSlot] }),
      });
      if (!r.ok) { setError('Failed to save'); return; }
      setSaved(true);
    } catch { setError('Connection error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ color: '#4a5568', padding: '2rem' }}>Loading roster...</div>;

  if (roster.length === 0) {
    return (
      <div style={s.empty}>
        <div style={s.emptyTitle}>No roster found</div>
        <div style={{ fontSize: '0.85rem' }}>Complete the draft first to set your lineup.</div>
      </div>
    );
  }

  const starterList = roster.filter(p => starters.has(p.id));
  const irList = roster.filter(p => irSlot.has(p.id));
  const benchList = roster.filter(p => !starters.has(p.id) && !irSlot.has(p.id));
  const irEligibleOnBench = benchList.filter(p => IR_ELIGIBLE.has(p.injuryStatus));
  const isComplete = starters.size === totalStarters;

  const PlayerCard = ({ p, isStarter, isIR }) => {
    const inj = injuryBadge(p.injuryStatus);
    const canGoIR = !isStarter && !isIR && IR_ELIGIBLE.has(p.injuryStatus);
    return (
      <div
        style={{ ...s.playerCard, ...(isStarter ? s.playerCardStarter : isIR ? s.playerCardIR : {}) }}
        onClick={() => isIR ? toggleIR(p.id) : toggle(p.id)}
        title={isIR ? 'Click to move off IR' : isStarter ? 'Click to bench' : starters.size >= totalStarters ? 'Lineup full' : 'Click to start'}
      >
        <span style={{ ...s.posBadge, background: POS_COLOR[p.position] || '#4a5568' }}>{p.position}</span>
        {inj && <span style={{ ...s.injuryBadge, background: inj.bg, color: inj.color }}>{inj.label}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.playerName}>{p.name}</div>
          <div style={s.playerMeta}>{p.team}</div>
        </div>
        {canGoIR && (
          <span
            style={{ fontSize: '0.65rem', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '4px', padding: '0.1rem 0.35rem', cursor: 'pointer', flexShrink: 0 }}
            onClick={e => { e.stopPropagation(); toggleIR(p.id); }}
            title="Move to IR slot"
          >IR</span>
        )}
        <span style={{ ...s.toggleIcon, ...(isStarter ? s.toggleIconOn : {}) }}>
          {isIR ? '🏥' : isStarter ? '✓' : '+'}
        </span>
      </div>
    );
  };

  return (
    <div style={s.wrapper}>
      <div style={s.topBar}>
        <span style={s.weekLabel}>Week</span>
        <select style={s.weekSelect} value={week} onChange={e => setWeek(parseInt(e.target.value))}>
          {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </select>
        <span style={{ ...s.counter, ...(isComplete ? s.counterOk : {}) }}>
          {starters.size}/{totalStarters} starters set
        </span>
        <button
          style={{ ...s.autoBtn, ...(suggesting ? s.autoBtnBusy : {}) }}
          onClick={autoSet}
          disabled={suggesting}
          title="Auto-fills the best projected lineup using Sleeper projections"
        >
          {suggesting ? 'Loading...' : 'Best Lineup'}
        </button>
        <button
          style={{ ...s.saveBtn, ...(!isComplete || saving ? s.saveBtnDisabled : {}) }}
          onClick={saveLineup}
          disabled={!isComplete || saving}
        >
          {saving ? 'Saving...' : 'Save Lineup'}
        </button>
        {saved && <span style={s.savedMsg}>Saved!</span>}
      </div>
      {error && <div style={s.error}>{error}</div>}

      <div style={s.columns}>
        <div>
          <div style={s.colTitle}>Starting ({starterList.length}/{totalStarters})</div>
          {starterList.length === 0
            ? <div style={{ fontSize: '0.82rem', color: '#4a5568', padding: '0.5rem 0' }}>Click players to add them here</div>
            : starterList.map(p => <PlayerCard key={p.id} p={p} isStarter />)
          }
        </div>
        <div>
          <div style={s.colTitle}>Bench ({benchList.length})</div>
          {benchList.map(p => <PlayerCard key={p.id} p={p} isStarter={false} />)}
        </div>
      </div>

      {(irList.length > 0 || irEligibleOnBench.length > 0) && (
        <div style={s.irSection}>
          <div style={s.irTitle}>IR / Injured Reserve ({irList.length})</div>
          <div style={s.irHint}>Click IR button on an injured player to reserve their roster spot</div>
          {irList.map(p => <PlayerCard key={p.id} p={p} isIR />)}
        </div>
      )}
    </div>
  );
}
