import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { BLOG_POSTS } from '../data/blog';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';

/**
 * Writing — a horizontal filmstrip of cream clippings on the dark spread. The
 * marquee auto-scrolls via the shared GSAP ticker (no own rAF). Each card tilts
 * in real CSS 3D toward the cursor — pointer-tracked rotateX/Y + a lift on Z,
 * composed with the static sine scatter — so the strip feels tactile, not flat.
 * Punchline words are redacted; hover reveals them. Drag or horizontal-scroll to
 * browse. Reduced motion → a flat static grid, no marquee, no tilt.
 */

// ─────────────────────────────────────────────────────────────────────────────
// The one word per title we redact. Readers lean in, hover to reveal.
// These are the *punchline* — the word that changes the meaning of the headline.
// ─────────────────────────────────────────────────────────────────────────────
const PUNCHLINES = {
  "WalletRIP Had a Security Problem. I Didn't Fix It. Here's the Full Story.": "Didn't",
  "Dime: An Expense Tracker That Actually Has Opinions About Your Spending": "Opinions",
  "Nib: A Menu Bar Scratchpad, an Apple Rant, and the State of AI and Swift": "Rant",
  "I Built My Own Sudoku App Because an Ad Interrupted My Winning Streak": "Interrupted",
  "I Got Tired of My Apps Looking Like Every Other AI Project, So I Built a Design Language": "Tired",
  "I Built an Interactive Attack Path Visualizer Because Spreadsheets Aren't Scary Enough": "Scary",
  "The Resume System Worked. So Naturally, I Broke It Trying to Make It Better.": "Broke",
  "Building OnTop: Three Broken APIs and One Very Clever Workaround": "Clever",
  "How I Built an AI Resume System That Actually Works": "Actually",
  "First Post: Setting Up This Blog with GitHub Skills": "First",
};

function formatDate(d) {
  if (!d) return '';
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Splits the title string at the punchline word and wraps it in Redacted.
function RedactedTitle({ title }) {
  const word = PUNCHLINES[title];
  if (!word) return title;
  const idx = title.indexOf(word);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <Redacted trigger="hover" tone="ink" stamp={false}>
        {word}
      </Redacted>
      {title.slice(idx + word.length)}
    </>
  );
}

