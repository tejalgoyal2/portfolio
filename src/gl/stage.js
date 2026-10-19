// The one shared WebGL canvas over the page (the cube now, the car in Phase 3),
// drawn from the shared gsap.ticker — never a second rAF. Loaded lazily after
// the loader lifts, transparent, pointer-events off; it pauses when the tab is
// hidden. Scroll position picks how far the solve has got: each section's
// stage is spread over the scroll it takes that section to pass the 60% line.
import { WebGLRenderer } from 'three';
import { gsap } from 'gsap';
import { Director } from '../cube/director';
import { targetAt } from '../cube/schedule';
import { SCRAMBLE, SOLVE, STAGES, SECTION_MOVES, SECTION_ORDER } from '../cube/solve';
import { FACES } from '../cube/model';
import { bus } from '../life/bus';
import { prefs, onPrefsChange } from '../life/prefs';
import { settings } from '../life/settings';
import { onLayout } from '../life/layout';
import { createCubeView } from './cube-view';
import { createPresence } from './presence';
import { createNotes } from './notes';

const LINE = 0.6; // a section's moves play while it scrolls past 60% of the viewport

export async function startStage(canvas, hitBtn, noteHost) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', stencil: false });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const director = new Director(SCRAMBLE, SOLVE, { instant: prefs.reduced });
  const offPrefs = onPrefsChange(() => (director.instant = prefs.reduced));
  const view = await createCubeView(director);
  const presence = createPresence(view, hitBtn);

  // ---- scroll → solve: one span per section after the hero
  let spans = [];
  const measureSpans = () => {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    const boxes = SECTION_ORDER.map((name) => {
      const el = document.querySelector(`[data-section="${name}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy };
    });
    const next = [];
    for (let i = 1; i < SECTION_ORDER.length; i++) {
      const b = boxes[i];
      if (!b) continue;
      const last = i === SECTION_ORDER.length - 1;
      const start = Math.max(0, Math.min(b.top - vh * LINE, max - 4));
      let end = b.bottom - vh * LINE;
      if (last) end = Math.min(end, max - 2);
      end = Math.max(start + 1, Math.min(end, max - 1));
      next.push({ start, end, from: SECTION_MOVES[SECTION_ORDER[i - 1]], to: SECTION_MOVES[SECTION_ORDER[i]] });
    }
    // keep spans ordered and non-overlapping even on odd layouts
    for (let i = 1; i < next.length; i++) {
      if (next[i].start < next[i - 1].end) next[i].start = next[i - 1].end;
      if (next[i].end <= next[i].start) next[i].end = next[i].start + 1;
    }
    spans = next;
  };
  measureSpans();
  const offLayout = onLayout(measureSpans);

  let w = 0;
  let h = 0;
  // The canvas is only as big as a box round the cube (not the whole screen):
  // the camera still frames the full viewport, but draws just that box
  // (setViewOffset), and the canvas rides to it. A fraction of the pixels — and
  // so of the GPU memory — of a full-screen stage. Sizes come in steps so the
  // drawing buffer is rarely reallocated.
  let side = 0;
  const resize = () => {
    w = document.documentElement.clientWidth;
    h = window.innerHeight;
    // A 1× display (most external monitors) stair-steps the hairline gaps
    // between cubies even with MSAA, so render those at 2× and let the browser
    // downsample — cheap now the canvas is small.
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(dpr < 1.5 ? 2 : Math.min(dpr, 2));
    view.resize(w, h);
    side = 0;
  };
  const frameBox = (st) => {
    const want = Math.max(96, Math.ceil(((st.r * 2.6 + 48) / 48)) * 48);
    if (want !== side) {
      side = want;
      renderer.setSize(side, side, false);
      canvas.style.width = canvas.style.height = `${side}px`;
    }
    const bx = Math.round(st.x - side / 2);
    const by = Math.round(st.y - side / 2);
    canvas.style.transform = `translate3d(${bx}px,${by}px,0)`;
    view.setCrop(bx, by, side, side);
  };
  resize();
  window.addEventListener('resize', resize);

  // ---- input: the paper-press listener asks us first (src/life/paper.js)
  bus.cubeAt = (x, y) => (settings.cube ? view.pick(x, y) : null);
  // a click twists the face under it clockwise — Shift for anticlockwise —
  // and the twists stay put until the page scrolls on
  let heldAt = 0;
  bus.twist = (face, back = false) => {
    const turns = back ? 3 : 1;
    director.click(face, turns);
    presence.kick(1);
    heldAt = window.scrollY;
    return turns;
  };
  bus.orbit = (dx, dy) => presence.orbit(dx, dy);
  bus.release = (vx, vy) => presence.release(vx, vy);
  const notes = createNotes(noteHost);

  // keyboard: focus the cube's handle, then U D F B R L twist that face
  const onKey = (e) => {
    const k = e.key.toUpperCase();
    if (FACES.includes(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      bus.twist(k, e.shiftKey);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bus.twist('F', e.shiftKey);
    }
  };
  hitBtn?.addEventListener('keydown', onKey);

  // the page may load mid-scroll: arrive at that section's state without
  // playing the moves in between (the scramble is never shown being played)
  director.instant = true;
  director.setTarget(targetAt(window.scrollY, spans));
  director.tick(0);
  director.instant = prefs.reduced;

  let shownOn = true;
  let rush = 0;
  let solvedOnce = false;
  const frame = (time, deltaMs) => {
    if (document.hidden) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (director.held && Math.abs(window.scrollY - heldAt) > 24) director.letGo();
    // once it's been solved it stays solved: scrolling back up doesn't scramble it again
    director.setTarget(solvedOnce ? director.total : targetAt(window.scrollY, spans));
    const before = director.k;
    const done = director.tick(dt);
    // switched off in Page settings: the solve keeps time, nothing is drawn
    if (settings.cube !== shownOn) {
      shownOn = settings.cube;
      document.documentElement.classList.toggle('cube-off', !shownOn);
      if (!shownOn) {
        bus.cursorHint = null;
        renderer.clear();
      }
    }
    if (!shownOn) return;
    presence.update(dt);
    notes.follow(presence.state);
    rush += ((director.rushing ? 1 : 0) - rush) * (1 - Math.exp(-5 * dt));
    if (!prefs.reduced) notes.whirl(presence.state, rush, dt);
    // milestones, on the way forward only: two layers done, and the solve
    if (done.some((c) => c.kind === 'solve')) {
      if (before < STAGES[4].end && director.k >= STAGES[4].end && director.k < director.total) notes.show('layers', presence.state);
      if (before < director.total && director.k === director.total) {
        solvedOnce = true;
        presence.celebrate();
        notes.show('solved', presence.state);
      }
    }
    view.update();
    frameBox(presence.state);
    renderer.render(view.scene, view.camera);
  };
  gsap.ticker.add(frame);

  // fade the canvas in once the first frame is drawn
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      canvas.classList.add('is-ready');
      presence.reveal();
    })
  );

  // a read-only peek for anyone curious in the console
  window.__cube = {
    get moves() {
      return `${director.k} / ${director.total}`;
    },
    get solved() {
      return director.state.isSolved();
    },
    get yourTwists() {
      return director.visitor.length;
    },
  };

  return {
    director,
    stop() {
      gsap.ticker.remove(frame);
      window.removeEventListener('resize', resize);
      hitBtn?.removeEventListener('keydown', onKey);
      offLayout();
      offPrefs();
      presence.dispose();
      view.dispose();
      renderer.dispose();
      bus.cubeAt = null;
      bus.twist = null;
      bus.orbit = null;
      bus.release = null;
      notes.dispose();
      document.documentElement.classList.remove('cube-off');
      delete window.__cube;
      canvas.classList.remove('is-ready');
    },
  };
}
