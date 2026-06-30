import React, { useState } from 'react';

const TOTAL = 6;

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  card: { background: '#141824', border: '1px solid #2d3748', borderRadius: '16px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' },
  progressBar: { height: '4px', background: '#1a2035', flexShrink: 0 },
  progressFill: (pct) => ({ height: '100%', background: '#276749', borderRadius: '2px', transition: 'width 0.3s ease', width: `${pct}%` }),
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0' },
  stepCount: { fontSize: '0.72rem', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em' },
  skipBtn: { background: 'none', border: 'none', color: '#4a5568', fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem 0' },
  body: { padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto' },
  icon: { fontSize: '2.5rem', marginBottom: '0.75rem', display: 'block' },
  title: { fontSize: '1.3rem', fontWeight: '800', color: '#e2e8f0', marginBottom: '0.5rem' },
  subtitle: { fontSize: '0.9rem', color: '#718096', lineHeight: 1.6, marginBottom: '1.25rem' },
  highlight: { background: '#1a3a1a', border: '1px solid #276749', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.85rem' },
  highlightTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#68d391', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' },
  highlightText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.55 },
  infoBox: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.85rem' },
  infoTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' },
  infoText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.55 },
  row: { display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.65rem' },
  dot: { width: '22px', height: '22px', borderRadius: '50%', background: '#276749', color: '#fff', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' },
  rowText: { fontSize: '0.875rem', color: '#a0aec0', lineHeight: 1.55 },
  chips: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' },
  chip: (bg, fg) => ({ padding: '0.25rem 0.65rem', borderRadius: '20px', background: bg, color: fg, fontSize: '0.8rem', fontWeight: '700' }),
  footer: { padding: '1rem 1.5rem', borderTop: '1px solid #2d3748', display: 'flex', gap: '0.65rem', flexShrink: 0 },
  btnPrev: { flex: 1, padding: '0.65rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  btnNext: { flex: 2, padding: '0.65rem', background: '#276749', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  btnFinish: { flex: 2, padding: '0.65rem', background: '#2b6cb0', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.875rem', fontWeight: '700', cursor: 'pointer' },
  dotsRow: { display: 'flex', gap: '0.35rem', justifyContent: 'center', marginBottom: '0.85rem' },
  dot_: (active) => ({ width: '7px', height: '7px', borderRadius: '50%', background: active ? '#68d391' : '#2d3748', transition: 'background 0.2s' }),
};

const STEPS = [
  {
    title: 'Welcome to Fantasy Draft!',
    subtitle: "Fantasy sports is a game where you build a virtual team of real players and compete against friends — your points come from their real-game stats. This quick tour will walk you through everything you need to know.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>Multi-Sport Support</div>
          <div style={s.highlightText}>This platform supports NFL, NBA, MLB, NHL, and EPL Soccer — all in one place.</div>
        </div>
        <div style={s.row}>
          <div style={s.dot}>1</div>
          <span style={s.rowText}><strong style={{ color: '#e2e8f0' }}>Join or create a league</strong> with your friends</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>2</div>
          <span style={s.rowText}><strong style={{ color: '#e2e8f0' }}>Draft real players</strong> to build your roster</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>3</div>
          <span style={s.rowText}><strong style={{ color: '#e2e8f0' }}>Set your lineup</strong> each week and earn points from real stats</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>4</div>
          <span style={s.rowText}><strong style={{ color: '#e2e8f0' }}>Win matchups</strong> and climb the standings</span>
        </div>
      </>
    ),
  },
  {
    title: 'Leagues',
    subtitle: "Everything in fantasy sports happens inside a league — a private group of managers (you and your friends) competing all season.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>Joining a League</div>
          <div style={s.highlightText}>
            Ask your commissioner for the <strong>invite code</strong>. From My Leagues, tap <strong>"Join via Code"</strong>, enter the code, and pick your team name.
          </div>
        </div>
        <div style={s.infoBox}>
          <div style={s.infoTitle}>Creating a League</div>
          <div style={s.infoText}>
            Tap <strong>"+ Create League"</strong> to become the commissioner. You'll set the sport, number of teams, scoring rules, and roster slots — then share your invite code with everyone.
          </div>
        </div>
        <div style={s.row}>
          <div style={{ ...s.dot, background: '#744210' }}>!</div>
          <span style={s.rowText}>Wait for all managers to join before starting the draft. Roster spots can't be added once the draft begins.</span>
        </div>
      </>
    ),
  },
  {
    title: 'The Draft',
    subtitle: "The draft is a one-time event where every manager takes turns picking real players for their roster. The player pool is shared — once someone drafts a player, no one else can have them.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>Snake Draft Format</div>
          <div style={s.highlightText}>
            Teams pick in order (1 → 10), then the order <em>reverses</em> (10 → 1), then repeats. This gives everyone a fair shot at different tiers of talent.
          </div>
        </div>
        <div style={s.infoBox}>
          <div style={s.infoTitle}>ADP — Average Draft Position</div>
          <div style={s.infoText}>
            Each player shows an ADP — where they're typically picked. Pick someone later than their ADP and you get a <strong style={{ color: '#68d391' }}>steal</strong>. Pick them earlier and it's a <strong style={{ color: '#fc8181' }}>reach</strong>.
          </div>
        </div>
        <div style={s.row}>
          <div style={s.dot}>1</div>
          <span style={s.rowText}>The app shows a <strong style={{ color: '#e2e8f0' }}>Best Pick</strong> recommendation based on your roster needs</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>2</div>
          <span style={s.rowText}>Filter players by position using the tab buttons above the list</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>3</div>
          <span style={s.rowText}>Check the <strong style={{ color: '#e2e8f0' }}>Draft Board</strong> to see what other teams are building</span>
        </div>
      </>
    ),
  },
  {
    title: 'Scoring & Points',
    subtitle: "Your team earns points when your players perform well in real games. The more stats they rack up, the more fantasy points you score.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>NFL Example (Half PPR)</div>
          <div style={s.highlightText}>
            A QB throws for 300 yards and 2 TDs: <strong>12 pts</strong> for passing yards + <strong>8 pts</strong> for TDs = <strong style={{ color: '#68d391' }}>20 fantasy points</strong>
          </div>
        </div>
        <div style={s.infoBox}>
          <div style={s.infoTitle}>NFL Scoring Formats</div>
          <div style={s.infoText}>
            <strong>Standard</strong> — no bonus for receptions<br />
            <strong>Half PPR</strong> — 0.5 pts per catch (most common)<br />
            <strong>PPR</strong> — 1 pt per catch (rewards pass-catchers)
          </div>
        </div>
        <div style={s.chips}>
          <span style={s.chip('#2c4a6e', '#63b3ed')}>4 pts / TD pass</span>
          <span style={s.chip('#1a3a1a', '#68d391')}>6 pts / TD run or catch</span>
          <span style={s.chip('#2d1515', '#fc8181')}>−2 pts / INT</span>
          <span style={s.chip('#1a2d48', '#90cdf4')}>1 pt / 10 rush yds</span>
        </div>
        <div style={s.infoBox}>
          <div style={s.infoTitle}>Other Sports</div>
          <div style={s.infoText}>NBA, MLB, NHL, and EPL use standard statistical scoring pulled from the Sleeper API — goals, assists, rebounds, strikeouts, and more all count toward your total.</div>
        </div>
      </>
    ),
  },
  {
    title: 'Setting Your Lineup',
    subtitle: "Each week, you choose which players from your roster will be starters. Only starters score points for you — players sitting on the bench earn nothing that week.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>Where to set it</div>
          <div style={s.highlightText}>
            Open your league and go to the <strong>"My Lineup"</strong> tab. Select which players start and which sit, then tap Save.
          </div>
        </div>
        <div style={s.row}>
          <div style={s.dot}>!</div>
          <span style={s.rowText}><strong style={{ color: '#fc8181' }}>Never start a player on bye or injured</strong> — they score 0 and you wasted a slot</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>2</div>
          <span style={s.rowText}>Typical NFL lineup: 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 DST, 1 K</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>3</div>
          <span style={s.rowText}>The FLEX slot can be filled by a RB, WR, or TE — use it for your best available player regardless of position</span>
        </div>
        <div style={s.infoBox}>
          <div style={s.infoTitle}>Deadline</div>
          <div style={s.infoText}>Set your lineup before your players' games kick off. Once a player's real-life game starts, you can't swap them in or out for that game.</div>
        </div>
      </>
    ),
  },
  {
    title: "You're Ready!",
    subtitle: "That's the core of fantasy sports. Don't stress about getting everything perfect on day one — most managers learn as they go.",
    content: (
      <>
        <div style={s.highlight}>
          <div style={s.highlightTitle}>Quick Cheat Sheet</div>
          <div style={s.highlightText}>
            <strong>My Leagues</strong> — your home base<br />
            <strong>League → Roster</strong> — see all your players<br />
            <strong>League → My Lineup</strong> — set starters each week<br />
            <strong>League → Schedule</strong> — view matchups &amp; live scores<br />
            <strong>League → Draft Recap</strong> — review all draft picks
          </div>
        </div>
        <div style={s.row}>
          <div style={s.dot}>?</div>
          <span style={s.rowText}>Tap the <strong style={{ color: '#e2e8f0' }}>How to Play</strong> button on the My Leagues page anytime to come back to this guide</span>
        </div>
        <div style={s.row}>
          <div style={s.dot}>★</div>
          <span style={s.rowText}>Check the beginner tips section in How to Play for advanced strategies once you're comfortable</span>
        </div>
      </>
    ),
  },
];

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL - 1;
  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.progressBar}>
          <div style={s.progressFill(progress)} />
        </div>

        <div style={s.topRow}>
          <span style={s.stepCount}>Step {step + 1} of {TOTAL}</span>
          <button style={s.skipBtn} onClick={onComplete}>Skip tutorial</button>
        </div>

        <div style={s.body}>
          <div style={s.dotsRow}>
            {STEPS.map((_, i) => <div key={i} style={s.dot_(i === step)} />)}
          </div>
          <div style={s.title}>{current.title}</div>
          <div style={s.subtitle}>{current.subtitle}</div>
          {current.content}
        </div>

        <div style={s.footer}>
          <button
            style={{ ...s.btnPrev, opacity: isFirst ? 0.3 : 1, cursor: isFirst ? 'default' : 'pointer' }}
            onClick={() => !isFirst && setStep(s => s - 1)}
            disabled={isFirst}
          >
            Previous
          </button>
          {isLast ? (
            <button style={s.btnFinish} onClick={onComplete}>
              Let's get started!
            </button>
          ) : (
            <button style={s.btnNext} onClick={() => setStep(s => s + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
