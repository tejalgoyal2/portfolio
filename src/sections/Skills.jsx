import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { SKILL_NODES } from '../data/skills';
import KineticHeadline from '../press/KineticHeadline';
import { fireImpact } from '../press/PressImpacts';

const { Engine, Runner, World, Bodies, Mouse, MouseConstraint, Events, Composite } = Matter;

/**
 * The Back Shop — a printer's California job case. Each skill is a movable-type
 * slug that lives in its category compartment; grab one and flick it and it
 * clacks. Physics (matter.js) runs only while the case is on screen; the slugs
 * are drawn with a custom Canvas2D pass so the type stays crisp and legible —
 * legibility first, joy second. Reduced-motion gets a tidy static type tray.
 */
const LABEL_H = 42; // reserved strip so piled slugs never bury the label
const SLUG_FONT = '600 18px "Newsreader", Georgia, serif';
const PAD_X = 14;
const SLUG_H = 38;
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
    engine.gravity.y = 1;
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

    const spawnSlugs = (boxes) => {
      measure.font = SLUG_FONT;
      SKILL_NODES.forEach((cat, i) => {
        const b = boxes[i];
        if (!b) return;
        cat.items.forEach((item) => {
          const w = Math.ceil(measure.measureText(item).width) + PAD_X * 2;
          const half = w / 2;
          const minX = b.x + half + 3;
          const maxX = Math.max(minX, b.x + b.w - half - 3);
          const px = minX + Math.random() * (maxX - minX);
          const py = b.y + 6 + Math.random() * Math.max(10, b.h * 0.5);
          const body = Bodies.rectangle(px, py, w, SLUG_H, {
            restitution: 0.3,
            friction: 0.4,
            frictionAir: 0.015,
            chamfer: { radius: 6 },
            angle: (Math.random() - 0.5) * 0.3,
          });
          slugs.push({ body, label: item, w });
          World.add(world, body);
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
      constraint: { stiffness: 0.18, render: { visible: false } },
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
