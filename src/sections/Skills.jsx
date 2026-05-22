import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { SKILL_NODES } from '../data/skills';
import { dispatchOnom } from '../comic/OnomatopoeiaBurst';

const {
  Engine, World, Bodies, Body, Mouse, MouseConstraint,
  Events, Composite, Common,
} = Matter;

/**
 * Skills — red panel + Matter.js physics terrarium. Each skill is a pill
 * with the category color; collisions above a velocity threshold spawn
 * an onomatopoeia burst at the contact point.
 *
 * Visual brief: bright red background panel framed by paper border,
 * "SKILLS" massive wordmark, hint of hand-letter ("toss them around!").
 * The physics is contained in a 560px-tall comic panel.
 */

const CATEGORY_COLORS = {
  sec:      '#f6e25c', // pop yellow
  lang:     '#f1ead8', // paper
  frontend: '#5cd9f5', // scanline cyan
  backend:  '#ffb454', // warm orange
  ml:       '#b08cff', // soft lavender accent
  embedded: '#ff90a3', // pink salmon
  tools:    '#9be6b8', // mint
};

const CATEGORY_LABELS = {
  sec: 'Security',
  lang: 'Languages',
  frontend: 'Frontend',
  backend: 'Backend',
  ml: 'ML & Data',
  embedded: 'CV & Embedded',
  tools: 'DevOps & Tools',
};

const PILL_HEIGHT = 36;
const PILL_PAD_X = 18;
const PILL_FONT = '600 13px "JetBrains Mono", monospace';
const COLLISION_VEL_THRESHOLD = 5.5;
const ONOM_WORDS = ['POW!', 'BAM!', 'CRACK!', 'SNAP!', 'WHAM!', 'CLINK!'];

let measureCtx;
function measureText(text) {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  measureCtx.font = PILL_FONT;
  return measureCtx.measureText(text).width;
}

export default function Skills() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Build all pill defs once
  const pillDefs = useRef(
    SKILL_NODES.flatMap((cat) =>
      cat.items.map((skill) => ({
        label: skill,
        categoryId: cat.id,
        color: CATEGORY_COLORS[cat.id] || '#f1ead8',
        width: measureText(skill) + PILL_PAD_X * 2,
      }))
    )
  ).current;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const ctx = canvas.getContext('2d');

    const sizeCanvas = () => {
      const r = container.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w, h } = sizeCanvas();

    const engine = Engine.create({ gravity: { x: 0, y: 1.2 } });
    const wallT = 60;
    const walls = [
      Bodies.rectangle(w / 2, h + wallT / 2, w + 200, wallT, { isStatic: true, friction: 0.5 }),
      Bodies.rectangle(-wallT / 2, h / 2, wallT, h * 2, { isStatic: true, friction: 0.3 }),
      Bodies.rectangle(w + wallT / 2, h / 2, wallT, h * 2, { isStatic: true, friction: 0.3 }),
    ];
    Composite.add(engine.world, walls);

    const mouse = Mouse.create(canvas);
    mouse.pixelRatio = dpr;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } },
    });
    Composite.add(engine.world, mouseConstraint);

    // Drop pills with stagger when section enters viewport
    let dropped = false;
    const dropPills = () => {
      if (dropped) return;
      dropped = true;
      const shuffled = [...pillDefs].sort(() => Math.random() - 0.5);
      shuffled.forEach((def, i) => {
        setTimeout(() => {
          const body = Bodies.rectangle(
            def.width / 2 + Math.random() * (w - def.width),
            -40 - Math.random() * 250,
            def.width,
            PILL_HEIGHT,
            {
              restitution: 0.4,
              friction: 0.45,
              frictionAir: 0.012,
              density: 0.001,
              chamfer: { radius: PILL_HEIGHT / 2 },
              plugin: def,
            }
          );
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
          Composite.add(engine.world, body);
        }, i * 38);
      });
    };

    // Use IntersectionObserver to lazy-drop
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            dropPills();
            io.disconnect();
          }
        });
      },
      { threshold: 0.18 }
    );
    io.observe(container);

    // Collision → onomatopoeia (throttled by impact velocity)
    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB, collision } = pair;
        if (bodyA.isStatic && bodyB.isStatic) continue;
        // Either body's speed
        const speed = Math.max(
          Math.hypot(bodyA.velocity.x, bodyA.velocity.y),
          Math.hypot(bodyB.velocity.x, bodyB.velocity.y)
        );
        if (speed < COLLISION_VEL_THRESHOLD) continue;
        // Compute on-screen coords for the onom burst
        const rect = canvas.getBoundingClientRect();
        const sx = collision.supports?.[0]?.x ?? bodyA.position.x;
        const sy = collision.supports?.[0]?.y ?? bodyA.position.y;
        const px = rect.left + sx;
        const py = rect.top + sy;
        dispatchOnom({
          word: ONOM_WORDS[Math.floor(Math.random() * ONOM_WORDS.length)],
          x: px,
          y: py,
          rotation: (Math.random() - 0.5) * 18,
          fontSize: 32 + Math.min(20, speed * 1.6),
        });
      }
    });

    // Render loop
    let raf;
    let lastTime = performance.now();
    const render = (now) => {
      const dt = Math.min(now - lastTime, 33.33);
      lastTime = now;
      Engine.update(engine, dt);

      ctx.clearRect(0, 0, w, h);

      // Draw bodies
      const bodies = Composite.allBodies(engine.world);
      for (const body of bodies) {
        if (body.isStatic) continue;
        const def = body.plugin;
        if (!def) continue;
        const bw = def.width;
        const bh = PILL_HEIGHT;
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        // Pill body
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, PILL_HEIGHT / 2);
        ctx.fillStyle = def.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1a1726';
        ctx.stroke();

        // Text
        ctx.font = PILL_FONT;
        ctx.fillStyle = '#1a1726';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.label, 0, 1);

        ctx.restore();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    // Resize handler
    const onResize = () => {
      const next = sizeCanvas();
      w = next.w;
      h = next.h;
      Body.setPosition(walls[0], { x: w / 2, y: h + wallT / 2 });
      Body.setPosition(walls[2], { x: w + wallT / 2, y: h / 2 });
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      io.disconnect();
      Events.off(engine);
      Composite.clear(engine.world);
      Engine.clear(engine);
    };
  }, [pillDefs]);

  return (
    <section className="skills" id="skills">
      <div className="skills-header">
        <h2 className="skills-title">SKILLS</h2>
        <p className="skills-sub">
          What I work with.<br />
          Toss them around — they hit each other.
        </p>
      </div>

      <div className="skills-stage">
        <div ref={containerRef} className="skills-canvas-wrap">
          <canvas ref={canvasRef} className="skills-canvas" />
        </div>

        <div className="skills-legend">
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <span
              key={id}
              className="skills-legend-dot"
              style={{ color: CATEGORY_COLORS[id] }}
            >
              {label}
            </span>
          ))}
        </div>

        <p className="skills-hint">grab, drag, throw — the pills react.</p>
      </div>
    </section>
  );
}
