import React, { useState } from 'react';

const s = {
  wrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: '#0a0e1a' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#68d391', marginBottom: '0.25rem', textAlign: 'center' },
  subtitle: { color: '#718096', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '0.65rem 0.8rem', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.1rem', boxSizing: 'border-box' },
  btn: { width: '100%', padding: '0.85rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.05em' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  toggle: { marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: '#718096' },
  toggleLink: { color: '#68d391', cursor: 'pointer', fontWeight: '600', background: 'none', border: 'none', fontSize: '0.875rem', padding: 0 },
  error: { background: '#2d1515', border: '1px solid #742a2a', borderRadius: '6px', color: '#fc8181', fontSize: '0.85rem', padding: '0.65rem 0.8rem', marginBottom: '1rem' },
  adminLink: { marginTop: '1.5rem', textAlign: 'center' },
  adminBtn: { background: 'none', border: 'none', color: '#4a5568', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' },
};

export default function Auth({ onLogin, onAdminLogin }) {
  const [mode, setMode] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      else onLogin(data);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <h1 style={{ ...s.title, ...(isAdmin ? { color: '#f6ad55' } : {}) }}>
          {isAdmin ? 'Admin Login' : 'Fantasy Draft'}
        </h1>
        <p style={s.subtitle}>
          {isAdmin ? 'Sign in with your admin credentials' : mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>

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
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
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
    </div>
  );
}
