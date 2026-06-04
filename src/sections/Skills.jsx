import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';
import { fireImpact } from '../press/PressImpacts';

const { Engine, Runner, World, Bodies, Mouse, MouseConstraint, Events, Composite } = Matter;

/**
 * The Back Shop — a printer's California job case. Each skill is a movable-type
 * slug that lies flat in its category compartment, laid out in tidy rows; grab
 * one and flick it and it slides and clacks. This is a TOP-DOWN tray, not a
 * gravity bin: there's no gravity, so slugs never pile into an unreadable heap —
 * they rest where they're laid (readable by construction) and a flicked slug
 * glides on air-friction until it bumps a wall and settles. Physics (matter.js)
 * runs only while the case is on screen; the slugs are drawn with a custom
 * Canvas2D pass so the type stays crisp and legible — legibility first, joy
 * second. Reduced-motion gets the tidy static type tray instead.
 */
const LABEL_H = 42; // reserved strip so slugs never sit under the label
const SLUG_FONT = '600 18px "Newsreader", Georgia, serif';
const PAD_X = 14;
const SLUG_H = 38;
const GAP_X = 8; // horizontal space between slugs in a row
const GAP_Y = 8; // vertical space between rows
const EDGE = 6; // inset from compartment walls
const THROW_V = 6; // release speed (px/step) above which a flick "lands"

