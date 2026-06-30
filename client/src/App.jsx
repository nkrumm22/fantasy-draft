import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import MyDrafts from './components/MyDrafts';
import MyLeagues from './components/MyLeagues';
import LeagueSetup from './components/LeagueSetup';
import League from './components/League';
import Setup from './components/Setup';
import DraftRoom from './components/DraftRoom';
import Admin from './components/Admin';
import HowToPlay from './components/HowToPlay';
import OnboardingModal from './components/OnboardingModal';

const AUTH_KEY = 'ff_auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('auth');
  const [draft, setDraft] = useState(null);
  const [adminViewingDraft, setAdminViewingDraft] = useState(false);
  const [players, setPlayers] = useState([]);
  const [currentLeagueId, setCurrentLeagueId] = useState(null);
  const [leagueForDraft, setLeagueForDraft] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY));
      if (saved?.token && saved?.user) {
        setToken(saved.token);
        setUser(saved.user);
        setView(saved.user.role === 'admin' ? 'admin' : 'my-leagues');
      }
    } catch {}

    fetch('/api/players')
      .then(r => r.json())
      .then(setPlayers)
      .catch(console.error);
  }, []);

  // Re-fetch sport-specific players whenever a draft is loaded
  useEffect(() => {
    if (!draft) return;
    const sport = draft.sport || 'nfl';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/players?sport=${sport}`, { headers })
      .then(r => r.json())
      .then(setPlayers)
      .catch(console.error);
  }, [draft?.sport]);

  const handleLogin = ({ token: t, user: u, isNew }) => {
    setToken(t);
    setUser(u);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token: t, user: u }));
    setView('my-leagues');
    if (isNew && !localStorage.getItem(`ff_onboarded_${u.id}`)) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    if (user?.id) localStorage.setItem(`ff_onboarded_${user.id}`, '1');
    setShowOnboarding(false);
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
    setCurrentLeagueId(null);
    setLeagueForDraft(null);
    localStorage.removeItem(AUTH_KEY);
    setView('auth');
  };

  const handleSetupComplete = (draftData) => {
    setDraft(draftData);
    setLeagueForDraft(null);
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
    } else if (currentLeagueId) {
      setView('league');
    } else {
      setView('my-drafts');
    }
  };

  const handleAdminViewDraft = (draftData) => {
    setDraft(draftData);
    setAdminViewingDraft(true);
    setView('draft');
  };

  const handleOpenLeague = (id) => {
    setCurrentLeagueId(id);
    setView('league');
  };

  const handleLeagueCreated = (id) => {
    setCurrentLeagueId(id);
    setView('league');
  };

  const handleStartDraftFromLeague = (league) => {
    setLeagueForDraft(league);
    setView('setup');
  };

  if (view === 'how-to-play') return <HowToPlay onBack={() => setView('my-leagues')} />;
  if (view === 'auth') return <Auth onLogin={handleLogin} onAdminLogin={handleAdminLogin} />;
  if (view === 'admin') return (
    <Admin token={token} user={user} onLogout={handleLogout} onViewDraft={handleAdminViewDraft} />
  );
  if (view === 'my-drafts') return (
    <MyDrafts
      token={token}
      user={user}
      onNewDraft={() => setView('setup')}
      onLoadDraft={handleLoadDraft}
      onLogout={handleLogout}
      onMyLeagues={() => setView('my-leagues')}
    />
  );
  if (view === 'my-leagues') return (
    <>
      <MyLeagues
        token={token}
        user={user}
        onOpenLeague={handleOpenLeague}
        onNewLeague={() => setView('league-setup')}
        onLogout={handleLogout}
        onMyDrafts={() => setView('my-drafts')}
        onHowToPlay={() => setView('how-to-play')}
      />
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
    </>
  );
  if (view === 'league-setup') return (
    <LeagueSetup
      token={token}
      onComplete={handleLeagueCreated}
      onBack={() => setView('my-leagues')}
    />
  );
  if (view === 'league' && currentLeagueId) return (
    <League
      leagueId={currentLeagueId}
      token={token}
      user={user}
      onBack={() => setView('my-leagues')}
      onStartDraft={handleStartDraftFromLeague}
      onViewDraft={(draftData, readOnly) => {
        setDraft(draftData);
        setAdminViewingDraft(!!readOnly);
        setView('draft');
      }}
    />
  );
  if (view === 'setup') return (
    <Setup
      token={token}
      onComplete={handleSetupComplete}
      onBack={() => leagueForDraft ? setView('league') : setView('my-drafts')}
      leagueForDraft={leagueForDraft}
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
