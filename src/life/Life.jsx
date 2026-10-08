import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { startPointer, pointer } from './pointer';
import { startScroll } from './scroll';
import { startGround, groundAt } from './ground';
import { startPaperPress, isEmptyPaper, HOLD_SECONDS } from './paper';
import { startWater } from './water';
import { startIconDrift } from './iconDrift';
import { startIconBurst } from './iconBurst';
import { prefs } from './prefs';
import { afterPrint } from './idle';

/**
 * The life layer's persistent pieces, mounted once beside the press layers:
 * the water a click disturbs, the pencil icons drifting on it, the
 * registration marks a click leaves on bare paper, the press-and-hold ink ring
 * and its burst of icons, the one-time "hold" hint, and the ink roller that
 * fills along the top edge with page progress. The shared pointer / scroll /
 * ground trackers and the one paper-press listener start here too.
 */
export default function Life() {
  useEffect(() => {
    startPointer();
    startScroll();
    startGround();
    startPaperPress();
  }, []);

  return (
    <>
      <WaterCanvas />
      <DriftCanvas />
      <RegistrationMarks />
      <BurstCanvas />
      <HoldRing />
      <HoldHint />
      <InkRoller />
    </>
  );
}

function WaterCanvas() {
  const ref = useRef(null);
  useEffect(() => afterPrint(() => startWater(ref.current)), []);
  return <canvas ref={ref} className="water" aria-hidden="true" />;
}

function DriftCanvas() {
  const ref = useRef(null);
  useEffect(() => afterPrint(() => startIconDrift(ref.current)), []);
  return <canvas ref={ref} className="icon-drift" aria-hidden="true" />;
}

function BurstCanvas() {
  const ref = useRef(null);
  useEffect(() => startIconBurst(ref.current), []);
  return <canvas ref={ref} className="icon-burst" aria-hidden="true" />;
}

/**
 * A click on bare paper prints a small registration mark where it landed. The
 * marks are printed on the sheet (document coordinates, so they scroll with
 * it), fade over ~2 s, and at most six are wet at once. Red on the cream, the
 * brighter spread red on the ink ground, paper on the red finale.
 */
const MAX_MARKS = 6;
const MARK_LIFE = 2100;
let markId = 0;

// Reduced motion: no stamp-in, just a plain fade. The site-wide reduced-motion
// CSS collapses keyframes to nothing, so the fade runs through the Web
// Animations API instead.
const fadeIfStill = (el) => {
  if (!el || !prefs.reduced) return;
  el.style.animation = 'none';
  el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: MARK_LIFE, fill: 'forwards' });
};

function RegistrationMarks() {
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    const timers = new Set();
    const onPress = (e) => {
      const { x, y, ground } = e.detail;
      const id = ++markId;
      const rot = Math.round(Math.random() * 30 - 15);
      setMarks((list) => [...list, { id, x, y: y + window.scrollY, ground, rot }].slice(-MAX_MARKS));
      const t = setTimeout(() => {
        timers.delete(t);
        setMarks((list) => list.filter((m) => m.id !== id));
      }, MARK_LIFE);
      timers.add(t);
    };
    window.addEventListener('life:press', onPress);
    return () => {
      window.removeEventListener('life:press', onPress);
      timers.forEach(clearTimeout);
    };
  }, []);

  return createPortal(
    <div className="reg-layer" aria-hidden="true">
      {marks.map((m) => (
        <svg
          key={m.id}
          ref={fadeIfStill}
          className={`reg-mark reg-mark--${m.ground}`}
          style={{ left: m.x, top: m.y, '--rot': `${m.rot}deg` }}
          viewBox="0 0 32 32"
          width="32"
          height="32"
        >
          <circle cx="16" cy="16" r="7.5" />
          <circle cx="16" cy="16" r="2.2" className="reg-dot" />
          <path d="M16 1.5v29M1.5 16h29" />
        </svg>
      ))}
    </div>,
    document.body
  );
}

/**
 * While a press is held on bare paper, an ink ring fills around the cursor —
 * full at the biggest splash. It follows the pointer, and is inked for the
 * ground it started on.
 */
