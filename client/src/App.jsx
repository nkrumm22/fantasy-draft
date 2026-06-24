import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import MyDrafts from './components/MyDrafts';
import Setup from './components/Setup';
import DraftRoom from './components/DraftRoom';
import Admin from './components/Admin';

const AUTH_KEY = 'ff_auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('auth');
  const [draft, setDraft] = useState(null);
  const [adminViewingDraft, setAdminViewingDraft] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY));
      if (saved?.token && saved?.user) {
        setToken(saved.token);
        setUser(saved.user);
        setView(saved.user.role === 'admin' ? 'admin' : 'my-drafts');
      }
    } catch {}

    fetch('/api/players')
      .then(r => r.json())
      .then(setPlayers)
      .catch(console.error);
  }, []);

  const handleLogin = ({ token: t, user: u }) => {
    setToken(t);
    setUser(u);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: t, user: u }));
    setView('my-drafts');
  };

  const handleAdminLogin = ({ token: t, user: u }) => {
    setToken(t);
    setUser(u);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: t, user: u }));
    setView('admin');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDraft(null);
    setAdminViewingDraft(false);
    localStorage.removeItem(AUTH_KEY);
    setView('auth');
  };

  const handleSetupComplete = (draftData) => {
    setDraft(draftData);
    setView('draft');
  };

  const handleLoadDraft = (draftData) => {
    setDraft(draftData);
    setView('draft');
  };

  const handleExitDraft = () => {
    setDraft(null);
    if (adminViewingDraft) {
      setAdminViewingDraft(false);
      setView('admin');
    } else {
      setView('my-drafts');
    }
  };

  const handleAdminViewDraft = (draftData) => {
    setDraft(draftData);
    setAdminViewingDraft(true);
    setView('draft');
  };

  if (view === 'auth') return <Auth onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
  if (view === 'admin') return (
    <Admin
      token={token}
      user={user}
      onLogout={handleLogout}
      onViewDraft={handleAdminViewDraft}
    />
  );
  if (view === 'my-drafts') return (
    <MyDrafts
      token={token}
      user={user}
      onNewDraft={() => setView('setup')}
      onLoadDraft={handleLoadDraft}
      onLogout={handleLogout}
    />
  );
  if (view === 'setup') return (
    <Setup
      token={token}
      onComplete={handleSetupComplete}
      onBack={() => setView('my-drafts')}
    />
  );
  if (view === 'draft' && draft) return (
    <DraftRoom
      draft={draft}
      setDraft={setDraft}
      allPlayers={players}
      token={token}
      onExit={handleExitDraft}
      readOnly={adminViewingDraft}
    />
  );
  return null;
}
