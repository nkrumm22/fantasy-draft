import React, { useState } from 'react';

const s = {
  root: { minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0' },
  header: { padding: '1rem 1.5rem', background: 'linear-gradient(90deg, #141824 0%, #0d1f12 50%, #141824 100%)', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', gap: '1rem' },
  backBtn: { padding: '0.4rem 0.9rem', background: 'transparent', border: '1px solid #2d3748', borderRadius: '8px', color: '#718096', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 },
  title: { fontSize: '1.25rem', fontWeight: '800', color: '#68d391' },
  body: { maxWidth: '780px', margin: '0 auto', padding: '1.5rem 1.25rem 3rem' },
  toc: { background: '#0f1420', border: '1px solid #2d3748', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem' },
  tocTitle: { fontSize: '0.75rem', fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' },
  tocList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  tocLink: { fontSize: '0.78rem', color: '#a0aec0', background: '#1a2035', border: '1px solid #2d3748', borderRadius: '20px', cursor: 'pointer', padding: '0.25rem 0.65rem', textDecoration: 'none', fontWeight: '600' },
  section: { marginBottom: '2.5rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer', userSelect: 'none' },
  sectionNum: { fontSize: '0.7rem', fontWeight: '800', color: '#e2e8f0', background: 'linear-gradient(135deg, #276749, #2d8a60)', borderRadius: '6px', padding: '0.2rem 0.6rem', flexShrink: 0, letterSpacing: '0.04em' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#e2e8f0' },
  chevron: { marginLeft: 'auto', color: '#4a5568', fontSize: '0.75rem' },
  divider: { borderTop: '1px solid #1a2035', marginBottom: '1rem' },
  p: { fontSize: '0.875rem', color: '#a0aec0', lineHeight: 1.65, marginBottom: '0.75rem' },
  tip: { background: '#0a1420', borderLeft: '3px solid #4299e1', borderRadius: '0 8px 8px 0', padding: '0.75rem 1rem', marginBottom: '0.75rem' },
  tipLabel: { fontSize: '0.7rem', fontWeight: '800', color: '#4299e1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' },
  tipText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.6 },
  warn: { background: '#130e03', borderLeft: '3px solid #e67e22', borderRadius: '0 8px 8px 0', padding: '0.75rem 1rem', marginBottom: '0.75rem' },
  warnLabel: { fontSize: '0.7rem', fontWeight: '800', color: '#e67e22', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' },
  warnText: { fontSize: '0.84rem', color: '#a0aec0', lineHeight: 1.6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', marginBottom: '0.75rem' },
  th: { textAlign: 'left', padding: '0.5rem 0.75rem', background: 'linear-gradient(90deg, #1a2035, #141824)', color: '#a0aec0', fontWeight: '700', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2d3748' },
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
  'Draft Room Features',
  'League Page Guide',
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
            <li><strong>Player List</strong> — all available players, sorted by ADP. Filter by position using the tab buttons</li>
            <li><strong>My Roster</strong> — your picks so far this draft</li>
            <li><strong>Draft Board</strong> — see every team's picks round by round</li>
            <li><strong>Best Pick</strong> — the app suggests a recommended pick based on your roster needs and positional targets</li>
            <li><strong>Positional Tracker</strong> — a bar showing how many of each position you've filled vs. recommended targets. Turns red when you're short at a position</li>
            <li><strong>Scarcity Alerts</strong> — if elite players at a position are running low (e.g., "Only 2 elite QBs left"), a warning appears so you don't miss the window</li>
          </ul>
          <h3 style={s.h3}>Live Draft Mode</h3>
          <p style={s.p}>
            If the commissioner enables a <strong>Live Draft</strong>, all managers join the same draft room in real time. Each person only picks when it's their turn — the app shows <span style={{ color: '#68d391', fontWeight: '700' }}>Your turn!</span> when you're on the clock and <em>"Waiting for [Team]…"</em> otherwise. Live drafts are the most exciting way to draft with friends online.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>My Queue (pre-draft)</div>
            <div style={s.tipText}>Before a live draft starts, visit the <strong>My Queue</strong> tab in your league to build a watchlist of players you want. During the draft, your queue is available as a quick-pick reference.</div>
          </div>
          <h3 style={s.h3}>Draft Timer</h3>
          <p style={s.p}>
            Commissioners can set a <strong>time limit per pick</strong> (e.g., 90 seconds). A countdown bar turns from green → yellow → red as time runs out. If time expires, the pick passes to the next team. The timer keeps live drafts moving and prevents anyone from stalling.
          </p>
          <h3 style={s.h3}>Player Stats Panel</h3>
          <p style={s.p}>
            Click any player in the Player List to open their stats panel at the bottom of the screen. You can view their <strong>2025 season stats</strong> and <strong>2026 projections</strong> side by side, plus injury status and bye week. Use this to compare two players before deciding who to pick.
          </p>
          <h3 style={s.h3}>Trade Simulator</h3>
          <p style={s.p}>
            During the draft, click <strong>Trade Sim</strong> in the header to open the Trade Simulator. You can model a hypothetical trade — swapping players between rosters — to see what your team would look like. This is completely hypothetical and doesn't affect the live draft.
          </p>
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
            Go to the <strong>Schedule</strong> tab to see all matchups for each week. Use the week tabs at the top to navigate between weeks. The schedule page <strong>auto-refreshes scores every 60 seconds</strong> while games are in progress — you don't need to reload the page.
          </p>
          <h3 style={s.h3}>Matchup Detail</h3>
          <p style={s.p}>
            Click any matchup card — even upcoming or in-progress ones — to see a <strong>per-player score breakdown</strong> for both teams. You'll see every starter listed with their individual fantasy points, so you know exactly who is contributing (or dragging you down).
          </p>
          <h3 style={s.h3}>Score Statuses</h3>
          <ul style={s.ul}>
            <li><span style={{ ...s.chip, background: '#1a2035', color: '#718096' }}>Upcoming</span> — matchup hasn't started yet</li>
            <li><span style={{ ...s.chip, background: '#744210', color: '#f6ad55' }}>Live</span> — games are in progress; scores refresh every 60s</li>
            <li><span style={{ ...s.chip, background: '#1a2d48', color: '#63b3ed' }}>Final</span> — week is over; scores are locked in</li>
          </ul>
          <h3 style={s.h3}>Commissioner Controls</h3>
          <ul style={s.ul}>
            <li><strong>Score Week</strong> — saves the current live scores as the official final result for that week and updates the standings</li>
            <li><strong>Regenerate Schedule</strong> — rebuilds the season schedule if something looks wrong (e.g., draft slot order changed after teams joined)</li>
          </ul>
          <div style={s.tip}>
            <div style={s.tipLabel}>Live scoring without the commissioner</div>
            <div style={s.tipText}>All league members can see live score estimates in real time from the Schedule tab without waiting for the commissioner to manually score the week. The commissioner's "Score Week" action saves the final official result to the standings.</div>
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
            <li><strong>Watch the Scarcity Alerts.</strong> When the draft room warns that elite players at a position are running low, don't ignore it. Missing the top-5 TE window can hurt you all season.</li>
            <li><strong>Set your lineup every week.</strong> It sounds obvious, but forgetting to set your lineup — starting injured players or bye-week players — is how games are lost before they start.</li>
          </ul>
          <div style={s.tip}>
            <div style={s.tipLabel}>Use the Trade Simulator before a real trade</div>
            <div style={s.tipText}>Before accepting any trade offer, open the Trade Block tab to see what your opponents are willing to give up, and use the Trade Simulator to model the impact on both rosters before committing.</div>
          </div>
        </Section>

        {/* Section 8 */}
        <Section num={8} title="Draft Room Features">
          <p style={s.p}>
            The Draft Room has several tools built specifically to help you make better picks and run a smooth draft. Here's a full breakdown of every feature you'll see.
          </p>

          <h3 style={s.h3}>Live Draft</h3>
          <p style={s.p}>
            When the commissioner sets up a Live Draft, every manager joins the same room and picks in real time on their own turn. The header shows whose turn it is and a <span style={{ color: '#68d391', fontWeight: '700' }}>Your turn!</span> badge appears when it's your pick. Other managers see <em>"Waiting for [Team]…"</em> while you decide.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>Offline / solo drafts</div>
            <div style={s.tipText}>A commissioner can also run the draft solo — picking for all teams in order. This is useful for mock drafts or when scheduling a live session is difficult.</div>
          </div>

          <h3 style={s.h3}>Draft Timer</h3>
          <p style={s.p}>
            If the commissioner sets a time limit, a progress bar below the pick header counts down. The bar changes color (green → yellow → red) as time runs low. When the timer reaches zero, the pick is automatically passed to the next team. This keeps the draft moving and prevents stalling.
          </p>

          <h3 style={s.h3}>Best Pick Recommendation</h3>
          <p style={s.p}>
            The draft room analyzes your current roster against your league's positional targets and highlights the single best available player for your needs. You'll see their name in the banner and a <strong>"Pick Recommended"</strong> button you can click to instantly draft them — useful when you're on the clock and can't decide.
          </p>

          <h3 style={s.h3}>Positional Needs Tracker</h3>
          <p style={s.p}>
            A bar below the pick banner shows how many of each position you've drafted vs. how many you need. Each slot turns green when filled and red when you're behind on a position. The tracker is sport-aware — EPL shows GKP/DEF/MID/FWD targets; NBA shows PG/SG/SF/PF/C; and so on.
          </p>

          <h3 style={s.h3}>Scarcity Alerts</h3>
          <p style={s.p}>
            The Scarcity Bar flashes a warning when elite players at a position are nearly gone from the board. For example: <em>"Only 2 elite TEs remaining"</em>. This is your signal to act now at that position before the window closes. Ignoring scarcity alerts is one of the most common ways to end up with a weak roster.
          </p>

          <h3 style={s.h3}>Player Stats Panel</h3>
          <p style={s.p}>
            Click any player in the list to open their stats panel at the bottom of the screen. You can toggle between <strong>2025 Season Stats</strong> and <strong>2026 Projections</strong>. The panel also shows their injury status (if any) and bye week. Close it with the ✕ button or click another player to compare.
          </p>

          <h3 style={s.h3}>Trade Simulator</h3>
          <p style={s.p}>
            Click <strong>Trade Sim</strong> in the header to open a hypothetical trade builder. Drag players between rosters to model a trade and see how both teams would look. No actual picks are changed — this is a planning tool to help you evaluate trades before proposing them in the season.
          </p>

          <h3 style={s.h3}>Draft Board</h3>
          <p style={s.p}>
            The Draft Board tab shows every pick made so far, organized by round. Each cell shows the pick number, team name, position, and player name. Use it to track which teams are stacking at certain positions and spot gaps in the board you can exploit.
          </p>

          <h3 style={s.h3}>My Queue</h3>
          <p style={s.p}>
            Before a live draft starts, use the <strong>My Queue</strong> tab in the league page to add players you want to target. During the draft, your queue appears in your draft room as a quick reference so you don't have to scroll the full player list under pressure.
          </p>

          <h3 style={s.h3}>Draft Recap (post-draft)</h3>
          <p style={s.p}>
            When the last pick is made, the draft room automatically transitions to the <strong>Draft Complete</strong> screen. It shows every pick in two views:
          </p>
          <ul style={s.ul}>
            <li><strong>By Round</strong> — see all picks in draft order, with the drafting team shown on each row</li>
            <li><strong>By Team</strong> — see any manager's full roster in one card</li>
          </ul>
          <p style={s.p}>
            Each pick is labeled with a <span style={{ ...s.chip, background: '#1a3a1a', color: '#68d391' }}>+N steal</span> or <span style={{ ...s.chip, background: '#2d1515', color: '#fc8181' }}>−N reach</span> badge based on how far the pick deviated from ADP. After 20 seconds, the screen automatically returns you to the league overview. You can click <strong>Back to League</strong> at any time to return immediately.
          </p>
          <div style={s.tip}>
            <div style={s.tipLabel}>Revisiting the recap</div>
            <div style={s.tipText}>The Draft Recap is available year-round from the <strong>Draft Recap</strong> tab in your league page — not just right after the draft.</div>
          </div>

          <h3 style={s.h3}>Import Stats (commissioner)</h3>
          <p style={s.p}>
            Commissioners can upload a custom CSV file to override the default ADP and stats used in the draft room. This is useful if your league uses custom rankings from a site like FantasyPros or if you want to inject projections that aren't in the default data.
          </p>
        </Section>

        {/* Section 9 */}
        <Section num={9} title="League Page Guide">
          <p style={s.p}>
            Once you're inside a league, a row of tabs at the top gives you access to every part of the season. Here's what each tab does:
          </p>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Tab</th>
                <th style={s.th}>What it does</th>
                <th style={s.th}>Available</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Overview', 'Your roster, recent activity, and league settings at a glance', 'Always'],
                ['Schedule', 'All weekly matchups with live scores (auto-refreshes every 60s)', 'Always'],
                ['My Lineup', 'Set your starting lineup for the selected week', 'Always'],
                ['Standings', 'Win/loss records and points totals for every team', 'Always'],
                ['Waivers', 'Claim players who are not on anyone\'s roster', 'Always'],
                ['Trades', 'Propose and accept player trades with other managers', 'Always'],
                ['Playoffs', 'Bracket view of end-of-season playoff matchups', 'Always'],
                ['Activity', 'Log of every roster move, trade, and pick in the league', 'Always'],
                ['Chat', 'League group chat for trash talk and coordination', 'Always'],
                ['Player News', 'Injury reports and news for NFL players', 'NFL only'],
                ['My Queue', 'Build a watchlist before the live draft', 'Pre-draft only'],
                ['Draft Recap', 'Full pick-by-pick review with steal/reach analysis', 'Post-draft'],
                ['Compare Players', 'Side-by-side stat comparison of any two players', 'Post-draft'],
                ['Bench Report', 'Shows points left on your bench — players you should have started', 'Post-draft'],
                ['Trade Block', 'See which managers are publicly open to trading', 'Post-draft'],
              ].map(([tab, desc, when]) => (
                <tr key={tab}>
                  <td style={{ ...s.td, fontWeight: '700', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{tab}</td>
                  <td style={s.td}>{desc}</td>
                  <td style={{ ...s.td, fontSize: '0.75rem', color: '#4a5568', whiteSpace: 'nowrap' }}>{when}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Bench Report</h3>
          <p style={s.p}>
            The Bench Report is one of the most useful post-draft tools. It shows how many points you <em>left on the bench</em> — players you sat who outscored your starters. If your bench consistently outscores your lineup, it's a sign you need to adjust your starter selections or make trades to upgrade your starting spots.
          </p>

          <h3 style={s.h3}>Trade Block</h3>
          <p style={s.p}>
            Managers can list themselves on the Trade Block to signal they're open to offers. Check this tab before sending blind trade proposals — targeting someone who's already looking to deal makes negotiations much smoother.
          </p>

          <h3 style={s.h3}>Compare Players</h3>
          <p style={s.p}>
            Use the Compare Players tab to put any two players side by side — stats, projections, ADP, and positional rank. Handy when you're deciding who to start, who to trade away, or who to target on waivers.
          </p>

          <div style={s.tip}>
            <div style={s.tipLabel}>Multi-sport note</div>
            <div style={s.tipText}>All features work across NFL, NBA, MLB, NHL, and EPL Soccer leagues. EPL player data is sourced from the Fantasy Premier League (FPL) API. Some NFL-specific features (Player News, DST scoring) only appear in NFL leagues.</div>
          </div>
        </Section>
      </div>
    </div>
  );
}
