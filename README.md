# tgoyal.me — Personal Portfolio

Terminal-aesthetic portfolio site. Built with React + Tailwind CSS v4 + Vite.

**Live:** [tgoyal.me](https://tgoyal.me)

## Quick Start

```bash
npm install
npm run dev       # Dev server at localhost:5173
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
```

## Deployment (Cloudflare Pages)

This site is deployed via [Cloudflare Pages](https://pages.cloudflare.com/) with automatic builds on push to `main`.

| Setting | Value |
|---------|-------|
| Framework preset | None |
| Build command | `npm run build` |
| Build output | `dist` |
| Node version | 20+ |

### Custom Domain

DNS is managed through Cloudflare. The domain `tgoyal.me` is registered via Namecheap with nameservers pointed to Cloudflare.

## Structure

```
src/
├── components/     # UI components (Hero, Terminal, Projects, etc.)
├── data/           # Content data (projects, experience, skills)
├── hooks/          # Custom hooks (scroll reveal, typing animation)
├── App.jsx         # Main app with boot sequence + routing
├── main.jsx        # Entry point
└── index.css       # Tailwind v4 theme + custom animations
```

## Customization

- **Colors/Theme**: Edit `@theme` in `src/index.css`
- **Content**: Edit files in `src/data/` (projects, experience, skills)
- **Resume**: Place PDF at `public/resume.pdf`
- **OG Image**: Place 1200x630 image at `public/og-image.png`

## Features

- Terminal boot sequence (skippable — press any key)
- Matrix rain background on hero section
- Typing text role animation
- Scroll-triggered section reveals (IntersectionObserver)
- Interactive skills constellation visualization
- Expandable project cards with tiered layout
- Experience timeline with expandable details
- Terminal overlay with CLI commands (press `` ` `` to toggle)
- 4x4 Sudoku easter egg
- Scroll progress bar + active nav section tracking
- Mobile responsive
- SEO + Open Graph meta tags
- ~80KB gzipped, zero external UI libraries

## Tech Stack

- **Framework**: React 19
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4
- **Fonts**: IBM Plex Mono, Share Tech Mono
- **Hosting**: Cloudflare Pages
- **DNS**: Cloudflare

## Security Headers

Custom security headers are served via `public/_headers`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

Designed by Tejal Goyal. Built with Claude.
