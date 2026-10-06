import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { sheets, sheetAt } from '../life/sheets';
import { groundAt } from '../life/ground';
import { prefs } from '../life/prefs';
import { SECTIONS } from '../data/sections';

/**
 * The running head and the index.
 *
 * Top left, always: the section you're on (Front page, Profile, Skills…),
 * which rolls over to the next as each sheet arrives. Top right: MENU, whose
 * label rolls to CLOSE. Both re-ink for the ground under them.
 *
 * MENU lays a fresh sheet over the whole pile — the index — and sets the
 * section names into it like movable type, sort by sort, staggered down the
 * list; the current section is marked in red. Closing lifts the type back out
 * and the sheet away. Choosing a name closes the index and flies there with
 * Lenis. It's a modal dialog: focus moves into it and is held there, Escape
 * closes it, and focus returns to MENU. Reduced motion: it simply appears and
 * disappears.
 */
const pad = (n) => String(n + 1).padStart(2, '0');

function Sorts({ text }) {
  return [...text].map((ch, i) =>
    ch === ' ' ? (
      <span className="mi-space" key={i}>
        {' '}
      </span>
    ) : (
      <span className="mi-sort" key={i}>
        {ch}
      </span>
    )
  );
}

export default function Menu() {
  const labels = SECTIONS;
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  const sheetRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const tlRef = useRef(null);
  const busy = useRef(false);

  // which sheet you're reading, and which ground the bar sits on
  useEffect(() => {
    const bar = barRef.current;
    let last = -1;
    let lastGround = '';
    const tick = () => {
      const i = sheetAt(window.innerHeight * 0.38);
      if (i >= 0 && i !== last) {
        last = i;
        setCurrent(i);
      }
      const g = groundAt(24);
      if (g !== lastGround) {
        lastGround = g;
        bar.dataset.ground = g;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const html = document.documentElement;

  const show = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    const sheet = sheetRef.current;
    sheet.hidden = false;
    html.classList.add('menu-open');
    window.__lenis?.stop();
    setOpen(true);
    const sorts = sheet.querySelectorAll('.mi-sort');
    const meta = sheet.querySelectorAll('.mi-no, .menu-foot');
    tlRef.current?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
      },
    });
    if (prefs.reduced) {
      tl.set(sheet, { yPercent: 0, opacity: 1 }).set(sorts, { yPercent: 0, opacity: 1, rotate: 0 }).set(meta, { opacity: 1 });
    } else {
      tl.fromTo(sheet, { yPercent: -100, opacity: 1 }, { yPercent: 0, duration: 0.6, ease: 'power3.inOut' })
        .fromTo(
          sorts,
          { yPercent: 115, opacity: 0, rotate: () => gsap.utils.random(-8, 8) },
          { yPercent: 0, opacity: 1, rotate: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.012 },
          0.32
        )
        .fromTo(meta, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, 0.4);
    }
    tlRef.current = tl;
    // focus the section you're on
    requestAnimationFrame(() => {
      const list = listRef.current;
      (list?.querySelector('[aria-current="true"]') || list?.querySelector('button'))?.focus();
    });
  }, [html]);

  const hide = useCallback(
    (then) => {
      const sheet = sheetRef.current;
      if (sheet.hidden) return then?.();
      busy.current = true;
      const sorts = [...sheet.querySelectorAll('.mi-sort')].reverse();
      const meta = sheet.querySelectorAll('.mi-no, .menu-foot');
      tlRef.current?.kill();
      const done = () => {
        sheet.hidden = true;
        html.classList.remove('menu-open');
        window.__lenis?.start();
        setOpen(false);
        busy.current = false;
        then ? then() : buttonRef.current?.focus();
      };
      const tl = gsap.timeline({ onComplete: done });
      if (prefs.reduced) tl.set(sheet, { opacity: 0 });
      else {
        tl.to(meta, { opacity: 0, duration: 0.2 })
          .to(sorts, { yPercent: -115, opacity: 0, rotate: () => gsap.utils.random(-8, 8), duration: 0.32, ease: 'power2.in', stagger: 0.006 }, 0)
          .to(sheet, { yPercent: -100, duration: 0.5, ease: 'power3.inOut' }, '>-0.1');
      }
      tlRef.current = tl;
    },
    [html]
  );

  const go = (i) => {
    hide(() => {
      const top = i === 0 ? 0 : sheets[i]?.top ?? 0;
      window.__lenis ? window.__lenis.scrollTo(top, { duration: 1.4 }) : window.scrollTo(0, top);
      // land focus on the section you flew to, for keyboard readers
      const target = document.querySelectorAll('[data-sheet-label]')[i];
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    });
  };

  // Escape closes; Tab stays inside the open index
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      } else if (e.key === 'Tab') {
        const items = [buttonRef.current, ...sheet.querySelectorAll('button')];
        const at = items.indexOf(document.activeElement);
        e.preventDefault();
        const next = (at + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        items[next]?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

  const label = labels[current] || '';

  return (
    <>
      <div ref={barRef} className="running-head" data-ground="paper">
        <p className="rh-section">
          <span className="rh-no">{pad(current)}</span>
          <span className="rh-rule" aria-hidden="true" />
          <span className="rh-label" key={label}>
            {label}
          </span>
        </p>
        <button
          ref={buttonRef}
          type="button"
          className={`rh-menu${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-controls="press-index"
          onClick={() => (open ? hide() : show())}
          data-magnetic
        >
          <span className="rh-menu-roll" aria-hidden="true">
            <span>Menu</span>
            <span>Close</span>
          </span>
          <span className="sr-only">{open ? 'Close the index' : 'Open the index'}</span>
        </button>
      </div>

      <div
        ref={sheetRef}
        id="press-index"
        className="menu-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Index of sections"
        hidden
      >
        <nav className="menu-inner" aria-label="Sections">
          <p className="menu-kicker">The index</p>
          <ol ref={listRef} className="menu-list">
            {labels.map((name, i) => (
              <li key={name} className={`menu-item${i === current ? ' is-current' : ''}`}>
                <button type="button" onClick={() => go(i)} aria-current={i === current ? 'true' : undefined}>
                  <span className="mi-no">{pad(i)}</span>
                  <span className="mi-name" aria-hidden="true">
                    <Sorts text={name} />
                  </span>
                  <span className="sr-only">{name}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="menu-foot">Esc to close · you are on {label}</p>
        </nav>
      </div>
    </>
  );
}
