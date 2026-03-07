# tgoyal.me — Personal Portfolio

Terminal-aesthetic portfolio. Built with React + Tailwind CSS v4 + Vite.

## Quick Start

```bash
npm install
npm run dev       # Dev server
npm run build     # Production build
npm run preview   # Preview build locally
```

## Deploy to Vercel

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial portfolio"
git remote add origin https://github.com/tejalgoyal2/portfolio.git
git push -u origin main
```

2. Go to vercel.com → sign in with GitHub → Import repo → Deploy.

3. Add custom domain: Vercel dashboard → Settings → Domains → Add `tgoyal.me`.

4. In Cloudflare DNS:
   - CNAME `@` → `cname.vercel-dns.com`
   - CNAME `www` → `cname.vercel-dns.com`
   - Set proxy to "DNS only" (gray cloud) for Vercel SSL.

## Structure

```
src/
├── components/     All UI components
├── data/           Content (projects, experience, skills)
├── hooks/          Custom hooks (scroll reveal, typing text)
├── App.jsx         Main app
├── main.jsx        Entry point
└── index.css       Tailwind v4 theme + animations
```

## Customization

- **Colors**: Edit `@theme` in `src/index.css`
- **Content**: Edit files in `src/data/`
- **Resume**: Place PDF at `public/resume.pdf`
- **OG Image**: Place 1200x630 image at `public/og-image.png`

## Features

- Terminal boot sequence (skippable)
- Matrix rain hero background
- Typing text animation
- Scroll-triggered reveals (IntersectionObserver)
- Interactive skills constellation
- Expandable project cards and experience timeline
- Terminal overlay with CLI commands
- Mini Sudoku easter egg
- Scroll progress bar + active nav tracking
- Mobile responsive
- SEO + Open Graph meta tags
- ~80KB gzipped total, zero external UI deps

---
Designed by Tejal Goyal. Built with Claude.
