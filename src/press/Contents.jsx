import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { groundAt } from '../life/ground';
import { onLayout } from '../life/layout';
import { SECTIONS } from '../data/sections';

/**
 * The running head — the section flag along the top of the page, the way a
 * newspaper runs its sections across the masthead strip. Every section is
 * there at once, so the whole structure of the page is always in view; the
 * one you're in is inked red, and a hairline under it fills as you read
 * through it. One click (or Enter) flies you to any of them with Lenis.
 *
 * On narrow screens the strip shows where you are ("03 / 07 Skills") and a
 * Contents button that drops a small list under the strip — never the whole
 * screen. It closes on a choice, Escape, or a click anywhere else.
 *
 * The strip re-inks for the stock under it (cream, ink, red).
 */
const pad = (n) => String(n + 1).padStart(2, '0');
const BAND = 38; // px — the strip's height, which a jump clears

export default function Contents() {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  const toggleRef = useRef(null);
  const listRef = useRef(null);
  const fillRefs = useRef([]);

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
        fillRefs.current.forEach((el, k) => {
          if (el) el.style.transform = `scaleX(${k === i ? f.toFixed(3) : 0})`;
        });
      }
      const g = groundAt(BAND / 2);
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
        <span className="rh-no">{pad(current)}</span>
        <span className="rh-of">/ {pad(SECTIONS.length - 1)}</span>
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
      <ol ref={listRef} id="rh-list" className="rh-list">
        {SECTIONS.map(({ key, label }, i) => (
          <li key={key} className={i === current ? 'is-current' : undefined}>
            <button type="button" onClick={() => go(i)} aria-current={i === current ? 'true' : undefined}>
              <span className="rh-item-no">{pad(i)}</span>
              <span className="rh-item-label">{label}</span>
              <span className="rh-fill" ref={(el) => (fillRefs.current[i] = el)} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
