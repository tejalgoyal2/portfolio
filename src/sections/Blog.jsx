import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { scroll } from '../life/scroll';
import { prefs } from '../life/prefs';
import { BLOG_POSTS } from '../data/blog';
import { createTow } from '../life/tow';
import { onLayout } from '../life/layout';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';

/**
 * Writing — a horizontal filmstrip of cream clippings on the dark spread. The
 * marquee auto-scrolls via the shared GSAP ticker (no own rAF). Each card tilts
 * in real CSS 3D toward the cursor — pointer-tracked rotateX/Y + a lift on Z,
 * composed with the static sine scatter — so the strip feels tactile, not flat.
 * Punchline words are redacted; hover reveals them. Drag or horizontal-scroll to
 * browse. Reduced motion → a flat static grid, no marquee, no tilt.
 *
 * The strip feels the page move: scroll speed quickens the crawl (smoothly), which
 * settles back to its idle pace as the page stops.
 *
 * The first time the strip is well into view (once a visit), the posts are
 * flown in: a little plane comes in at the right edge towing a banner, with the
 * first clipping roped on behind it and the rest following, and crosses the
 * spread (src/life/tow.js draws it). Once the first card is where it rests the
 * plane lets go and carries on off the left edge, and the strip, still moving
 * at the plane's speed, eases down into its crawl. Scroll away mid-flight, or
 * grab the strip, and it lets go there and then.
 *
 * The strip loops, one set of posts after the other; until it has caught up
 * with its first card after the flight there's nothing to its left yet, so a
 * drag or a swipe moves it as it is and never jumps it a whole set along. Let
 * go of a drag and it glides on at the speed you threw it, then settles.
 */
