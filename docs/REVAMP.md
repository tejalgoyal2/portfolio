# Revamp: bring tgoyal.me to life

**Decided with Tejal, 2026-10-17.** We keep this site (the cream-and-red "press" design) and polish it. We don't rebuild it.

**The main goal:** the page feels static today. Every cursor move, click and scroll should make the visitor feel the page is alive and responding to them. Content changes come second.

## Keep (don't restyle)
- The palette (cream paper, warm ink, press red, the dark-red spreads) and all five fonts in `src/styles/tokens.css`.
- The loader, KineticHeadline, misregistration, torn seams, cursor, wire ticker, blog sync, and the one Lenis/GSAP loop in `usePressScroll`.
- Rules from `CLAUDE.md`: light mode first-class, no fake effects, transforms and opacity only.
- Don't use design skills, plugins or component libraries for taste. Use your own judgment within this system.

## 1. The life layer (main goal)
Each item below is caused by the visitor (cursor, click, scroll) or is a slow ambient loop. Body text never moves while someone is reading it. Everything keeps 60 fps, and every item has a reduced-motion and a touch version.

**Cursor**
- **Nameplate:** the letters of TEJAL GOYAL ink heavier near the cursor (Fraunces `wght`/`opsz`, spring-smoothed) and settle back when it leaves.
- **Headlines:** letters near the cursor lift a little, like loose type in the stick, then drop back into place.
- **Cursor states:** the ring changes per target: a twist arc over the cube, a steering-wheel mark over the car, a pen nib over the gratitude input. Magnetic pull stays.

**Click**
- Clicking empty paper prints a small red registration mark where you clicked. It fades over about 2 s, with at most 6 on screen.
- **Icon rain:** a small rubber-stamp button (hero area, or fixed in a corner) rains the hand-drawn pencil icons from `matita-dev/icons` down the page with simple physics. They pile at the bottom of the viewport, a scroll or flick sweeps them away, and they clear by themselves after about 12 s. Check the repo's licence before vendoring the SVGs, and credit it in the colophon.
- Stamps keep their click impact.

**Scroll**
- A thin red "ink roller" line at the top fills with page progress.
- Scroll velocity gently skews the big headlines and speeds the wire ticker (the ticker already does this).
- Paragraphs ink in line by line, from ghost grey to ink, scrubbed to scroll position rather than a one-shot fade-up.
- Torn seams rip as you scroll through them (scrubbed).
- Projects: see §3.
- Experience: a red rule draws itself down the left margin as you scroll, and headline numbers count up.
- The Writing filmstrip reacts to scroll velocity.

**Ambient motion is welcome (Tejal, 2026-10-17).** Things should move a little on their own (slow, small, never over text being read), and the visitor's input adds to that motion rather than replacing it. Keep the existing small loops (the scroll cue, the "Now" dot), plus the cube turning, the wire crawling and the car idling.

