// The one shared WebGL canvas over the page (the cube now, the car in Phase 3),
// drawn from the shared gsap.ticker — never a second rAF. Loaded lazily after
// the loader lifts, transparent, pointer-events off; it pauses when the tab is
// hidden. Scroll position picks how far the solve has got: each section's
// stage is spread over the scroll it takes that section to pass the 60% line.
// It only draws when something on screen changed: a turn in flight, the cube
// moving (its slow turn, the float, a drag), the canvas moving — an idle cube,
// or one tucked away off screen, costs next to nothing.
import { WebGLRenderer } from 'three';
import { gsap } from 'gsap';
import { Director } from '../cube/director';
import { targetAt } from '../cube/schedule';
import { SCRAMBLE, SOLVE, STAGES, SECTION_MOVES, SECTION_ORDER } from '../cube/solve';
import { FACES, FACE_AXIS } from '../cube/model';
import { bus } from '../life/bus';
import { prefs, onPrefsChange } from '../life/prefs';
import { settings } from '../life/settings';
import { onLayout } from '../life/layout';
import { createCubeView, CUBE_REACH } from './cube-view';
import { createPresence } from './presence';
import { createNotes } from './notes';
import { clack } from '../life/sound';
import { setSetting } from '../life/settings';
import { scroll } from '../life/scroll';
import { found } from '../life/discover';

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
      if (last) {
        // the last moves land as the cube settles into its spot in Let's talk (centred on
        // the screen, src/gl/presence.js), not at the very bottom of the page, where it's half gone
        const home = document.querySelector('[data-cube-home="contact"]')?.getBoundingClientRect();
        if (home?.height) end = Math.min(end, home.top + sy + home.height / 2 - vh * 0.5);
        end = Math.min(end, max - 2);
      }
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
  let boxX = NaN;
  let boxY = NaN;
  let dirty = true; // something changed that the last drawn frame doesn't show
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
    dirty = true;
  };
  const frameBox = (st) => {
    const want = Math.max(96, Math.ceil(((st.r * 2.6 + 48) / 48)) * 48);
    if (want !== side) {
      side = want;
      // (resizing clears the drawing buffer, so it must be drawn again)
      renderer.setSize(side, side, false);
      canvas.style.width = canvas.style.height = `${side}px`;
      boxX = NaN;
    }
    const bx = Math.round(st.x - side / 2);
    const by = Math.round(st.y - side / 2);
    if (bx === boxX && by === boxY) return;
    // the canvas and the view inside it move together, in the same drawn frame
    boxX = bx;
    boxY = by;
    canvas.style.transform = `translate3d(${bx}px,${by}px,0)`;
    view.setCrop(bx, by, side, side);
    dirty = true;
  };
  resize();
  window.addEventListener('resize', resize);

  // ---- input: the paper-press listener asks us first (src/life/paper.js)
  bus.cubeAt = (x, y) => (settings.cube ? view.pick(x, y) : null);
  // a click twists the face under it clockwise — Shift for anticlockwise —
  // and the twist stays: the solve carries on from wherever you leave it
  bus.twist = (face, back = false) => {
    const turns = back ? 3 : 1;
    director.click(face, turns);
    found('twist');
    presence.kick(1);
    twisted = true;
    return turns;
  };
  bus.orbit = (dx, dy) => {
    found('orbit');
    presence.orbit(dx, dy);
  };
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
  director.arrive(targetAt(window.scrollY, spans));

  let shownOn = true;
  let twisted = false;
  // each turn, as it starts: lines round the cube the way it's going, a jelly
  // squash along its axis, and — for one you made — the click of the plastic
  let lastActive = null;
  let lastLines = 0;
  const onTurn = (a, now) => {
    const axis = FACE_AXIS[a.move.face].axis;
    const mine = a.kind === 'visitor';
    const quick = a.duration < 0.16;
    presence.wobble(axis, mine ? 0.085 : quick ? 0.045 : 0.03);
    if (mine) clack(a.duration);
    // lines: every twist of yours; the solve's own turns lighter, and not every one while it rushes
    if (mine || now - lastLines > (quick ? 150 : 0)) {
      lastLines = now;
      notes.swoosh(presence.state, view.rim(a.move, mine ? 3 : 2), mine);
    }
  };
  // a page that's struggling: the cube offers to get out of the way (once a visit)
  let slowAvg = 16.7;
  let slowFor = 0;
  let askedSlow = false;
  // the first time you come near it (and haven't played yet): "play with me?" (once a visit)
  let nearFor = 0;
  let askedPlay = false;
  try {
    askedPlay = sessionStorage.getItem('press-cube-play') === '1';
    askedSlow = sessionStorage.getItem('press-cube-slow') === '1';
  } catch {
    /* fine */
  }
  const once = (k) => {
    try {
      sessionStorage.setItem(k, '1');
    } catch {
      /* fine */
    }
  };
  // what the last drawn frame showed: the cube's transform and its edge light
  const drawn = { x: NaN, y: 0, s: [0, 0, 0], q: view.group.quaternion.clone(), edge: -1 };
  const g = view.group;
  let draws = 0;
  let laidOut = false; // the cubies are where the view last put them
  let tucked = false; // wholly off screen, canvas cleared
  /** Roughly how far (in CSS px) any point of the cube has moved since the last drawn frame. */
  const drift = (r) => {
    const dq = Math.min(1, Math.abs(g.quaternion.dot(drawn.q)));
    const turn = 2 * Math.acos(dq) * r;
    const grow = Math.max(Math.abs(g.scale.x - drawn.s[0]), Math.abs(g.scale.y - drawn.s[1]), Math.abs(g.scale.z - drawn.s[2])) * CUBE_REACH;
    return Math.hypot(g.position.x - drawn.x, g.position.y - drawn.y) + turn + grow;
  };
  /**
   * Wholly outside the viewport: the cube's bounding sphere (jelly and all), seen
   * through the camera's perspective, doesn't reach the screen on some side.
   */
  const offScreen = (st) => {
    const R = CUBE_REACH * Math.max(g.scale.x, g.scale.y, g.scale.z);
    const D = view.camera.position.z;
    // where the sphere's outline lands along one screen axis, measured from the screen's middle
    const span = (off) => {
      const c = Math.atan(off / D);
      const a = Math.asin(Math.min(1, R / Math.hypot(off, D)));
      return [D * Math.tan(c - a), D * Math.tan(c + a)];
    };
    const [x0, x1] = span(st.x - w / 2);
    const [y0, y1] = span(st.y - h / 2);
    return x1 < -w / 2 - 1 || x0 > w / 2 + 1 || y1 < -h / 2 - 1 || y0 > h / 2 + 1;
  };
  const draw = () => {
    renderer.render(view.scene, view.camera);
    drawn.x = g.position.x;
    drawn.y = g.position.y;
    drawn.s[0] = g.scale.x;
    drawn.s[1] = g.scale.y;
    drawn.s[2] = g.scale.z;
    drawn.q.copy(g.quaternion);
    drawn.edge = view.uniforms.uEdge.value;
    dirty = false;
    tucked = false;
    draws++;
  };

  const bornAt = performance.now();
  const frame = (time, deltaMs) => {
    if (document.hidden) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    // (once it's really been solved the director rests and ignores this: scrolling back up doesn't scramble it again)
    director.setTarget(targetAt(scroll.y, spans));
    const before = director.k;
    const done = director.tick(dt);
    if (done.length) laidOut = false;
    // switched off in Page settings: the solve keeps time, nothing is drawn
    if (settings.cube !== shownOn) {
      shownOn = settings.cube;
      document.documentElement.classList.toggle('cube-off', !shownOn);
      if (!shownOn) {
        bus.cursorHint = null;
        renderer.clear();
      }
      dirty = true;
    }
    if (!shownOn) return;
    presence.update(dt);
    notes.follow(presence.state);
    const now = performance.now();
    if (director.active && director.active !== lastActive && !director.instant) onTurn(director.active, now);
    lastActive = director.active;
    // slow frames, sustained (a few seconds well under 40 fps, page in view)
    // (a single long stall — a screenshot, a tab coming back — isn't slowness: skip it)
    if (deltaMs < 200) slowAvg += (deltaMs - slowAvg) * 0.05;
    slowFor = slowAvg > 26 ? slowFor + dt : Math.max(0, slowFor - dt * 2);
    if (!askedSlow && slowFor > 5 && now - bornAt > 8000 && presence.state.seen) {
      if (notes.say('slow', presence.state, () => setSetting('cube', false))) {
        askedSlow = true;
        once('press-cube-slow');
      }
    }
    if (!askedPlay && !twisted && presence.state.near && presence.state.seen && now - bornAt > 8000) {
      nearFor += dt;
      if (nearFor > 0.7 && notes.say('play', presence.state)) {
        askedPlay = true;
        once('press-cube-play');
      }
    } else nearFor = 0;
    if (twisted && askedPlay) notes.hushIf('play');
    // milestones: two layers done (on the way forward, and only if they really are — your
    // twists may have left them otherwise), and the solve, whenever the cube really is solved
    if (done.some((c) => c.kind === 'solve') && before < STAGES[4].end && director.k >= STAGES[4].end && director.k < director.total && director.state.firstTwoLayers())
      notes.show('layers', presence.state);
    if (done.some((c) => c.solved)) {
      found('solved');
      presence.celebrate();
      notes.show('solved', presence.state);
    }
    // the cubies only move while a turn is in flight, or the moment one lands
    if (director.active || !laidOut) {
      view.update();
      laidOut = !director.active;
      dirty = true;
    }
    const st = presence.state;
    frameBox(st);
    // wholly off screen (slid out past the edge while a band goes by): nothing to draw
    if (offScreen(st)) {
      if (!tucked) renderer.clear();
      tucked = true;
      dirty = true;
      return;
    }
    // and only when something you could see has changed: well under a pixel of drift is nothing
    if (dirty || drift(st.r) > 0.1 || Math.abs(view.uniforms.uEdge.value - drawn.edge) > 0.002) draw();
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
      return director.twists;
    },
    /** Frames actually drawn so far (it skips the ones where nothing changed). */
    get draws() {
      return draws;
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