const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function HoldRing() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const arc = el.querySelector('.hold-arc');
    const dot = el.querySelector('.hold-dot');
    let t0 = 0;
    let on = false;
    const tick = () => {
      if (!on) return;
      const p = Math.min(1, (performance.now() - t0) / 1000 / HOLD_SECONDS);
      el.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      arc.style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);
      dot.style.transform = `scale(${(0.25 + 0.75 * p).toFixed(3)})`;
    };
    const onHold = (e) => {
      const { phase, ground } = e.detail;
      if (phase === 'start') {
        on = true;
        t0 = performance.now();
        el.dataset.ground = ground || 'paper';
        el.classList.add('is-on');
        tick();
      } else {
        on = false;
        el.classList.remove('is-on');
      }
    };
    window.addEventListener('life:hold', onHold);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener('life:hold', onHold);
      gsap.ticker.remove(tick);
    };
  }, []);
  return (
    <div ref={ref} className="hold-ring" aria-hidden="true">
      <svg viewBox="0 0 56 56" width="56" height="56">
        <circle className="hold-track" cx="28" cy="28" r={RING_R} />
        <circle
          className="hold-arc"
          cx="28"
          cy="28"
          r={RING_R}
          style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C }}
        />
        <circle className="hold-dot" cx="28" cy="28" r="7" />
      </svg>
    </div>
  );
}

/**
 * Once per session, if the cursor has rested on bare paper for ~3 s, a small
 * "hold" note appears beside it — the only hint that holding prints. It goes
 * the moment the cursor or the page moves, or after a few seconds.
 */
const HINT_KEY = 'press-hold-hint';

function HoldHint() {
  const ref = useRef(null);
  useEffect(() => {
    if (!prefs.fine) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(HINT_KEY) === '1';
    } catch {
      /* storage blocked: show it at most once this page view */
    }
    if (shown) return;
    // someone who has already held doesn't need telling
    const knows = (e) => {
      if (e.detail?.phase !== 'start') return;
      shown = true;
      try {
        sessionStorage.setItem(HINT_KEY, '1');
      } catch {
        /* fine */
      }
    };
    window.addEventListener('life:hold', knows);
    const el = ref.current;
    let visible = false;
    let frame = 0;
    let since = 0;
    let atY = 0;
    const tick = () => {
      if (shown && !visible) return;
      frame++;
      if (visible) {
        if (pointer.rest < 0.05 || Math.abs(window.scrollY - atY) > 12 || performance.now() - since > 6000) {
          visible = false;
          el.classList.remove('is-on');
          gsap.ticker.remove(tick);
        }
        return;
      }
      if (!pointer.active || pointer.rest < 3 || frame % 10) return;
      const html = document.documentElement;
      if (html.classList.contains('is-holding')) return;
      if (!isEmptyPaper(document.elementFromPoint(pointer.x, pointer.y))) return;
      visible = true;
      shown = true;
      since = performance.now();
      atY = window.scrollY;
      try {
        sessionStorage.setItem(HINT_KEY, '1');
      } catch {
        /* fine */
      }
      el.dataset.ground = groundAt(pointer.y);
      el.style.transform = `translate3d(${pointer.x + 18}px, ${pointer.y + 14}px, 0)`;
      el.classList.add('is-on');
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('life:hold', knows);
    };
  }, []);
  return (
    <div ref={ref} className="hold-hint" aria-hidden="true">
      <span className="hold-hint-ring" />
      hold
    </div>
  );
}

/**
 * The ink roller — a 3 px rule along the top edge that inks across with page
 * progress (scaleX, nothing else). It runs press red, and turns paper-coloured
 * while it's over the red finale so it never disappears into it.
 */
function InkRoller() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    let lastP = -1;
    let lastOnRed = null;
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (Math.abs(p - lastP) > 0.0005) {
        lastP = p;
        el.style.transform = `scaleX(${p.toFixed(4)})`;
      }
      const onRed = groundAt(1) === 'red';
      if (onRed !== lastOnRed) {
        lastOnRed = onRed;
        el.classList.toggle('is-on-red', onRed);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return <div ref={ref} className="ink-roller" aria-hidden="true" />;
}
