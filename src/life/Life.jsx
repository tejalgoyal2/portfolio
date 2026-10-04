import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { startPointer } from './pointer';
import { startScroll } from './scroll';
import { startGround, groundAt } from './ground';
import { startPaperPress } from './paper';
import { startTypeField } from './typeField';
import { startIconRain } from './iconRain';
import { prefs } from './prefs';
import { afterPrint } from './idle';

/**
 * The life layer's persistent pieces, mounted once beside the press layers:
 * the living type field, the registration marks a press leaves on bare paper,
 * the icon-rain sheet, and the ink roller that fills along the top edge with
 * page progress. The shared pointer / scroll / ground trackers and the one
 * paper-press listener start here too.
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
      <TypeFieldCanvas />
      <RegistrationMarks />
      <RainCanvas />
      <InkRoller />
    </>
  );
}

function TypeFieldCanvas() {
  const ref = useRef(null);
  useEffect(() => afterPrint(() => startTypeField(ref.current)), []);
  return <canvas ref={ref} className="type-field" aria-hidden="true" />;
}

function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => startIconRain(ref.current), []);
  return <canvas ref={ref} className="icon-rain" aria-hidden="true" />;
}

/**
 * A press on bare paper prints a small registration mark where it landed. The
 * marks are printed on the sheet (document coordinates, so they scroll with
 * it), fade over ~2 s, and at most six are wet at once. Red on the cream, the
 * brighter spread red on the dark-red ground, paper on the red finale.
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
  return <div ref={ref} className={`ink-roller${prefs.reduced ? ' is-still' : ''}`} aria-hidden="true" />;
}