export default function Skills() {
  const rootRef = useRef(null);
  const caseRef = useRef(null);
  const canvasRef = useRef(null);
  const compRefs = useRef([]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // JSX renders the static tray; no engine

    const caseEl = caseRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const COL = {
      stock: css.getPropertyValue('--paper-stock').trim() || '#ece3d2',
      ink: css.getPropertyValue('--ink').trim() || '#241f18',
      ghost: css.getPropertyValue('--ink-ghost').trim() || '#8a8279',
    };

    const engine = Engine.create();
    engine.gravity.y = 0; // top-down tray — slugs lie flat, nothing falls
    const world = engine.world;
    const runner = Runner.create();

    let W = 0;
    let H = 0;
    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    let walls = [];
    let slugs = []; // { body, label, w }
    let ready = false;
    let inView = false;
    let running = false;
    let raf = null;
    let audioCtx;

    const measure = ctx; // reuse the live context for text metrics

    const sizeCanvas = () => {
      const r = caseEl.getBoundingClientRect();
      W = r.width;
      H = r.height;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const compBoxes = () => {
      const caseR = caseEl.getBoundingClientRect();
      return compRefs.current.filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          x: r.left - caseR.left,
          y: r.top - caseR.top + LABEL_H,
          w: r.width,
          h: r.height - LABEL_H,
        };
      });
    };

    const buildWalls = (boxes) => {
      if (walls.length) Composite.remove(world, walls);
      walls = [];
      const T = 120; // thick walls so hard flicks never tunnel out
      const opt = { isStatic: true, restitution: 0.3 };
      boxes.forEach((b) => {
        walls.push(Bodies.rectangle(b.x + b.w / 2, b.y + b.h + T / 2, b.w, T, opt)); // floor
        walls.push(Bodies.rectangle(b.x + b.w / 2, b.y - T / 2, b.w, T, opt)); // ceiling under label
        walls.push(Bodies.rectangle(b.x - T / 2, b.y + b.h / 2, T, b.h + T * 2, opt)); // left
        walls.push(Bodies.rectangle(b.x + b.w + T / 2, b.y + b.h / 2, T, b.h + T * 2, opt)); // right
      });
      World.add(world, walls);
    };

    // Lay each compartment's slugs in tidy, width-packed rows. The block is
    // vertically centred when it fits; when a dense category (ML has 14) would
    // overflow, the row stride compresses so every slug still lands inside the
    // box — tidy and fully readable at rest, never an overlapping jumble.
    const spawnSlugs = (boxes) => {
      measure.font = SLUG_FONT;
      SKILL_NODES.forEach((cat, i) => {
        const b = boxes[i];
        if (!b) return;

        const items = cat.items.map((label) => ({
          label,
          w: Math.ceil(measure.measureText(label).width) + PAD_X * 2,
        }));

        // pack into rows by available width
        const usableW = Math.max(40, b.w - EDGE * 2);
        const rows = [[]];
        let rowW = 0;
        items.forEach((it) => {
          const cur = rows[rows.length - 1];
          const needed = cur.length ? rowW + GAP_X + it.w : it.w;
          if (cur.length && needed > usableW) {
            rows.push([it]);
            rowW = it.w;
          } else {
            cur.push(it);
            rowW = needed;
          }
        });

        // vertical placement — centre the block, or compress stride to fit
        const nRows = rows.length;
        const blockH = nRows * SLUG_H + (nRows - 1) * GAP_Y;
        let stride = SLUG_H + GAP_Y;
        let y0;
        if (blockH <= b.h) {
          y0 = b.y + (b.h - blockH) / 2 + SLUG_H / 2;
        } else {
          stride = (b.h - SLUG_H) / Math.max(1, nRows - 1);
          y0 = b.y + SLUG_H / 2;
        }

        rows.forEach((row, r) => {
          const rW = row.reduce((s, it) => s + it.w, 0) + GAP_X * (row.length - 1);
          let cx = b.x + Math.max(EDGE, (b.w - rW) / 2);
          const cy = y0 + r * stride;
          row.forEach((it) => {
            const body = Bodies.rectangle(cx + it.w / 2, cy, it.w, SLUG_H, {
              restitution: 0.2,
              friction: 0.3,
              frictionAir: 0.08, // air-drag so a flicked slug glides, then rests
              chamfer: { radius: 6 },
            });
            slugs.push({ body, label: it.label, w: it.w });
            World.add(world, body);
            cx += it.w + GAP_X;
          });
        });
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.font = SLUG_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const s of slugs) {
        const { body, w } = s;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.beginPath();
        ctx.roundRect(-w / 2, -SLUG_H / 2, w, SLUG_H, 6);
        ctx.fillStyle = COL.stock;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = COL.ghost;
        ctx.stroke();
        ctx.fillStyle = COL.ink;
        ctx.fillText(s.label, 0, 1);
        ctx.restore();
      }
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const maybeRun = () => {
      if (ready && inView && !running) {
        running = true;
        Runner.run(runner, engine);
        loop();
      } else if (!inView && running) {
        running = false;
        Runner.stop(runner);
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      }
    };

    // mouse grab / flick
    const mouse = Mouse.create(canvas);
    mouse.pixelRatio = 1; // bodies live in CSS px; ctx handles DPR for drawing
    const mc = MouseConstraint.create(engine, {
      mouse,
      // stiff + damped so the grabbed slug tracks the cursor directly (no
      // rubber-band lag — that was what felt "phoney").
      constraint: { stiffness: 0.65, damping: 0.12, render: { visible: false } },
    });
    World.add(world, mc);

    const playClack = (vel) => {
      try {
        audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150 + Math.random() * 70, t);
        osc.frequency.exponentialRampToValueAtTime(68, t + 0.06);
        gain.gain.setValueAtTime(Math.min(0.12, 0.03 + vel * 0.004), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } catch { /* audio optional */ }
    };

    Events.on(mc, 'enddrag', ({ body }) => {
      if (!body) return;
      const v = Math.hypot(body.velocity.x, body.velocity.y);
      if (v < THROW_V) return;
      const r = caseEl.getBoundingClientRect();
      fireImpact(Math.random() < 0.22 ? 'KLAK' : 'CLACK', r.left + body.position.x, r.top + body.position.y, Math.random() < 0.3 ? 'red' : 'ink');
      playClack(v);
    });

    const init = () => {
      if (ready) return;
      sizeCanvas();
      const boxes = compBoxes();
      buildWalls(boxes);
      spawnSlugs(boxes);
      caseEl.classList.add('is-live');
      ready = true;
      maybeRun();
    };

    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        maybeRun();
      },
      { threshold: 0.04 }
    );
    io.observe(rootRef.current);

    let resizeTO;
    const onResize = () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => {
        if (!ready) return;
        sizeCanvas();
        buildWalls(compBoxes());
        if (running) draw();
      }, 180);
    };
    window.addEventListener('resize', onResize);

    document.fonts.ready.then(() => requestAnimationFrame(init));

    return () => {
      io.disconnect();
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTO);
      if (raf) cancelAnimationFrame(raf);
      Runner.stop(runner);
      World.clear(world, false);
      Engine.clear(engine);
      audioCtx?.close?.();
    };
  }, []);

  return (
    <section ref={rootRef} className="skills" aria-label="The back shop — skills">
      <div className="press-container">
        <header className="skills-head">
          <span className="kicker">The Back Shop</span>
          <KineticHeadline as="h2" font="impact" className="skills-headline">
            Pick a slug. Give it a flick.
          </KineticHeadline>
          <p className="skills-instruct">Grab a slug, throw it. (Sound on.)</p>
        </header>

        <div ref={caseRef} className="type-case">
          {SKILL_NODES.map((cat, i) => (
            <div
              key={cat.id}
              ref={(el) => (compRefs.current[i] = el)}
              className="compartment"
              style={{ gridArea: cat.id }}
            >
              <span className="compartment-label">{cat.label}</span>
              <div className="compartment-slugs">
                {cat.items.map((item) => (
                  <span key={item} className="slug-static">{item}</span>
                ))}
              </div>
            </div>
          ))}
          <canvas ref={canvasRef} className="type-case-canvas" />
        </div>
      </div>
    </section>
  );
}
