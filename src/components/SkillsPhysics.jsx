import { useRef, useEffect, useState, useCallback } from 'react';
import { SKILL_NODES } from '../data/skills';
import { ScrollTrigger } from '../hooks/useGSAP';
import Matter from 'matter-js';

const { Engine, World, Bodies, Body, Mouse, MouseConstraint, Events, Composite, Runner } = Matter;

// ── Category styling ──
const CATEGORY_META = {
  sec:      { color: '#8b8eff', label: 'Security' },
  lang:     { color: '#6ee7b7', label: 'Languages' },
  frontend: { color: '#fbbf24', label: 'Frontend' },
  backend:  { color: '#f97316', label: 'Backend & APIs' },
  ml:       { color: '#67e8f9', label: 'ML & Data' },
  embedded: { color: '#f87171', label: 'CV & Embedded' },
  tools:    { color: '#a78bfa', label: 'DevOps & Tools' },
};

// ── Pill sizing ──
const PILL_HEIGHT = 34;
const PILL_PAD_X = 22;
const PILL_FONT = '12px "JetBrains Mono", "Fira Code", monospace';
const PILL_RADIUS = 17; // full rounded

// Measure text width on a scratch canvas (cached)
let _measureCtx = null;
function measureText(text) {
  if (!_measureCtx) {
    const c = document.createElement('canvas');
    _measureCtx = c.getContext('2d');
  }
  _measureCtx.font = PILL_FONT;
  return _measureCtx.measureText(text).width;
}

