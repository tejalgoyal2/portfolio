<a href="https://tgoyal.me"><img src="docs/readme/front-page.webp" width="100%" alt="The front page of tgoyal.me: TEJAL GOYAL set as a newspaper nameplate over the headline BUILDING SOFTWARE THAT FEELS OBVIOUS, with a Rubik's cube in the right-hand column"></a>

# tgoyal.me

My personal site, set like a newspaper that notices you're there. Your cursor is a pen, a click sends a ripple through the paper, the headlines are loose type, and a Rubik's cube in the margin solves itself as you scroll.

**[Read it at tgoyal.me →](https://tgoyal.me)**

## What's in it

- **A cube that solves itself.** A three.js speedcube plays a verified 44-move solve across the sections. Twist it and it carries on from your mess.
- **Project tiles that turn over.** Each lead project is a case file in real CSS 3D that flips to its full story in a wave of little scales, a different wave for each one.
- **A gratitude sheet.** Stamp a word you're grateful for anywhere on the sheet, anonymously, up to three a day. Turnstile, Workers AI moderation and D1 run it on Cloudflare's free plan.
- **Things to find.** A bug to catch, a van and a boulder, a car that isn't the little one. Page settings keeps score.

Every animation has a still version for reduced motion, and the touch version is designed rather than switched off.

## Stack

React 19, Vite 7, GSAP and Lenis, three.js, Tailwind CSS v4. Hosted on Cloudflare Pages, with Pages Functions and D1 for the gratitude sheet.

```bash
npm install
npm run dev        # localhost:5173
npm run build      # into dist/
npm test           # the cube's solve check (Python 3) and unit tests
npm run test:e2e   # Playwright against a production build
```

The gratitude sheet needs a D1 binding `DB`, a Workers AI binding `AI`, and the secrets `TURNSTILE_SECRET`, `SALT` and `ADMIN_SECRET`. Locally it has no backend and says so.

## Credits

Type: Fraunces, Newsreader, Anton, JetBrains Mono and Caveat (SIL OFL). Hand-drawn icons by [matita-dev/icons](https://github.com/matita-dev/icons) and brand marks from [thesvg](https://github.com/glincker/thesvg), both MIT, with their licences beside them in `src/life`.

The code is mine and isn't licensed for reuse, but if you'd like to borrow something, ask. I'll probably say yes.
