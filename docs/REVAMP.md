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
- **Cursor states:** a twist arc over the cube. No other marks beside the pen (Tejal found the car's wheel and the gratitude nib distracting). Magnetic pull stays.

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
- Each lead project is a front-page story: its name as a headline, what it is in one or two plain lines (`eli5` in `projects.js`), and a small working **Try it** piece beside it (`src/press/Tryouts.jsx`), then the tech, links, and "Read the full file".
  - type: type a few keys and the letters land with weight. Dime: tap a sentence and it's set on a receipt and you get roasted. IAM Threat Mapper: the four steps of the Uber 2022 break-in; tap one to put the fix there. Claubi: a deny-first permission prompt with an audit log.
- No screen recordings or posters (Tejal didn't like them), and no moving card rows. The rest run "In brief": still newspaper columns.
- Order: type, Dime, IAM Threat Mapper, Claubi, then the rest.

## 4. Content (facts only from `src/data/*` and the notes below)
- **Hero headline:** `BUILDING SOFTWARE THAT FEELS OBVIOUS`.
- **Byline:** `Software · AI · Data`.
- **Deck:** "I'm Tejal — a software engineer who turns new ideas into products: AI agents, data pipelines, and things that are fun to use. Right now I'm teaching AI agents to talk to real systems."
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

## 6. The gratitude sheet
- **Where:** Let's talk, under the links: a cream sheet on the red covered in rubber-stamped words. Not a question to Tejal and not a letter: people put a word there because they're grateful for it.
- You type a word or two (≤ 24 characters); it becomes a stamp that follows the pointer over the sheet, and you click to press it down there (Enter finds a free spot). Each stamp has its own ink (red, black, blue) and angle; older ones fade. Anonymous, once a day; your own stays where you put it, for you, even while it waits for a check. The newest 80 show.
- **Backend:** Cloudflare Pages Functions + D1 + Turnstile.
  - Turnstile (checked for this site's hostnames and the `gratitude` action), a site-wide daily cap (300), a full review queue stops new words, and a salted daily hash of the IP (IPv6 by /64; raw IPs never stored).
  - Workers AI `@cf/meta/llama-guard-3-8b` plus a word list checks each word; flagged ones wait at `/letters-admin`, which can also take a printed word down.
  - Each stamp keeps where it was pressed (`x`, `y`, 0–1). Reading the sheet uses the status index (~80 rows). A `tally` table backs the admin list.
  - Everything runs on the Workers Free plan, which can't bill: past a free limit a piece just fails until midnight UTC.

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
