import React, { useState, useEffect } from 'react';
import Setup from './components/Setup';
import DraftRoom from './components/DraftRoom';

const styles = {
  container: { minHeight: '100vh', background: '#0a0e1a' },
};

export default function App() {
  const [draft, setDraft] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetch('/api/players')
      .then(r => r.json())
      .then(setPlayers)
      .catch(console.error);

    fetch('/api/draft')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setDraft(d))
      .catch(console.error);
  }, []);

  const handleSetupComplete = (draftData) => setDraft(draftData);

  const handleReset = () => {
    fetch('/api/draft', { method: 'DELETE' }).then(() => setDraft(null));
  };

  return (
    <div style={styles.container}>
      {!draft
        ? <Setup onComplete={handleSetupComplete} />
        : <DraftRoom
            draft={draft}
            setDraft={setDraft}
            allPlayers={players}
            onReset={handleReset}
          />
      }
    </div>
  );
}
