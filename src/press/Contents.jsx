import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { groundAt } from '../life/ground';
import { onLayout } from '../life/layout';
import { prefs } from '../life/prefs';
import { SECTIONS } from '../data/sections';
import { nib, nextNib, onNib } from '../life/nib';
import PageSettings from './PageSettings';
import { scroll } from '../life/scroll';

/**
 * The running head — a band of glass across the top of the page, ruled off
 * like a newspaper's folio line, with every section in it so the whole
 * structure is always in view.
 *
 * It sits on the page's own measure, lined up with the columns below it.
 * Along its foot runs one long rule that fills with red ink as you read, a
 * bead of wet ink at its head, reaching each label just as its section
 * begins. The section you're in is marked with a bookmark: a red silk ribbon
 * hanging from under its label, like the one sewn into a book's spine. When
 * you move on it slides along to the next label — off quickly, easing into
 * place — and swings from where it hangs as it goes, settling with a sway.
 *
 * One click (or Enter) flies you to any section with Lenis. At its end sit two
 * cells: your pen (click to swap it; hover for who drew it) and Page settings.
 * A comic bubble points the pen out once early on, and once more later.
 *
 * The glass re-inks for what's under it, but only for a real change of stock
 * (it checks well below itself too, so a thin band sliding under it doesn't
 * flick it), and fades when it does.
 *
 * Narrow screens: where you are, the rule, Contents (a small list), settings.
 */
