import React, { useState } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import PulseLogo from './PulseLogo';

const SPORT_CHIPS = [
  { label: 'NFL', bg: '#2d1a1a', fg: '#fc8181' },
  { label: 'NBA', bg: '#1a2035', fg: '#63b3ed' },
  { label: 'MLB', bg: '#2d1f0a', fg: '#f6ad55' },
  { label: 'NHL', bg: '#1e1f28', fg: '#e2e8f0' },
  { label: 'EPL', bg: '#1f1a35', fg: '#b794f4' },
];

const FEATURES = [
  'Live drafts with real-time snake format and pick timer',
  'Multi-sport: NFL, NBA, MLB, NHL, and EPL Soccer',
  'Live score polling — updates every 60 seconds',
  'Positional tracker, scarcity alerts, and trade simulator',
  'Full season standings, playoffs, waivers, and more',
];

const s = {
  root: { display: 'flex', minHeight: '100vh', background: 'transparent' },
  left: { flex: 1, background: 'linear-gradient(155deg, #0d1f12 0%, #0a1a2a 50%, #0a0e1a 100%)', borderRight: '1px solid #1a2d1a', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: '-60px', left: '-60px', width: '360px', height: '360px', background: 'radial-gradient(circle, rgba(39,103,73,0.2) 0%, transparent 70%)', pointerEvents: 'none' },
  logo: { fontSize: '2.4rem', fontWeight: '900', color: '#68d391', letterSpacing: '-0.02em', marginBottom: '0.4rem' },
  tagline: { fontSize: '1rem', color: '#718096', marginBottom: '2.25rem', lineHeight: 1.5 },
  featureList: { listStyle: 'none', padding: 0, margin: '0 0 2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: '#a0aec0', lineHeight: 1.5 },
  checkCircle: { width: '17px', height: '17px', borderRadius: '50%', background: 'rgba(39,103,73,0.5)', border: '1px solid #276749', flexShrink: 0, marginTop: '0.12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sportsRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  sportChip: (bg, fg) => ({ padding: '0.25rem 0.7rem', borderRadius: '20px', background: bg, color: fg, fontSize: '0.77rem', fontWeight: '800', letterSpacing: '0.05em' }),
  right: { width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  mobileWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1.5rem', background: 'transparent' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '14px', padding: '2rem', width: '100%', maxWidth: '380px' },
  formTitle: { fontSize: '1.45rem', fontWeight: '800', color: '#68d391', marginBottom: '0.25rem' },
  adminTitle: { fontSize: '1.45rem', fontWeight: '800', color: '#f6ad55', marginBottom: '0.25rem' },
  formSub: { fontSize: '0.85rem', color: '#718096', marginBottom: '1.75rem' },
  label: { display: 'block', fontSize: '0.77rem', color: '#a0aec0', marginBottom: '0.4rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { width: '100%', padding: '0.7rem 0.85rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.1rem', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #276749 0%, #2d8a60 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.03em', boxShadow: '0 4px 14px rgba(39,103,73,0.3)' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  toggle: { marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: '#718096' },
  toggleLink: { color: '#68d391', cursor: 'pointer', fontWeight: '700', background: 'none', border: 'none', fontSize: '0.875rem', padding: 0 },
  error: { background: '#2d1515', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.85rem', padding: '0.65rem 0.8rem', marginBottom: '1rem' },
  adminLink: { marginTop: '1.5rem', textAlign: 'center' },
  adminBtn: { background: 'none', border: '1px solid #2d3748', borderRadius: '6px', color: '#a0aec0', fontSize: '0.8rem', cursor: 'pointer', padding: '0.4rem 0.9rem' },
};

export default function Auth({ onLogin, onAdminLogin }) {
  const [mode, setMode] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile(900);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) return setError('Email and password are required.');
    if (mode === 'register' && password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/api/admin/login' : `/api/auth/${mode}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Something went wrong.');
      if (isAdmin) onAdminLogin(data);
      else onLogin({ ...data, isNew: mode === 'register' });
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const form = (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.25rem' }}>
        <PulseLogo size={30} />
        <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#68d391', letterSpacing: '-0.01em' }}>Pulse League</span>
      </div>
      {isAdmin
        ? <div style={s.adminTitle}>Admin Login</div>
        : <div style={s.formTitle}>{mode === 'login' ? 'Sign in' : 'Create account'}</div>
      }
      <div style={s.formSub}>
        {isAdmin ? 'Admin credentials required' : mode === 'login' ? 'Welcome back' : 'Join the league'}
      </div>

      {error && <div style={s.error}>{error}</div>}

      <label style={s.label}>Email</label>
      <input
        style={s.input}
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={handleKey}
        autoFocus
      />

      <label style={s.label}>Password</label>
      <input
        style={s.input}
        type="password"
        placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={handleKey}
      />

      <button
        style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '...' : isAdmin ? 'Admin Sign In' : mode === 'login' ? 'Sign In' : 'Create Account'}
      </button>

      {!isAdmin && (
        <div style={s.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.toggleLink} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      )}

      <div style={s.adminLink}>
        <button style={s.adminBtn} onClick={() => { setIsAdmin(!isAdmin); setError(''); }}>
          {isAdmin ? '← Back to user login' : 'Admin login'}
        </button>
      </div>
    </div>
  );

  if (isMobile || isAdmin) {
    return <div style={s.mobileWrapper}>{form}</div>;
  }

  return (
    <div style={s.root}>
      <div style={s.left}>
        <div style={s.glow} />
        <PulseLogo size={58} style={{ marginBottom: '1.1rem' }} />
        <div style={s.logo}>Pulse League</div>
        <div style={s.tagline}>Draft your team. Dominate the season.</div>
        <ul style={s.featureList}>
          {FEATURES.map((f, i) => (
            <li key={i} style={s.featureItem}>
              <div style={s.checkCircle}>
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3L3 5L7 1" stroke="#68d391" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div style={s.sportsRow}>
          {SPORT_CHIPS.map(c => (
            <span key={c.label} style={s.sportChip(c.bg, c.fg)}>{c.label}</span>
          ))}
        </div>
      </div>
      <div style={s.right}>{form}</div>
    </div>
  );
}
