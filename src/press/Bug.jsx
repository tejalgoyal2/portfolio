import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { pointer } from '../life/pointer';
import { prefs } from '../life/prefs';
import { scroll } from '../life/scroll';
import { onLayout } from '../life/layout';
import { handHTML } from '../life/hand';

/**
 * "Some broke." — so there's a bug loose in the empty paper beside the
 * Projects headline: one of the hand-drawn icons, wandering about on its own,
 * legs going, turning where it walks. It dares you ("catch me if you can"),
 * and when you come near it scurries off, speed lines trailing, and gloats
 * once the chase is on ("i'm fast af, baby"). Catch it with a click and it's
 * caught: it's gone, and a little headstone fades up where it was — R.I.P. — and its
 * soul floats up out of it, swaying, and fades. A while later another one wanders in
 * from the edge, because there's always another one.
 *
 * One small element moved with a transform, only while it's on screen; its
 * place on the page is measured when the layout changes, never per frame.
 * Reduced motion: it sits still (you can still squash it).
 */
const SPEED = 34; // px/s, ambling
const FLEE = 170; // px/s, running away
const NEAR = 120;
const DARE = 'catch me if you can';
const GLOAT = 'i’m fast af baby';
const TAUNTS = ['too slow!', 'nope', 'zoom zoom', 'missed me!', 'nice try'];

// its headstone, hand-drawn
const STONE = `<svg viewBox="0 0 36 34" aria-hidden="true">
  <path class="stone" d="M6 32V13C6 6.5 11.4 2 18 2s12 4.5 12 11v19Z"/>
  <path class="stone-grass" d="M2 32.5h32M4 32l1.5-3.5M9 32l-1-3M27 32l1.4-3.2M32 32l-1.2-2.8"/>
  <text x="18" y="21" text-anchor="middle">RIP</text>
</svg>`;
// the soul: a little cartoon ghost with a wispy tail and sleepy eyes
const SOUL = `<svg viewBox="0 0 40 52" aria-hidden="true">
  <path class="soul-body" d="M20 3C10.5 3 5 10 5 19v13c0 4 2.4 6.6 5.2 6.6 2 0 3-1.6 4.8-1.6 1.6 0 2.4 3 5 7 1.6 2.6 3 4.8 4.6 6.2-0.8-3-0.4-6 1.4-8.4 1.4-1.8 3.4-2.4 4.8-4.2C33.6 35 35 33 35 30V19C35 10 29.5 3 20 3Z"/>
  <path class="soul-face" d="M13 19.5q2 2 4 0M23 19.5q2 2 4 0M17.5 25.5q2.5 1.6 5 0"/>
</svg>`;