export default function Blog() {
  const containerRef = useRef(null);
  const stripRef = useRef(null);
  const offsetRef = useRef(0);
  const hoverRef = useRef(false);
  const visibleRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, base: 0, moved: false });
  const wheelRef = useRef(false); // true briefly after a horizontal wheel — pauses auto
  const tiltFrame = useRef(0);
  const tiltData = useRef(null);

  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Duplicate for seamless infinite loop; reduced-motion uses single set (static grid)
  const displayPosts = reduced ? BLOG_POSTS : [...BLOG_POSTS, ...BLOG_POSTS];

  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const strip = stripRef.current;
    if (!strip || !container) return;

    // Sine-wave stagger via CSS custom properties so :hover can compose cleanly
    // (no JS-driven hover needed — CSS picks up the props)
    const cards = Array.from(strip.querySelectorAll('.opdesk-card'));
    cards.forEach((card, i) => {
      card.style.setProperty('--sine-y', `${Math.sin(i * 0.65) * 8}px`);
      card.style.setProperty('--sine-r', `${(i % 2 === 0 ? 1 : -1) * 1}deg`);
    });

    // Ticker: runs on GSAP's shared rAF — one loop to rule them all
    const tick = () => {
      if (hoverRef.current || dragRef.current.active || wheelRef.current || !visibleRef.current) return;
      const half = strip.scrollWidth / 2;
      if (half <= 0) return;
      offsetRef.current = (offsetRef.current + 0.45) % half;
      strip.style.transform = `translateX(${-offsetRef.current}px)`;
    };

    // Pause when section leaves viewport (battery / CPU relief)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (visibleRef.current = e.isIntersecting)),
      { threshold: 0 }
    );
    io.observe(container);

    // Horizontal wheel / trackpad scrubs the strip without hijacking the page's
    // vertical scroll. React's onWheel is passive (can't preventDefault), so we
    // bind a non-passive native listener. Only horizontal intent is captured;
    // vertical deltas fall straight through to the page.
    let wheelIdle;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical → let the page scroll
      const half = strip.scrollWidth / 2;
      if (half <= 0) return;
      e.preventDefault();
      offsetRef.current = (((offsetRef.current + e.deltaX) % half) + half) % half;
      strip.style.transform = `translateX(${-offsetRef.current}px)`;
      wheelRef.current = true; // pause the marquee so it doesn't fight the user
      clearTimeout(wheelIdle);
      wheelIdle = setTimeout(() => (wheelRef.current = false), 1200);
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      container.removeEventListener('wheel', onWheel);
      clearTimeout(wheelIdle);
      if (tiltFrame.current) cancelAnimationFrame(tiltFrame.current);
    };
  }, [reduced]);

  // ── Drag-to-scrub handlers ──────────────────────────────────────────────────
  // Pointer capture is acquired LAZILY — only once real drag movement is
  // detected, not on every pointerdown. Capturing immediately on pointerdown
  // re-targets the eventual pointerup/click synthesis to this wrapper instead
  // of whatever <a> was under the cursor (a WebKit quirk), which silently
  // killed navigation on the card links. A plain click never captures, so the
  // browser's normal click-through to the anchor is left alone.
  const onPointerDown = (e) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      base: offsetRef.current,
      moved: false,
      pointerId: e.pointerId,
      captured: false,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const delta = dragRef.current.startX - e.clientX;
    if (Math.abs(delta) > 5) {
      dragRef.current.moved = true;
      if (!dragRef.current.captured) {
        e.currentTarget.setPointerCapture(dragRef.current.pointerId);
        dragRef.current.captured = true;
      }
    }
    const strip = stripRef.current;
    if (!strip) return;
    const half = strip.scrollWidth / 2;
    if (half <= 0) return;
    // Clamp to valid range to prevent over-scrolling
    offsetRef.current = ((dragRef.current.base + delta) % half + half) % half;
    strip.style.transform = `translateX(${-offsetRef.current}px)`;
  };
  const onPointerUp = (e) => {
    if (dragRef.current.captured) {
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current.active = false;
  };
  // Block link navigation if the pointer moved (drag, not click)
  const onClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  // ── Per-card real-3D tilt — pointer-tracked rotate + Z lift, rAF-throttled ──
  // While tracking, the card carries .is-tilt (a short linear transition) so the
  // tilt follows the cursor in real time. On leave we drop the class and zero the
  // props, letting the default eased transition glide the card back to rest — a
  // gentle settle rather than a rigid snap, and no 0.3s-delayed chase (the jerk).
  const onCardMove = (e) => {
    if (dragRef.current.active) return; // don't fight a drag
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    tiltData.current = { el, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    if (tiltFrame.current) return;
    tiltFrame.current = requestAnimationFrame(() => {
      tiltFrame.current = 0;
      const d = tiltData.current;
      if (!d) return;
      const px = d.x / d.w - 0.5;
      const py = d.y / d.h - 0.5;
      d.el.classList.add('is-tilt');
      d.el.style.setProperty('--cy', `${(px * 7).toFixed(2)}deg`);
      d.el.style.setProperty('--cx', `${(-py * 7).toFixed(2)}deg`);
      d.el.style.setProperty('--cz', '12px');
    });
  };
  const onCardLeave = (e) => {
    const el = e.currentTarget;
    el.classList.remove('is-tilt');
    el.style.setProperty('--cx', '0deg');
    el.style.setProperty('--cy', '0deg');
    el.style.setProperty('--cz', '0px');
  };

  return (
    <section className="opdesk" id="blog">
      <header className="opdesk-header">
        <p className="opdesk-kicker">Writing</p>
        <KineticHeadline as="h2" font="impact" className="opdesk-title">
          THINGS I WROTE DOWN
        </KineticHeadline>
        {!reduced && (
          <p className="opdesk-hint" aria-hidden="true">
            DRAG OR SCROLL &middot; HOVER TO REVEAL
          </p>
        )}
      </header>

      <div
        ref={containerRef}
        className={`opdesk-strip-wrap${reduced ? ' opdesk-strip-wrap--static' : ''}`}
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => (hoverRef.current = false)}
        onPointerDown={reduced ? undefined : onPointerDown}
        onPointerMove={reduced ? undefined : onPointerMove}
        onPointerUp={reduced ? undefined : onPointerUp}
        onPointerLeave={reduced ? undefined : onPointerUp}
        onClickCapture={reduced ? undefined : onClickCapture}
      >
        <div ref={stripRef} className="opdesk-strip">
          {displayPosts.map((post, i) => (
            <a
              key={`${post.title}-${i}`}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="opdesk-card"
              draggable={false}
              onPointerMove={reduced ? undefined : onCardMove}
              onPointerLeave={reduced ? undefined : onCardLeave}
            >
              <p className="opdesk-card-date">{formatDate(post.date)}</p>
              <h3 className="opdesk-card-title">
                <RedactedTitle title={post.title} />
              </h3>
              <p className="opdesk-card-preview">{post.preview}</p>
              {post.tags?.length > 0 && (
                <div className="opdesk-card-tags">
                  <span className="opdesk-card-filed">TAGGED</span>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="opdesk-card-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <span className="opdesk-card-cta" aria-hidden="true">
                READ →
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
