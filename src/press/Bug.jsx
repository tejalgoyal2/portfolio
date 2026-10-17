import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { pointer } from '../life/pointer';
import { prefs } from '../life/prefs';

/**
 * "Some broke." — so there's a bug loose in the empty paper beside the Work
 * headline: one of the hand-drawn icons, wandering about on its own, legs
 * going, turning where it walks. Come near and it scurries off. Catch it with
 * a click and it's squashed — "fixed!" scribbled where it was — and a while
 * later another one wanders in from the edge, because there's always another
 * one.
 *
 * One small element moved with a transform, only while it's on screen.
 * Reduced motion: it sits still (you can still squash it).
 */
const SPEED = 34; // px/s, ambling
const FLEE = 170; // px/s, running away
const NEAR = 120;

export default function Bug() {
  const zoneRef = useRef(null);
  const bugRef = useRef(null);
  const noteRef = useRef(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const bug = bugRef.current;
    const note = noteRef.current;
    if (!zone || !bug) return;
    let alive = true;
    let cancelled = false;
    import('../life/icons').then(({ ICON }) => {
      if (!cancelled) bug.innerHTML = ICON.bug || '';
    });

    let W = 1;
    let H = 1;
    const measure = () => {
      W = zone.clientWidth;
      H = zone.clientHeight;
    };
    measure();
    window.addEventListener('resize', measure);

    const b = { x: 0, y: 0, th: 0, v: SPEED, t: 0 };
    const spawn = () => {
      // in from an edge, heading inwards
      const edge = (Math.random() * 3) | 0;
      b.x = edge === 0 ? W + 20 : edge === 1 ? Math.random() * W : W * (0.3 + Math.random() * 0.7);
      b.y = edge === 0 ? Math.random() * H : edge === 1 ? H + 20 : -20;
      b.th = Math.atan2(H / 2 - b.y, W / 2 - b.x);
      alive = true;
      bug.classList.remove('is-squashed');
    };
    spawn();
    if (prefs.reduced) {
      b.x = W * 0.6;
      b.y = H * 0.5;
    }

    let on = false;
    const io = new IntersectionObserver(([e]) => (on = e.isIntersecting));
    io.observe(zone);

    const tick = (time, deltaMs) => {
      if (!on || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      if (alive && !prefs.reduced) {
        b.t += dt;
        const r = zone.getBoundingClientRect();
        const px = pointer.x - r.left;
        const py = pointer.y - r.top;
        const d = Math.hypot(px - b.x, py - b.y);
        let want = b.th + Math.sin(b.t * 0.9) * 0.9 * dt + (Math.random() - 0.5) * 1.6 * dt;
        let speed = SPEED;
        if (pointer.active && d < NEAR) {
          // scurry away from the cursor
          want = Math.atan2(b.y - py, b.x - px);
          speed = FLEE;
        }
        // keep to the zone: turn back towards the middle near the edges
        const m = 24;
        if (b.x < m || b.x > W - m || b.y < m || b.y > H - m) want = Math.atan2(H / 2 - b.y, W / 2 - b.x);
        let dTh = want - b.th;
        while (dTh > Math.PI) dTh -= Math.PI * 2;
        while (dTh < -Math.PI) dTh += Math.PI * 2;
        b.th += dTh * Math.min(1, dt * (speed > SPEED ? 9 : 2.5));
        b.v += (speed - b.v) * Math.min(1, dt * 4);
        b.x += Math.cos(b.th) * b.v * dt;
        b.y += Math.sin(b.th) * b.v * dt;
      }
      // its legs going: a little waddle as it walks
      const waddle = alive && !prefs.reduced ? Math.sin(b.t * (b.v / 3)) * 7 : 0;
      bug.style.transform = `translate3d(${(b.x - 20).toFixed(1)}px,${(b.y - 20).toFixed(1)}px,0) rotate(${((b.th * 180) / Math.PI + 90 + waddle).toFixed(1)}deg)`;
    };
    gsap.ticker.add(tick);

    let respawn = 0;
    const squash = (e) => {
      if (!alive) return;
      e.stopPropagation();
      alive = false;
      bug.classList.add('is-squashed');
      note.style.left = `${b.x}px`;
      note.style.top = `${b.y - 26}px`;
      note.textContent = 'fixed!';
      note.classList.remove('is-on');
      void note.offsetWidth;
      note.classList.add('is-on');
      clearTimeout(respawn);
      respawn = setTimeout(spawn, 5000 + Math.random() * 4000);
    };
    bug.addEventListener('pointerdown', squash);

    return () => {
      cancelled = true;
      gsap.ticker.remove(tick);
      io.disconnect();
      clearTimeout(respawn);
      window.removeEventListener('resize', measure);
      bug.removeEventListener('pointerdown', squash);
    };
  }, []);

  return (
    <div ref={zoneRef} className="cf-bugzone" aria-hidden="true">
      <span ref={bugRef} className="cf-bug" />
      <span ref={noteRef} className="cf-bug-note" />
    </div>
  );
}