const BAND = 64; // px of page under the bar, which a jump clears
const HINTS = {
  first: { key: 'press-hint-pen-1', text: 'psst! your cursor is a pencil. click up here to swap it' },
  later: { key: 'press-hint-pen-2', text: 'still on the pencil? there’s a rocket in here. just saying.' },
};
const seenHint = (k) => {
  try {
    return sessionStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const markHint = (k) => {
  try {
    sessionStorage.setItem(k, '1');
  } catch {
    /* fine */
  }
};

export default function Contents() {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(null);
  const barRef = useRef(null);
  const toggleRef = useRef(null);
  const listRef = useRef(null);
  const trackRef = useRef(null);
  const lineRef = useRef(null);
  const fillRef = useRef(null);
  const tipRef = useRef(null);
  const itemRefs = useRef([]);
  const geo = useRef({ starts: [], w: 1, narrow: false });
  const changedPen = useRef(false);
  const [pen, setPen] = useState(nib());
  const [icons, setIcons] = useState(null);

  // the pen chip (and the little pen drawing the rule) shows your cursor's icon
  useEffect(() => {
    import('../life/icons').then(({ ICON }) => setIcons(ICON));
    return onNib((n) => {
      setPen(n);
      changedPen.current = true;
      setHint(null);
    });
  }, []);
  const penSvg = icons?.[pen.tip ? pen.name : 'pencil'] || '';

  // where each label sits along the rule
  const place = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const w = narrow ? barRef.current.clientWidth : track.clientWidth;
    geo.current = {
      narrow,
      w: Math.max(1, w),
      // where the rule reaches each label: the first from the very left edge
      starts: itemRefs.current.map((el, i) => (i === 0 || !el ? 0 : el.offsetLeft + 4)),
    };
  }, []);

  // which section you're reading, and how far through it
  useEffect(() => {
    const bar = barRef.current;
    let bounds = [];
    const measure = () => {
      const sy = window.scrollY;
      bounds = SECTIONS.map(({ key }) => {
        const el = document.querySelector(`[data-section="${key}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: r.top + sy, bottom: r.bottom + sy };
      });
      place();
    };
    measure();
    document.fonts?.ready.then(measure);
    const offLayout = onLayout(measure);
    window.addEventListener('resize', measure);

    let last = -1;
    let lastGround = '';
    let lastTip = -1;
    const tick = () => {
      const probe = scroll.y + scroll.vh * 0.38;
      let i = 0;
      bounds.forEach((b, k) => {
        if (b && probe >= b.top) i = k;
      });
      if (i !== last) {
        last = i;
        setCurrent(i);
      }
      const b = bounds[i];
      const f = b ? Math.min(1, Math.max(0, (probe - b.top) / Math.max(1, b.bottom - b.top))) : 0;
      // the pen runs from this label towards the next; on a phone, along the whole page
      const { starts, w, narrow } = geo.current;
      let tip;
      if (narrow) {
        tip = (scroll.y / Math.max(1, scroll.max)) * w;
      } else {
        const a = starts[i] ?? 0;
        const z = i < starts.length - 1 ? starts[i + 1] : w;
        tip = a + (z - a) * f;
      }
      if (Math.abs(tip - lastTip) > 0.25) {
        lastTip = tip;
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${(tip / w).toFixed(4)})`;
        if (tipRef.current) tipRef.current.style.transform = `translate3d(${tip.toFixed(1)}px,0,0)`;
      }
      // a real change of stock, not a thin band sliding under the glass
      const near = groundAt(30);
      const g = near === groundAt(150) ? near : lastGround || near;
      if (g !== lastGround) {
        lastGround = g;
        bar.dataset.ground = g;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      offLayout();
      window.removeEventListener('resize', measure);
    };
  }, [place]);

  // the bookmark: slides to the label you're on and swings from where it hangs
  const ribbonRef = useRef(null);
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    const el = ribbonRef.current;
    if (!el) return;
    const rb = { x: 0, v: 0, th: 0, w: 0, goal: 0, placed: false, awake: false };
    const aim = () => {
      const item = itemRefs.current[currentRef.current];
      if (!item || !item.offsetParent) return false;
      rb.goal = item.offsetLeft + item.offsetWidth / 2;
      return true;
    };
    const write = () => {
      el.style.transform = `translate3d(${rb.x.toFixed(1)}px,0,0) rotate(${rb.th.toFixed(2)}deg)`;
    };
    const snap = () => {
      if (!aim()) return;
      rb.x = rb.goal;
      rb.v = rb.th = rb.w = 0;
      rb.placed = true;
      write();
    };
    const tick = (time, deltaMs) => {
      if (!rb.awake) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      // a spring that sets off quickly and eases a long way in (a touch under-damped)
      const a = 46 * (rb.goal - rb.x) - 11.5 * rb.v;
      rb.v += a * dt;
      rb.x += rb.v * dt;
      // hanging from its top, it swings back against the way it's carried
      rb.w += (-90 * rb.th - 5.5 * rb.w - a * 0.03) * dt;
      rb.th = Math.max(-38, Math.min(38, rb.th + rb.w * dt));
      write();
      if (Math.abs(rb.goal - rb.x) < 0.3 && Math.abs(rb.v) < 2 && Math.abs(rb.th) < 0.15 && Math.abs(rb.w) < 1) {
        rb.x = rb.goal;
        rb.th = rb.w = rb.v = 0;
        rb.awake = false;
        write();
      }
    };
    gsap.ticker.add(tick);
    const move = () => {
      if (!rb.placed || prefs.reduced) return snap();
      if (aim()) rb.awake = true;
    };
    el._move = move;
    document.fonts?.ready.then(snap);
    window.addEventListener('resize', snap);
    snap();
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', snap);
    };
  }, []);
  useEffect(() => {
    ribbonRef.current?._move?.();
  }, [current]);

  const go = useCallback((i) => {
    const el = document.querySelector(`[data-section="${SECTIONS[i].key}"]`);
    if (!el) return;
    setOpen(false);
    const top = i === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY - BAND;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.3 });
    else window.scrollTo({ top, behavior: 'smooth' });
    // keyboard readers land on the section they chose
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, []);

  // the narrow-screen list: Escape or a click elsewhere closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!barRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    requestAnimationFrame(() => listRef.current?.querySelector('[aria-current="true"]')?.focus());
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // the comic bubble: once a few seconds in (when you've had a look round),
  // once more later on — never if you've already changed pens
  useEffect(() => {
    if (!prefs.fine) return;
    let timer = 0;
    let hideTimer = 0;
    const show = (h) => {
      if (changedPen.current || seenHint(h.key) || nib().name !== 'pencil') return false;
      markHint(h.key);
      setHint(h.text);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setHint(null), 6500);
      return true;
    };
    let moved = false;
    const onMove = () => (moved = true);
    window.addEventListener('pointermove', onMove, { passive: true });
    const firstAt = performance.now() + 6500;
    timer = setInterval(() => {
      if (!moved || performance.now() < firstAt) return;
      if (!seenHint(HINTS.first.key)) show(HINTS.first);
      clearInterval(timer);
    }, 500);
    return () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);
  useEffect(() => {
    if (current < 4 || !prefs.fine || changedPen.current || seenHint(HINTS.later.key) || !seenHint(HINTS.first.key)) return;
    if (nib().name !== 'pencil') return;
    markHint(HINTS.later.key);
    setHint(HINTS.later.text);
    const t = setTimeout(() => setHint(null), 6500);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <nav ref={barRef} className={`running-head${open ? ' is-open' : ''}`} data-ground="paper" aria-label="Sections">
      <div className="rh-bar">
        <p className="rh-here" aria-hidden="true">
          <span className="rh-label" key={current}>
            {SECTIONS[current].label}
          </span>
        </p>
        <button
          ref={toggleRef}
          type="button"
          className="rh-toggle"
          aria-expanded={open}
          aria-controls="rh-list"
          onClick={() => setOpen((o) => !o)}
        >
          Contents <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <div ref={trackRef} className="rh-track">
          {/* the bookmark ribbon, hanging under the label you're on */}
          <span ref={ribbonRef} className="rh-ribbon" aria-hidden="true">
            <svg viewBox="0 0 14 26">
              <path d="M0 0H14V26L7 20.5 0 26Z" />
              <path className="rh-ribbon-sheen" d="M3.2 0V21.4" />
            </svg>
          </span>
          <ol ref={listRef} id="rh-list" className="rh-list">
            {SECTIONS.map(({ key, label }, i) => (
              <li key={key} className={i === current ? 'is-current' : undefined}>
                <button
                  ref={(el) => (itemRefs.current[i] = el)}
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === current ? 'true' : undefined}
                >
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <span ref={lineRef} className="rh-line" aria-hidden="true">
            <span ref={fillRef} className="rh-line-fill" />
            <span ref={tipRef} className="rh-line-tip">
              <span className="rh-line-bead" />
            </span>
          </span>
        </div>
        <div className="rh-cells">
          <div className="rh-pen-wrap" onPointerEnter={() => setHint(null)}>
            <button
              type="button"
              className="rh-pen"
              onClick={() => nextNib()}
              aria-label={`Change your pen — now: ${pen.label}`}
              aria-describedby="rh-credit"
            >
              <span className="rh-pen-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: penSvg }} />
            </button>
            <p id="rh-credit" className="rh-bubble rh-bubble--credit" role="tooltip">
              full disclosure: I didn&rsquo;t draw these. they&rsquo;re from{' '}
              <a href="https://github.com/matita-dev/icons" target="_blank" rel="noopener noreferrer">
                matita-dev/icons
              </a>
              . go give them a&nbsp;★
            </p>
            {hint && (
              <p className="rh-bubble rh-bubble--hint" role="status" key={hint}>
                {hint}
              </p>
            )}
          </div>
          <PageSettings />
        </div>
      </div>
    </nav>
  );
}
