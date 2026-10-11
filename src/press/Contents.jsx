import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { groundAt } from '../life/ground';
import { onLayout } from '../life/layout';
import { SECTIONS } from '../data/sections';
import { nib, nextNib, onNib } from '../life/nib';

/**
 * The running head — a capsule of liquid glass floating over the top of the
 * page with every section in it, so the whole structure is always in view.
 * The one you're in sits on a red pill that glides from label to label as you
 * scroll, with a hairline along its foot that fills as you read through it.
 * One click (or Enter) flies you to any section with Lenis. At its end, a chip
 * shows your pen (the cursor's icon) and swaps it.
 *
 * The glass re-inks for what's under it, but only for a real change of stock:
 * it checks well below itself too, so a thin dark band (the wire) passing
 * underneath doesn't flick it to dark and back. When it does change, it fades.
 *
 * On narrow screens the capsule shows where you are and a Contents button that
 * drops a small list — never the whole screen. It closes on a choice, Escape,
 * or a tap anywhere else.
 */
const BAND = 64; // px of page under the capsule, which a jump clears

export default function Contents() {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  const toggleRef = useRef(null);
  const listRef = useRef(null);
  const fillRef = useRef(null);
  const pillRef = useRef(null);
  const itemRefs = useRef([]);
  const [pen, setPen] = useState(nib());
  const [penSvg, setPenSvg] = useState('');

  // the pen chip shows the icon your cursor carries
  useEffect(() => {
    let icons = null;
    const paint = (n) => {
      setPen(n);
      if (icons) setPenSvg(icons[n.name] || '');
    };
    import('../life/icons').then(({ ICON }) => {
      icons = ICON;
      paint(nib());
    });
    return onNib(paint);
  }, []);

  // where each section sits, and which one you're reading
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
    };
    measure();
    const offLayout = onLayout(measure);

    let last = -1;
    let lastGround = '';
    let lastFill = -1;
    const tick = () => {
      const probe = window.scrollY + window.innerHeight * 0.38;
      let i = 0;
      bounds.forEach((b, k) => {
        if (b && probe >= b.top) i = k;
      });
      const changed = i !== last;
      if (changed) {
        last = i;
        setCurrent(i);
      }
      const b = bounds[i];
      const f = b ? Math.min(1, Math.max(0, (probe - b.top) / Math.max(1, b.bottom - b.top))) : 0;
      if (changed || Math.abs(f - lastFill) > 0.002) {
        lastFill = f;
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${f.toFixed(3)})`;
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
    };
  }, []);

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

  // the pill glides to the current section's label
  useEffect(() => {
    const place = () => {
      const item = itemRefs.current[current];
      const pill = pillRef.current;
      if (!item || !pill || !item.offsetParent) return;
      pill.style.width = `${item.offsetWidth}px`;
      pill.style.transform = `translateX(${item.offsetLeft}px)`;
    };
    place();
    document.fonts?.ready.then(place);
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [current]);

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

  return (
    <nav ref={barRef} className={`running-head${open ? ' is-open' : ''}`} data-ground="paper" aria-label="Sections">
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
      <div className="rh-track">
        <span ref={pillRef} className="rh-pill" aria-hidden="true">
          <span ref={fillRef} className="rh-fill" />
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
      </div>
      <button
        type="button"
        className="rh-pen"
        onClick={() => nextNib()}
        aria-label={`Change your pen — now: ${pen.label}`}
        title={`Your pen: ${pen.label} (click to change)`}
      >
        <span
          className="rh-pen-icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: penSvg }}
        />
      </button>
    </nav>
  );
}