const CRAWL = 27; // px/s at rest
const TOWED_KEY = 'press-towed';
const towedYet = () => {
  try {
    return !!sessionStorage.getItem(TOWED_KEY);
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// The one word per title we redact. Readers lean in, hover to reveal.
// These are the *punchline* — the word that changes the meaning of the headline.
// ─────────────────────────────────────────────────────────────────────────────
const PUNCHLINES = {
  "Building tgoyal.me With Claude: The Full Guide, Every Prompt Included": "Every",
  "How to Build a Resume Skill in Claude That Tailors Itself to Every Job": "Itself",
  "My Resume Builder Thought 120% of a Page Was 'Slightly Over'": "Slightly",
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
// the synced titles have curly quotes; the keys above are typed straight
const straight = (t) => t.replace(/[‘’]/g, "'");

function RedactedTitle({ title }) {
  const word = PUNCHLINES[straight(title)];
  if (!word) return title;
  const idx = straight(title).indexOf(word);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <Redacted trigger="hover" tone="ink">
        {title.slice(idx, idx + word.length)}
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
  const towRef = useRef(null); // the flight, while there is one: { phase, letGo() }
  const loopRef = useRef({ period: 0, filled: true }); // one set's length; whether the strip has caught up since the flight
  const flingRef = useRef(null); // px/s a drag was let go at, for the ticker to pick up

  // where the strip is, kept within one set; until it has caught up after the
  // flight it may sit short of its first card, and that's left as it is
  const wrap = (o) => {
    const loop = loopRef.current;
    if (!loop.filled) {
      if (o < 0) return o;
      loop.filled = true;
    }
    const P = loop.period;
    return P > 0 ? ((o % P) + P) % P : o;
  };

  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Duplicate for seamless infinite loop; reduced-motion uses single set (static grid).
  // The copies are hidden from keyboards and screen readers, so each post is there once.
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
    let wrote = '';
    // the crawl's speed rides a soft spring: it eases to a stop when you hover,
    // pulls away when you leave (and glides down from a throw), and a scroll of the
    // page quickens it smoothly instead of kicking it
    // the strip's length, measured when it changes size (never per frame)
    // one set of posts, card to card (not half the strip: its padding isn't repeated)
    const loop = loopRef.current;
    const measure = () => {
      const n = cards.length / 2;
      loop.period = n >= 1 && cards[n] ? cards[n].offsetLeft - cards[0].offsetLeft : strip.scrollWidth / 2;
    };
    measure();
    let half = loop.period;
    const sized = new ResizeObserver(() => {
      measure();
      half = loop.period;
    });
    sized.observe(strip);
    let v = CRAWL;
    let a = 0;
    let boost = 0;

    // ---- the tow: waiting for the strip to come into view, flying, letting go, gone
    const section = container.parentElement;
    const first = cards[0];
    let tow = null;
    let flight = null;
    let geo = null;
    // the first card's resting place in the section (its box, less the strip's current slide)
    const measureTow = () => {
      if (!first) return;
      const sr = section.getBoundingClientRect();
      const cr = first.getBoundingClientRect();
      geo = { W: section.clientWidth, left: cr.left - sr.left + offsetRef.current, top: cr.top - sr.top, small: geo?.small ?? section.clientWidth < 720 };
    };
    let offTowLayout = () => {};
    if (first && !towedYet()) {
      measureTow();
      offTowLayout = onLayout(measureTow);
      flight = { phase: 'wait', t: 0, x: 0, unhook: 0 };
      offsetRef.current = -(geo.W * 1.6 + 600); // the cards wait off to the right
      loop.filled = false;
      strip.style.transform = `translateX(${-offsetRef.current}px)`;
    }
    const speed = () => (geo.small ? 270 : 380); // px/s: quick enough to feel flown, slow enough to watch
    const takeOff = () => {
      if (!flight || flight.phase !== 'wait') return;
      if (!tow) tow = createTow(section, { small: geo.small });
      flight.phase = 'tow';
      flight.t = 0;
      hoverRef.current = false; // a cursor resting on the strip doesn't hold the flight, or the crawl after it
      flight.x = geo.W + 24; // the tail, just past the right edge: the nose shows at once
    };
    const letGo = () => {
      if (!flight || flight.phase !== 'tow') return;
      flight.phase = 'away';
      // the strip keeps the plane's speed, and the crawl's spring brings it down
      v = speed();
      a = 0;
      try {
        sessionStorage.setItem(TOWED_KEY, '1');
      } catch {
        /* private mode: it may fly again next visit */
      }
    };
    const land = () => {
      // gone: off the edge, or the section left the screen mid-flight
      if (flight?.phase === 'wait' || flight?.phase === 'tow') {
        offsetRef.current = 0;
        loop.filled = true;
        v = CRAWL;
        a = 0;
        try {
          sessionStorage.setItem(TOWED_KEY, '1');
        } catch {
          /* fine */
        }
      }
      tow?.hide();
      flight = null;
    };
    towRef.current = { letGo, get phase() { return flight?.phase; } };
    const ready = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) takeOff();
      },
      { threshold: 0.5, rootMargin: '0px 0px -12% 0px' }
    );
    if (flight) ready.observe(container);

    const flyTick = (dt) => {
      flight.t += dt;
      const sp = speed();
      flight.x -= sp * dt;
      const y = geo.top - (geo.small ? 34 : 48) + Math.sin(flight.t * 2.3) * (geo.small ? 3 : 4);
      if (flight.phase === 'tow') {
        // the card hangs back the rope's length behind the plane's tail
        const cardX = flight.x + tow.size.len;
        offsetRef.current = geo.left - cardX;
        // it lets go a fifth of the way from the left edge (or as the card reaches
        // its place, if that comes first), so you see the rope drop and the plane leave
        if (offsetRef.current >= 0) offsetRef.current = 0;
        if (offsetRef.current >= 0 || flight.x <= geo.W * 0.2) letGo();
      } else {
        flight.unhook = Math.min(1, flight.unhook + dt / 0.7);
      }
      const cardX = geo.left - offsetRef.current;
      tow.draw({ x: flight.x, y, cardX, cardY: geo.top + 2, unhook: flight.unhook, t: flight.t });
      // off the left edge, banner and all
      if (flight.x + tow.size.rope + tow.size.banner + 40 < 0) land();
    };

    const tick = (time, deltaMs) => {
      if (!visibleRef.current) {
        // scrolled away mid-flight: the posts are simply there when you come back
        if (flight && flight.phase !== 'wait') land();
        return;
      }
      const dt = Math.min(0.05, deltaMs / 1000);
      if (half <= 0) return;
      if (flight?.phase === 'wait') return;
      if (flight?.phase === 'tow') {
        flyTick(dt);
        const next = `translateX(${(-offsetRef.current).toFixed(2)}px)`;
        if (next !== wrote) {
          wrote = next;
          strip.style.transform = next;
        }
        return;
      }
      if (flight) flyTick(dt);
      const held = hoverRef.current || dragRef.current.active || wheelRef.current;
      boost += (Math.min(Math.abs(scroll.v) * 0.22, 320) - boost) * (1 - Math.exp(-2.5 * dt));
      const target = held ? 0 : CRAWL + boost;
      // let go of a drag: it carries on at the speed it was thrown, either way
      if (flingRef.current !== null) {
        v = flingRef.current;
        a = 0;
        flingRef.current = null;
      }
      const [k, c] = held ? [10, 6.4] : [2.6, 3.4];
      a += (k * (target - v) - c * a) * dt;
      v += a * dt;
      if (held && Math.abs(v) < 0.4) v = a = 0;
      if (!dragRef.current.active && !wheelRef.current) offsetRef.current = wrap(offsetRef.current + v * dt);
      const next = `translateX(${(-offsetRef.current).toFixed(2)}px)`;
      if (next !== wrote) {
        wrote = next;
        strip.style.transform = next;
      }
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
      if (half <= 0) return;
      e.preventDefault();
      offsetRef.current = wrap(offsetRef.current + e.deltaX);
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
      ready.disconnect();
      offTowLayout();
      tow?.destroy();
      towRef.current = null;
      sized.disconnect();
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
    // grabbing the strip mid-flight: the plane lets go of it there and then
    if (towRef.current?.phase === 'tow') towRef.current.letGo();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      base: offsetRef.current,
      moved: false,
      pointerId: e.pointerId,
      captured: false,
      trail: [{ t: performance.now(), x: e.clientX }],
    };
  };
  const onPointerMove = (e) => {
    // the crawl holds only for a mouse actually moving over a clipping (to read it),
    // never for a cursor that just happens to be resting where the strip runs
    if (e.pointerType === 'mouse') hoverRef.current = !!e.target.closest?.('.opdesk-card');
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
    const trail = dragRef.current.trail;
    trail.push({ t: performance.now(), x: e.clientX });
    if (trail.length > 6) trail.shift();
    // the strip follows the pointer exactly, from wherever it was picked up
    offsetRef.current = wrap(dragRef.current.base + delta);
    dragRef.current.base = offsetRef.current - delta;
    strip.style.transform = `translateX(${-offsetRef.current}px)`;
  };
  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    if (d.captured) e.currentTarget.releasePointerCapture(d.pointerId);
    d.active = false;
    // how fast it was moving over the last few moves (none if it was held still)
    const trail = d.trail || [];
    const last = trail[trail.length - 1];
    const firstAt = trail.find((p) => last && last.t - p.t < 100) || last;
    if (d.moved && last && firstAt && last !== firstAt && performance.now() - last.t < 80) {
      const vx = (firstAt.x - last.x) / ((last.t - firstAt.t) / 1000);
      flingRef.current = Math.max(-2400, Math.min(2400, vx));
    }
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
    <section className="opdesk" id="blog" data-ground="ink" data-section="writing">
      <header className="opdesk-header" data-depart="lift">
        <p className="opdesk-kicker">Writing</p>
        <KineticHeadline as="h2" font="impact" className="opdesk-title">
          THINGS I WROTE DOWN
        </KineticHeadline>
        {!reduced && (
          <p className="opdesk-hint" aria-hidden="true">
            {prefs.fine ? <>DRAG OR SCROLL &middot; HOVER TO REVEAL</> : 'DRAG TO BROWSE'}
          </p>
        )}
      </header>

      <div
        ref={containerRef}
        className={`opdesk-strip-wrap${reduced ? ' opdesk-strip-wrap--static' : ''}`}
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
              aria-hidden={i >= BLOG_POSTS.length || undefined}
              tabIndex={i >= BLOG_POSTS.length ? -1 : undefined}
              data-pen="pencil"
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
