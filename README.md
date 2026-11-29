# tgoyal.me

My personal site, set like a newspaper: cream paper, warm ink, press red. It's meant to feel alive. The cursor is a pen, a click ripples the paper, and a Rubik's cube solves itself as you scroll.

**Live:** [tgoyal.me](https://tgoyal.me)

## Quick start

```bash
npm install
npm run dev       # dev server at localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build locally
npm test          # the cube's solve check + unit tests
```

## What's in it

- **The press:** the masthead, kinetic headlines, torn seams between spreads, a running head that inks along as you read, and the section names hung up like wood type.
- **The life layer** (`src/life/`): one shared pointer, scroll and ground tracker. It drives the drifting pencil icons, the click ripples and the pen cursor, plus the little things: the car on the rules, the van and boulder on the ridge, the bug, and the stamp.
- **The cube** (`src/cube/`, `src/gl/`): a stickerless speedcube in three.js, loaded after the first paint. It solves itself as you scroll. Click a face to twist it, and hold Shift to turn it the other way.
- **Content** lives in `src/data/`: projects, experience, skills and the blog (synced daily by a GitHub Action).
- **Icons:** the hand-drawn set is from [matita-dev/icons](https://github.com/matita-dev/icons) (MIT, `src/life/icons`). Brand marks are from [thesvg](https://github.com/glincker/thesvg) (MIT, `src/life/brands`).

Everything animates with transforms and opacity, off one Lenis + GSAP loop. Reduced motion gets a still, fully readable page.

## Stack

React 19, Vite 7, Tailwind CSS v4, GSAP, Lenis and three.js. The fonts are Fraunces, Newsreader, Anton, JetBrains Mono and Caveat.

## Deployment

Cloudflare Pages builds every push. `main` is the live site, and every other branch gets its own preview URL.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output | `dist` |
| Node | 20+ |

Security headers are served from `public/_headers`.

---

Designed and built by Tejal Goyal.
