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
  const resize = () => {
    w = document.documentElement.clientWidth;
    h = window.innerHeight;
    // A 1× display (most external monitors) stair-steps the hairline gaps
    // between cubies even with MSAA, so render those at 2× and let the browser
    // downsample — supersampling, within a pixel budget for very large screens.
    const dpr = window.devicePixelRatio || 1;
    const ss = dpr < 1.5 ? Math.min(2, Math.sqrt(9e6 / Math.max(1, w * h))) : 1;
    renderer.setPixelRatio(Math.min(Math.max(dpr, ss * dpr), 2));
    renderer.setSize(w, h, false);
    view.resize(w, h);
  };
  resize();
  window.addEventListener('resize', resize);

  // ---- input: the paper-press listener asks us first (src/life/paper.js)
  bus.cubeAt = (x, y) => view.pick(x, y);
  // a click twists the face under it — clockwise or anticlockwise, at random
  bus.twist = (face) => {
    const turns = Math.random() < 0.5 ? 1 : 3;
    director.click(face, turns);
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
      director.click(k);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      director.click('F');
    }
  };
  hitBtn?.addEventListener('keydown', onKey);

  // the page may load mid-scroll: arrive at that section's state without
  // playing the moves in between (the scramble is never shown being played)
  director.instant = true;
  director.setTarget(targetAt(window.scrollY, spans));
  director.tick(0);
  director.instant = prefs.reduced;

  const frame = (time, deltaMs) => {
    if (document.hidden) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    director.setTarget(targetAt(window.scrollY, spans));
    const before = director.k;
    const done = director.tick(dt);
    presence.update(dt);
    notes.follow(presence.state);
    // milestones, on the way forward only: two layers done, and the solve
    if (done.some((c) => c.kind === 'solve')) {
      if (before < STAGES[4].end && director.k >= STAGES[4].end && director.k < director.total) notes.show('layers', presence.state);
      if (before < director.total && director.k === director.total) {
        presence.celebrate();
        notes.show('solved', presence.state);
      }
    }
    view.update();
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
      delete window.__cube;
      canvas.classList.remove('is-ready');
    },
  };
}