export default function Bug() {
  const zoneRef = useRef(null);
  const bugRef = useRef(null);
  const sayRef = useRef(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const bug = bugRef.current;
    const say = sayRef.current;
    if (!zone || !bug) return;
    let alive = true;
    let cancelled = false;
    import('../life/icons').then(({ ICON }) => {
      if (!cancelled) bug.insertAdjacentHTML('afterbegin', ICON.bug || '');
    });

    let W = 1;
    let H = 1;
    let left = 0;
    let docTop = 0;
    const measure = () => {
      W = zone.clientWidth;
      H = zone.clientHeight;
      const r = zone.getBoundingClientRect();
      left = r.left;
      docTop = r.top + scroll.y;
    };
    measure();
    const offLayout = onLayout(measure);

    // what it says: a bubble that rides along above it
    let sayFor = 0;
    let sayW = 0;
    let saidGloat = false;
    let fled = 0;
    let nextTaunt = 0;
    const speak = (text, secs = 2.6) => {
      if (!say) return;
      say.innerHTML = handHTML(text);
      sayW = say.offsetWidth;
      say.classList.remove('is-on');
      void say.offsetWidth; // restart the pop (a few times per life at most)
      say.classList.add('is-on');
      sayFor = secs;
    };
    const hush = () => {
      sayFor = 0;
      say?.classList.remove('is-on');
    };

    const b = { x: 0, y: 0, th: 0, v: SPEED, t: 0 };
    let dareIn = 0;
    const spawn = () => {
      // in from an edge, heading inwards
      const edge = (Math.random() * 3) | 0;
      b.x = edge === 0 ? W + 20 : edge === 1 ? Math.random() * W : W * (0.3 + Math.random() * 0.7);
      b.y = edge === 0 ? Math.random() * H : edge === 1 ? H + 20 : -20;
      b.th = Math.atan2(H / 2 - b.y, W / 2 - b.x);
      alive = true;
      saidGloat = false;
      fled = 0;
      nextTaunt = 3;
      dareIn = 1.1; // once it's walked in a little way
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

    let dash = 0;
    const tick = (time, deltaMs) => {
      if (!on || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      let fleeing = false;
      if (alive && !prefs.reduced) {
        b.t += dt;
        const px = pointer.x - left;
        const py = pointer.y - (docTop - scroll.y);
        const d = Math.hypot(px - b.x, py - b.y);
        let want = b.th + Math.sin(b.t * 0.9) * 0.9 * dt + (Math.random() - 0.5) * 1.6 * dt;
        let speed = SPEED;
        if (pointer.active && d < NEAR) {
          // scurry away from the cursor
          want = Math.atan2(b.y - py, b.x - px);
          speed = FLEE;
          fleeing = true;
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

        // the dare once it's in; a gloat midway through the chase; the odd taunt after
        if (dareIn > 0 && (dareIn -= dt) <= 0) speak(DARE, 3);
        if (fleeing) {
          fled += dt;
          if (!saidGloat && fled > 1.3) {
            saidGloat = true;
            speak(GLOAT, 2.4);
          } else if (saidGloat && fled > nextTaunt && sayFor <= 0) {
            nextTaunt = fled + 3 + Math.random() * 3;
            speak(TAUNTS[(Math.random() * TAUNTS.length) | 0], 1.6);
          }
        }
      }
      if (sayFor > 0 && (sayFor -= dt) <= 0) hush();
      // its legs going: a little waddle as it walks; speed lines when it runs
      const waddle = alive && !prefs.reduced ? Math.sin(b.t * (b.v / 3)) * 7 : 0;
      bug.style.transform = `translate3d(${(b.x - 20).toFixed(1)}px,${(b.y - 20).toFixed(1)}px,0) rotate(${((b.th * 180) / Math.PI + 90 + waddle).toFixed(1)}deg)`;
      const wantDash = alive && b.v > SPEED * 2.2 ? 1 : 0;
      dash += (wantDash - dash) * Math.min(1, dt * 10);
      bug.style.setProperty('--dash', dash.toFixed(2));
      if (sayFor > 0 && say) {
        // kept whole inside the paper beside the headline
        // the bubble rides along just above it, its tail on the bug; near an
        // edge the bubble slides along so it stays whole, the tail doesn't
        const shift = Math.max(sayW / 2 + 4 - b.x, Math.min(0, W - sayW / 2 - 4 - b.x));
        say.style.transform = `translate3d(${b.x.toFixed(1)}px,${(b.y - 16).toFixed(1)}px,0)`;
        say.style.setProperty('--shift', `${shift.toFixed(1)}px`);
      }
    };
    gsap.ticker.add(tick);

    let respawn = 0;
    const squash = (e) => {
      if (!alive) return;
      e.stopPropagation();
      alive = false;
      hush();
      bug.classList.add('is-squashed');
      // its soul floats up out of it, swaying, and fades
      if (!prefs.reduced) {
        const soul = document.createElement('span');
        soul.className = 'cf-bug-soul';
        soul.innerHTML = SOUL;
        soul.style.left = `${b.x}px`;
        soul.style.top = `${b.y - 10}px`;
        zone.appendChild(soul);
        const sway = (k) => `translate(${(Math.sin(k * Math.PI * 2.2) * 9).toFixed(1)}px, ${(-k * 92).toFixed(1)}px) rotate(${(Math.sin(k * Math.PI * 2.2 + 0.6) * 9).toFixed(1)}deg)`;
        const a = soul.animate(
          [
            { transform: `${sway(0)} scale(0.3, 0.15)`, opacity: 0 },
            { transform: `${sway(0.08)} scale(0.9, 1.1)`, opacity: 0.95, offset: 0.12 },
            { transform: `${sway(0.25)} scale(1)`, opacity: 0.95, offset: 0.3 },
            { transform: `${sway(0.5)} scale(1)`, opacity: 0.8, offset: 0.55 },
            { transform: `${sway(0.75)} scale(1.04, 0.98)`, opacity: 0.45, offset: 0.78 },
            { transform: `${sway(1)} scale(1.1, 1.05)`, opacity: 0 },
          ],
          { duration: 2600, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' }
        );
        a.onfinish = () => soul.remove();
      }
      // and a headstone where it fell
      const stone = document.createElement('span');
      stone.className = 'cf-bug-stone';
      stone.innerHTML = STONE;
      stone.style.left = `${b.x}px`;
      stone.style.top = `${b.y}px`;
      zone.appendChild(stone);
      const st = stone.animate(
        // it simply fades up where it fell, stays a moment, and fades away
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'translateY(0)', offset: 0.14 },
          { opacity: 1, transform: 'translateY(0)', offset: 0.78 },
          { opacity: 0, transform: 'translateY(0)' },
        ],
        { duration: prefs.reduced ? 2400 : 3600, easing: 'ease-in-out' }
      );
      st.onfinish = () => stone.remove();
      clearTimeout(respawn);
      respawn = setTimeout(spawn, 5000 + Math.random() * 4000);
    };
    bug.addEventListener('pointerdown', squash);

    return () => {
      cancelled = true;
      gsap.ticker.remove(tick);
      io.disconnect();
      offLayout();
      clearTimeout(respawn);
      bug.removeEventListener('pointerdown', squash);
    };
  }, []);

  return (
    <div ref={zoneRef} className="cf-bugzone" aria-hidden="true">
      <span ref={bugRef} className="cf-bug">
        <svg className="cf-bug-dash" viewBox="0 0 40 30">
          <path d="M12 2v12M20 6v18M28 2v12" />
        </svg>
      </span>
      <span ref={sayRef} className="cf-bug-say" />
    </div>
  );
}