**Living type field (the signature moment; reference: Claude Code's own welcome screen)**
- **The field:** behind the content, the paper carries a faint field of monospace characters (JetBrains Mono): ghost ink on cream, ghost paper on the dark spreads. Faint patches drift slowly across it, and characters flicker to new ones now and then, so the page is quietly alive even when nobody touches it.
- **Click:** clicking anywhere on empty paper sends a ripple ring through the field. Characters brighten and change as the front passes (red at the front, fading behind), and the ring keeps travelling to the screen edges.
- **Overlapping ripples:** each new click starts its own ripple without stopping the others, so several ripples cross and overlap at once.
- **Placement:** the field stays out from under paragraphs and headlines (masked around text blocks), so reading is never disturbed.
- **Performance:** draw it on one canvas (2D is fine), update only the cells that change, and pause it when the tab is hidden.
- **Reduced motion:** the field is still and faint, with no ripples.

## 2. The cube (keep the behaviour Tejal approved)
- **Files:**
  - model: `public/models/cube.glb`;
  - solve and checker: `docs/cube/solve.json` and `docs/cube/verify.py`;
  - behaviour: `docs/cube/CUBE.md`;
  - a tested engine already exists at `../tgoyal-site/site/src/cube/` (`model.ts`, `director.ts`, `schedule.ts`, `solve.ts`) with tests in `../tgoyal-site/site/tests/unit/`. Port it rather than rewrite it, and keep `verify.py` as a passing test.
- **Placement:** big in the empty right half of the hero. After the hero it docks small in a margin corner, never over text.
- **Motion:** turns slowly (about 0.15 rad/s). If the cursor rests in empty space it glides towards it. A click twists a face, and the visitor's twists are undone after about 4 s or before the next solve move.
- **No captions or move names.** On reaching Contact it is solved: one celebratory turn and a "SOLVED" stamp impact.
- **Solve across sections:**

| Section | Stage reached |
|---|---|
| Hero | scrambled |
| About | cross |
| Skills | pairs 1–2 |
| Projects | pairs 3–4 |
| Experience | top cross |
| Writing | top face |
| Contact | solved |

- **Rendering:** one shared fixed three.js canvas for the cube and the car. Lazy-load three after first paint, and pause when the tab is hidden.

## 3. Projects as front-page stories
- Each project is a front-page story: headline, a 3-line deck, a short looping screen recording, links, and "Read the full file" to expand the long text.
- Record the loops with Playwright from the live sites (type, Dime, IAM Threat Mapper, Sudoku, WalletRIP) as small muted MP4/WebM. Repo-only projects get a typographic poster in the press style.
- Order: type, Dime, IAM Threat Mapper, Claubi, then the rest.
- Loops "print in" with a red/blue plate offset that snaps into register. Stories stack like sheets sliding over each other on scroll.

## 4. Content (facts only from `src/data/*` and the notes below)
- **Hero headline:** `BUILDING SOFTWARE THAT FEELS OBVIOUS`.
- **Byline:** `Software · AI · Data`.
- **Deck:** "I'm Tejal — a software engineer who turns new ideas into products: AI agents, data pipelines, and things that are fun to use. Right now I'm connecting AI agents to BCI's financial systems."
- **Positioning:** innovative products, code, AI and data engineering. Security is a small part of the story, not the headline.
  - Rewrite the About headline, pull quote and paragraphs on that basis, using only real facts, and show Tejal the draft.
  - Drop "Classified … emails".
  - Keep the redaction reveal only where it's playful, such as blog punchlines.
- **Accuracy fix:** Tejal is not a named author on the federated-learning paper.
  - Change "Co-authored published paper" in `experience.js` (both places) to "Contributed implementations to a published paper on game-theoretic federated learning".
  - Change About's "Published: 1 paper" to match.
- **Skills:** cut to about 24, in four groups (AI & agents, Data, Product & web, Systems & tools).
- **Experience:** the 3 strongest bullets per role, with the rest behind "More".
- **Off the clock:** add speedcubing, origami (a MiG-29) and card skills. Tejal confirms the wording.
- **Meta tags in `index.html`:** replace "Breaking things…" with the new headline and deck. Update the README to describe this site, not the old terminal one.
- Leave the daily blog-sync commits as they are (Tejal's call).

## 5. The car
- **File:** `public/models/car-display.glb`. Four wheels named `pv_wheel0–3`; spin them about their axle.
- **Home:** a road along the bottom of the red Contact section. It drives in from the left when Contact enters, idles with a small bounce, and rolls a little with scroll velocity.
- **Hover:** it stops, the headlights flash twice, and a Caveat note appears: "Want to drive it? Take it out for a spin →". Click goes to `https://play.tgoyal.me`.
- play.tgoyal.me is not live yet, so put the link behind one config flag. Until it's live, the note reads "The garage opens soon" and nothing is linked.

## 6. The gratitude corner
- **Where:** a small "Letters to the editor" corner near Contact.
- **Ask:** "What are you grateful for today?" Each visitor leaves one or two words (≤ 24 characters), anonymously, once a day. On submit, a RECEIVED stamp lands.
- **Display:** every approved word as a printed slug on the corner. Identical words merge and grow with count, showing the newest ~60 distinct words.
- **Backend:** Cloudflare Pages Functions + D1 + Turnstile.
  - Each submission gets an automatic check with Workers AI `@cf/meta/llama-guard-3-8b` plus a word list. Flagged entries wait for Tejal's approval on an admin route protected by Cloudflare Access or a secret.
  - Rate-limit with a salted daily hash of the IP; never store raw IPs.
  - Tejal creates the D1 database, the Turnstile widget and the bindings. Walk him through it with wrangler.

## Process
- Work on a branch called `revamp`. Cloudflare Pages builds a preview URL per branch. `main` is the live site, so never push there until Tejal approves.
- Build the whole thing, but stop for Tejal's review after each phase:
  1. **Phase 1:** the life layer, hero and cube (§1, §2, the hero copy).
  2. **Phase 2:** projects and content (§3, §4).
  3. **Phase 3:** car and gratitude (§5, §6).
- Before each stop:
  - check desktop and phone sizes in a real browser and fix what you see;
  - run Lighthouse;
  - test reduced motion.
- Never leave a dev server running. Use `npm run build` plus a static preview, and stop it after checking.
