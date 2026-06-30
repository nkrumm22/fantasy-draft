import React, { useState } from 'react';

const s = {
  root: { minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0' },
  header: { padding: '1rem 1.5rem', background: '#141824', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', gap: '1rem' },
  backBtn: { padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  title: { fontSize: '1.25rem', fontWeight: '800', color: '#68d391' },
  body: { maxWidth: '780px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' },
  toc: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem' },
  tocTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' },
  tocList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  tocLink: { fontSize: '0.8rem', color: '#63b3ed', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.2rem 0', textDecoration: 'underline' },
  section: { marginBottom: '2.5rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer', userSelect: 'none' },
  sectionNum: { fontSize: '0.7rem', fontWeight: '800', color: '#276749', background: '#1a3a1a', border: '1px solid #276749', borderRadius: '6px', padding: '0.2rem 0.5rem', flexShrink: 0 },
  sectionTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#e2e8f0' },
  chevron: { marginLeft: 'auto', color: '#4a5568', fontSize: '0.75rem' },
  divider: { borderTop: '1px solid #1a2035', marginBottom: '1rem' },
  p: { fontSize: '0.875rem', color: '#a0aec0', lineHeight: 1.65, marginBottom: '0.75rem' },
  tip: { background: '#1a2d48', border: '1px solid #2c4a6e', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' },
  tipLabel: { fontSize: '0.7rem', fontWeight: '800', color: '#63b3ed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' },
  tipText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.6 },
  warn: { background: '#2d2007', border: '1px solid #744210', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' },
  warnLabel: { fontSize: '0.7rem', fontWeight: '800', color: '#f6ad55', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' },
  warnText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', marginBottom: '0.75rem' },
  th: { textAlign: 'left', padding: '0.45rem 0.75rem', background: '#1a2035', color: '#718096', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  td: { padding: '0.45rem 0.75rem', borderBottom: '1px solid #1a2035', color: '#a0aec0' },
  tdHighlight: { padding: '0.45rem 0.75rem', borderBottom: '1px solid #1a2035', color: '#68d391', fontWeight: '700' },
  chip: { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', marginRight: '0.3rem' },
  h3: { fontSize: '0.9rem', fontWeight: '700', color: '#e2e8f0', margin: '1rem 0 0.4rem' },
  ul: { paddingLeft: '1.25rem', margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#a0aec0', lineHeight: 1.75 },
};

const SECTIONS = [
  'What Is Fantasy Sports?',
  'Joining a League',
  'The Draft',
  'Scoring & Points',
  'Managing Your Lineup',
  'Weekly Schedule & Matchups',
  'Beginner Tips',
];

function Section({ num, title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div id={`section-${num}`} style={s.section}>
      <div style={s.sectionHeader} onClick={() => setOpen(o => !o)}>
        <span style={s.sectionNum}>{num}</span>
        <span style={s.sectionTitle}>{title}</span>
        <span style={s.chevron}>{open ? '▲' : '▼'}</span>
      </div>
      <div style={s.divider} />
      {open && <div>{children}</div>}
    </div>
  );
}

export default function HowToPlay({ onBack }) {
  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.title}>How to Play</span>
      </div>

      <div style={s.body}>
        <div style={s.toc}>
          <div style={s.tocTitle}>Jump to section</div>
          <div style={s.tocList}>
            {SECTIONS.map((t, i) => (
              <button key={i} style={s.tocLink} onClick={() => document.getElementById(`section-${i + 1}`)?.scrollIntoView({ behavior: 'smooth' })}>
                {i + 1}. {t}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1 */}
        <Section num={1} title="What Is Fantasy Sports?">
          <p style={s.p}>
            Fantasy sports is a game where you build a virtual team of real professional athletes and compete against other players. Your team earns points based on how those athletes actually perform in their real games.
          </p>
          <p style={s.p}>
            For example, in fantasy NFL, if Patrick Mahomes throws 3 touchdown passes in Sunday's game, your fantasy team earns those points — as long as you have Mahomes on your starting lineup.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>This Platform</div>
            <div style={s.tipText}>
              Fantasy Draft supports NFL, NBA, MLB, NHL, and EPL Soccer leagues. Each league handles drafting, scheduling, scoring, and lineup management in one place.
            </div>
          </div>
          <h3 style={s.h3}>The Basics</h3>
          <ul style={s.ul}>
            <li>A <strong>commissioner</strong> creates the league and invites friends</li>
            <li>Everyone joins and picks a team name</li>
            <li>You hold a <strong>draft</strong> where each manager picks real players for their roster</li>
            <li>Each week you set a <strong>starting lineup</strong> and face off against one opponent</li>
            <li>The team with more fantasy points that week wins the matchup</li>
          </ul>
        </Section>

        {/* Section 2 */}
        <Section num={2} title="Joining a League">
          <h3 style={s.h3}>If someone invited you</h3>
          <p style={s.p}>
            Your league commissioner will share an <strong>invite code</strong> (8-character code like <code style={{ background: '#1a2035', padding: '0 0.3rem', borderRadius: '4px', fontSize: '0.85em' }}>A3F2B7C1</code>). From the My Leagues page, click <strong>"Join via Code"</strong>, enter the code, and choose your team name.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>Team Name</div>
            <div style={s.tipText}>Your team name is how other managers will see you all season. Pick something fun — you can't easily change it later.</div>
          </div>
          <h3 style={s.h3}>If you're starting a league</h3>
          <p style={s.p}>
            Click <strong>"+ Create League"</strong>, fill out the settings (sport, number of teams, scoring format, roster slots), and share your invite code with friends. You become the commissioner, which means you control schedule generation and can score weeks.
          </p>
          <div style={s.warn}>
            <div style={s.warnLabel}>Wait for everyone to join</div>
            <div style={s.warnText}>Don't start the draft until all managers have joined and set their team names. Once the draft starts, the roster is locked.</div>
          </div>
        </Section>

        {/* Section 3 */}
        <Section num={3} title="The Draft">
          <p style={s.p}>
            The draft is where you build your roster for the season. Every team takes turns picking real players from a pool of all available athletes. Once a player is drafted, no one else can pick them.
          </p>
          <h3 style={s.h3}>Snake Format</h3>
          <p style={s.p}>
            This platform uses a <strong>snake draft</strong>. In Round 1, teams pick from 1 to 10. In Round 2, the order reverses (10 to 1). This zigzag pattern ensures fairness — picking last in one round means picking first in the next.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>Draft Order</div>
            <div style={s.tipText}>Your draft position is assigned before the draft starts. A higher pick number (e.g., pick #1) is typically more valuable since you get first choice of the best players.</div>
          </div>
          <h3 style={s.h3}>ADP (Average Draft Position)</h3>
          <p style={s.p}>
            Each player has an ADP — the pick number where they're typically selected across all fantasy drafts. ADP helps you know when to draft a player:
          </p>
          <ul style={s.ul}>
            <li>If a player's ADP is 25 and you pick them at #30, that's a <span style={{ ...s.chip, background: '#1a3a1a', color: '#68d391' }}>+5 steal</span></li>
            <li>If their ADP is 25 and you pick them at #20, that's a <span style={{ ...s.chip, background: '#2d1515', color: '#fc8181' }}>−5 reach</span></li>
            <li>Steals are good — you're getting value late. Reaches risk missing better available players</li>
          </ul>
          <h3 style={s.h3}>The Draft Room</h3>
          <ul style={s.ul}>
            <li><strong>Player List</strong> — all available players, sorted by ADP. Filter by position</li>
            <li><strong>My Roster</strong> — your picks so far this draft</li>
            <li><strong>Draft Board</strong> — see every team's picks by round</li>
            <li><strong>Best Pick</strong> — the app suggests a recommended pick based on your roster needs</li>
            <li><strong>Positional Tracker</strong> — shows how filled each position slot is</li>
          </ul>
          <div style={s.warn}>
            <div style={s.warnLabel}>Don't reach for your favorite player</div>
            <div style={s.warnText}>It's tempting to draft your favorite player early, but if their ADP is 40 and you pick them at 15, you missed out on better players at peak value. Follow the board.</div>
          </div>
        </Section>

        {/* Section 4 */}
        <Section num={4} title="Scoring & Points">
          <p style={s.p}>
            Fantasy points are awarded based on your players' real-game statistics. Your league uses one of these NFL scoring formats:
          </p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Stat</th>
                <th style={s.th}>Standard</th>
                <th style={s.th}>Half PPR</th>
                <th style={s.th}>PPR</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Passing TD', '4 pts', '4 pts', '4 pts'],
                ['Passing Yard', '0.04 pts', '0.04 pts', '0.04 pts'],
                ['Interception', '−2 pts', '−2 pts', '−2 pts'],
                ['Rushing/Rec TD', '6 pts', '6 pts', '6 pts'],
                ['Rushing/Rec Yard', '0.1 pts', '0.1 pts', '0.1 pts'],
                ['Reception', '0 pts', '0.5 pts', '1 pt'],
              ].map(([stat, std, half, ppr]) => (
                <tr key={stat}>
                  <td style={s.td}>{stat}</td>
                  <td style={s.td}>{std}</td>
                  <td style={s.tdHighlight}>{half}</td>
                  <td style={s.td}>{ppr}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.tip}>
            <div style={s.tipLabel}>Half PPR is the most common</div>
            <div style={s.tipText}>Half PPR is the default in most leagues. It rewards pass-catchers slightly without making every reception worth a full point. PPR heavily favors wide receivers and pass-catching running backs.</div>
          </div>
          <h3 style={s.h3}>Other Sports</h3>
          <p style={s.p}>
            For NBA, MLB, NHL, and EPL leagues, the platform uses Sleeper's standard scoring system, where each statistical category (goals, assists, points, etc.) is worth a set number of fantasy points.
          </p>
          <h3 style={s.h3}>DST (Defense/Special Teams) — NFL only</h3>
          <ul style={s.ul}>
            <li>Points for sacks, interceptions, fumble recoveries, defensive/special teams TDs</li>
            <li>Points deducted based on how many points the opposing offense scores</li>
            <li>Streaming DST (picking the best matchup each week) is a popular strategy</li>
          </ul>
        </Section>

        {/* Section 5 */}
        <Section num={5} title="Managing Your Lineup">
          <p style={s.p}>
            Each week you choose which players from your roster will be in your <strong>starting lineup</strong>. Only starters earn you points. Players on your bench are "sitting" and score nothing for you that week.
          </p>
          <h3 style={s.h3}>Typical NFL Roster (may vary by league)</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Slot</th>
                <th style={s.th}>Position</th>
                <th style={s.th}>Typical Count</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['QB', 'Quarterback', '1'],
                ['RB', 'Running Back', '2'],
                ['WR', 'Wide Receiver', '2'],
                ['TE', 'Tight End', '1'],
                ['FLEX', 'RB, WR, or TE', '1'],
                ['DST', 'Defense/Special Teams', '1'],
                ['K', 'Kicker', '1'],
              ].map(([pos, name, cnt]) => (
                <tr key={pos}>
                  <td style={{ ...s.td, fontWeight: '700', color: '#e2e8f0', width: '60px' }}>{pos}</td>
                  <td style={s.td}>{name}</td>
                  <td style={s.td}>{cnt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={s.h3}>How to Set Your Lineup</h3>
          <p style={s.p}>
            Go to your league page and click the <strong>"My Lineup"</strong> tab. Select which players are starters and which are bench for the selected week, then save.
          </p>
          <div style={s.warn}>
            <div style={s.warnLabel}>Watch for bye weeks & injuries</div>
            <div style={s.warnText}>
              NFL teams have one bye week per season where they don't play — a player on bye scores 0. Always check injury reports before locking your lineup. Starting an injured or bye-week player is one of the most common beginner mistakes.
            </div>
          </div>
        </Section>

        {/* Section 6 */}
        <Section num={6} title="Weekly Schedule & Matchups">
          <p style={s.p}>
            Each week of the season you'll face one opponent. The team with more fantasy points wins that week's matchup. At the end of the season, standings are based on wins and losses.
          </p>
          <h3 style={s.h3}>Viewing Scores</h3>
          <p style={s.p}>
            Go to the <strong>Schedule</strong> tab to see all matchups for each week. Scores update live throughout the week as real NFL games are played. Click any matchup card to see a player-by-player breakdown of who scored what.
          </p>
          <h3 style={s.h3}>Score Statuses</h3>
          <ul style={s.ul}>
            <li><span style={{ ...s.chip, background: '#1a2035', color: '#718096' }}>Upcoming</span> — matchup hasn't started yet; scores show 0</li>
            <li><span style={{ ...s.chip, background: '#744210', color: '#f6ad55' }}>Live</span> — games are in progress; scores are updating</li>
            <li><span style={{ ...s.chip, background: '#1a2d48', color: '#63b3ed' }}>Final</span> — week is over; final scores are locked in</li>
          </ul>
          <div style={s.tip}>
            <div style={s.tipLabel}>Live scoring</div>
            <div style={s.tipText}>The schedule page auto-refreshes scores every 60 seconds during live games. You can also click "Score Week" (commissioner only) to manually trigger a score update.</div>
          </div>
        </Section>

        {/* Section 7 */}
        <Section num={7} title="Beginner Tips">
          <ul style={s.ul}>
            <li><strong>Draft RB and WR early.</strong> These positions have the most depth at the top but fall off quickly. QBs are plentiful; grab a reliable one in rounds 5–8.</li>
            <li><strong>Don't neglect TE.</strong> Elite tight ends (top 5) are rare and valuable. If you miss the top tier, stream average TEs instead of reaching.</li>
            <li><strong>Know your bye weeks.</strong> Avoid drafting too many players on the same bye week — you might not have enough starters for that week.</li>
            <li><strong>Check injuries before Sunday.</strong> Look at injury designations (Q = Questionable, O = Out, IR = Injured Reserve). Don't start someone who might not play.</li>
            <li><strong>Depth matters.</strong> Injuries happen. Always have quality backups at RB and WR — teams can lose a starter any week.</li>
            <li><strong>Handcuffs.</strong> For NFL, consider drafting the backup ("handcuff") of your star running back. If your RB1 gets hurt, you have insurance.</li>
            <li><strong>Stream DST.</strong> Don't spend an early pick on defense. Draft a DST in the last couple rounds and swap each week for the best matchup.</li>
            <li><strong>Set your lineup every week.</strong> It sounds obvious, but forgetting to set your lineup — starting injured players or bye-week players — is how games are lost before they start.</li>
          </ul>
          <div style={s.tip}>
            <div style={s.tipLabel}>Draft Recap</div>
            <div style={s.tipText}>After the draft, check the "Draft Recap" tab in your league to review everyone's picks, spot steals and reaches, and understand how strong your roster is compared to the competition.</div>
          </div>
        </Section>
      </div>
    </div>
  );
}