// ── Hex to rgba helper ──
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function SkillsPhysics() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodiesRef = useRef([]);
  const wallsRef = useRef([]);
  const mouseConstraintRef = useRef(null);
  const rafRef = useRef(null);
  const droppedRef = useRef(false);
  const hoveredBodyRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Build all pill definitions once
  const pillDefs = useRef(
    SKILL_NODES.flatMap(cat =>
      cat.items.map(skill => ({
        label: skill,
        categoryId: cat.id,
        width: measureText(skill) + PILL_PAD_X * 2,
      }))
    )
  ).current;

  // ── Setup engine + render loop ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');

    // ── Sizing ──
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = 520;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setContainerSize({ w, h });
      return { w, h };
    };

    let { w, h } = resize();

    // ── Engine ──
    const engine = Engine.create({
      gravity: { x: 0, y: 1.2 },
    });
    engineRef.current = engine;

    // ── Walls ──
    const wallThickness = 60;
    const walls = [
      // Floor
      Bodies.rectangle(w / 2, h + wallThickness / 2, w + 200, wallThickness, {
        isStatic: true, render: { visible: false },
        friction: 0.6,
      }),
      // Left wall
      Bodies.rectangle(-wallThickness / 2, h / 2, wallThickness, h * 2, {
        isStatic: true, render: { visible: false },
        friction: 0.3,
      }),
      // Right wall
      Bodies.rectangle(w + wallThickness / 2, h / 2, wallThickness, h * 2, {
        isStatic: true, render: { visible: false },
        friction: 0.3,
      }),
    ];
    wallsRef.current = walls;
    Composite.add(engine.world, walls);

    // ── Mouse interaction ──
    const mouse = Mouse.create(canvas);
    // Fix for high-DPI: Matter.js Mouse reads offsetX/Y from events,
    // but we need them unscaled
    mouse.pixelRatio = dpr;

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        damping: 0.1,
        render: { visible: false },
      },
    });
    mouseConstraintRef.current = mouseConstraint;
    Composite.add(engine.world, mouseConstraint);

    // Track hovered body for glow effect
    Events.on(mouseConstraint, 'mousemove', (e) => {
      const bodies = Composite.allBodies(engine.world);
      const mousePos = mouse.position;
      let found = null;
      for (const body of bodies) {
        if (body.isStatic) continue;
        if (Matter.Bounds.contains(body.bounds, mousePos)) {
          // More precise check
          if (Matter.Vertices.contains(body.vertices, mousePos)) {
            found = body;
            break;
          }
        }
      }
      hoveredBodyRef.current = found;
      canvas.style.cursor = found ? 'grab' : 'default';
    });

    Events.on(mouseConstraint, 'startdrag', () => {
      canvas.style.cursor = 'grabbing';
    });

    Events.on(mouseConstraint, 'enddrag', () => {
      canvas.style.cursor = hoveredBodyRef.current ? 'grab' : 'default';
    });

    // ── Render loop ──
    let lastTime = performance.now();

    const render = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      // Cap delta to prevent spiral of death
      Engine.update(engine, Math.min(delta, 33.33));

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Draw bodies
      const allBodies = Composite.allBodies(engine.world);
      const hovered = hoveredBodyRef.current;
      const dragging = mouseConstraint.body;

      for (const body of allBodies) {
        if (body.isStatic) continue;

        const { label, categoryId } = body.plugin;
        const meta = CATEGORY_META[categoryId];
        if (!meta) continue;

        const isHovered = body === hovered;
        const isDragging = body === dragging;

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        const bw = body.plugin.pillWidth;
        const bh = PILL_HEIGHT;
        const halfW = bw / 2;
        const halfH = bh / 2;

        // Glow on hover/drag
        if (isHovered || isDragging) {
          ctx.shadowColor = hexToRgba(meta.color, 0.5);
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Pill background
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfH, bw, bh, PILL_RADIUS);
        ctx.fillStyle = isDragging
          ? hexToRgba(meta.color, 0.15)
          : isHovered
            ? hexToRgba(meta.color, 0.08)
            : hexToRgba(meta.color, 0.04);
        ctx.fill();

        // Pill border
        ctx.strokeStyle = isDragging
          ? hexToRgba(meta.color, 0.7)
          : isHovered
            ? hexToRgba(meta.color, 0.5)
            : hexToRgba(meta.color, 0.2);
        ctx.lineWidth = isDragging ? 1.5 : 1;
        ctx.stroke();

        // Reset shadow before text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Text
        ctx.font = PILL_FONT;
        ctx.fillStyle = isDragging
          ? meta.color
          : isHovered
            ? hexToRgba(meta.color, 0.9)
            : hexToRgba(meta.color, 0.65);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0.5);

        ctx.restore();
      }

      // Draw subtle container edges (glass terrarium look)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(139,142,255,0.02)');
      grad.addColorStop(0.5, 'transparent');
      grad.addColorStop(1, 'rgba(139,142,255,0.03)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Floor glow line
      ctx.beginPath();
      ctx.moveTo(0, h - 1);
      ctx.lineTo(w, h - 1);
      ctx.strokeStyle = 'rgba(139,142,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Side edge lines
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h);
      ctx.strokeStyle = 'rgba(139,142,255,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w, h);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    // ── Drop pills on scroll trigger ──
    const dropPills = () => {
      if (droppedRef.current) return;
      droppedRef.current = true;

      // Shuffle pills for visual variety
      const shuffled = [...pillDefs].sort(() => Math.random() - 0.5);

      shuffled.forEach((def, i) => {
        setTimeout(() => {
          const body = Bodies.rectangle(
            // Random X within container bounds (with margin)
            def.width / 2 + Math.random() * (w - def.width),
            // Start above viewport, staggered heights
            -40 - Math.random() * 200,
            def.width,
            PILL_HEIGHT,
            {
              restitution: 0.35,
              friction: 0.5,
              frictionAir: 0.01,
              density: 0.001,
              chamfer: { radius: PILL_RADIUS },
              plugin: {
                label: def.label,
                categoryId: def.categoryId,
                pillWidth: def.width,
              },
            }
          );
          // Give slight random spin for natural look
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
          Composite.add(engine.world, body);
          bodiesRef.current.push(body);
        }, i * 35); // 35ms stagger between drops
      });
    };

    // ScrollTrigger gate: only drop when section enters viewport
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top 80%',
      once: true,
      onEnter: dropPills,
    });

    // ── Resize handler ──
    const handleResize = () => {
      const prev = { w, h };
      const next = resize();
      w = next.w;
      h = next.h;

      // Reposition walls
      Body.setPosition(walls[0], { x: w / 2, y: h + wallThickness / 2 });
      Body.setVertices(walls[0], Bodies.rectangle(w / 2, h + wallThickness / 2, w + 200, wallThickness).vertices);

      Body.setPosition(walls[2], { x: w + wallThickness / 2, y: h / 2 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      trigger.kill();
      window.removeEventListener('resize', handleResize);
      Engine.clear(engine);
      // Clean up mouse events
      if (mouseConstraint) {
        Events.off(mouseConstraint);
        Composite.remove(engine.world, mouseConstraint);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: '520px' }}>
      <canvas
        ref={canvasRef}
        className="block w-full rounded-xl"
        style={{
          height: '520px',
          background: 'rgba(139,142,255,0.01)',
          border: '1px solid rgba(139,142,255,0.06)',
        }}
      />

      {/* Category legend */}
      <div className="flex flex-wrap gap-4 mt-5 justify-center">
        {Object.entries(CATEGORY_META).map(([id, meta]) => (
          <div key={id} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: meta.color,
                boxShadow: `0 0 6px ${hexToRgba(meta.color, 0.4)}`,
              }}
            />
            <span
              className="text-[10px] font-mono tracking-[1px] uppercase"
              style={{ color: hexToRgba(meta.color, 0.6) }}
            >
              {meta.label}
            </span>
          </div>
        ))}
      </div>

      {/* Interaction hint */}
      <div className="text-center mt-3">
        <span
          className="text-[10px] font-mono"
          style={{ color: 'var(--color-text-ghost)' }}
        >
          grab &amp; throw the pills
        </span>
      </div>
    </div>
  );
}
