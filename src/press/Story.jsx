import { useEffect, useRef, useState } from 'react';
import Stamp from './Stamp';
import Hand from './Hand';
import { prefs } from '../life/prefs';

/**
 * A lead project as a case file on the desk: a tile that leans toward your
 * cursor in real CSS 3D, with a warm desk-lamp glow following the pointer.
 * The front says what it is and why I made it, with three facts; the back is
 * the full file, on manila. Hover and the tile lifts a little and a corner
 * folds back to show the manila underneath; click anywhere on it (but a link)
 * and it turns over.
 *
 * It doesn't flip like a playing card. It changes skin: the face breaks into
 * small square scales that turn over one by one in a wave, newsprint to
 * manila, and the other face is there under them as they settle. Each project
 * has its own wave (`wave` in src/data/projects.js):
 *   ripple  type — rings out from where you clicked, like a key landing
 *   rows    Dime — row by row, left to right, like a receipt printing
 *   spread  IAM Threat Mapper — out from the click, unevenly, node to node,
 *           the way an attacker moves through a network
 *   scan    Claubi — top to bottom, a line at a time, like a terminal printing
 * The scales exist only while the tile turns, and only move by transform and
 * opacity (a CSS animation each, on the compositor). The face being left is
 * cut away under them through an SVG clip path, a square at a time, exactly
 * where each scale covers it. Reduced motion: the faces simply swap.
 */
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const STAMP_TONE = { LIVE: 'red' };
const TILT = 4; // degrees at the tile's edge
const CELL = 44; // px: the size of one scale, about
const MAX_CELLS = 150;
const LIFE = 540; // ms one scale takes to turn over
const COVER = 0.42; // how far through its turn a scale is when it hides the face beneath

// a small seeded random, so a wave is the same every time
const rand = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// each wave: the order the scales go in (0..1) and the way they turn
const WAVES = {
  rows: { spread: 640, axis: () => 'x', at: (c, r, C, R) => (r + (c / C) * 0.9) / (R + 0.9) },
  ripple: { spread: 560, axis: () => 'y', at: (c, r, C, R, o) => Math.hypot((c + 0.5) / C - o.x, ((r + 0.5) / R - o.y) * (R / C)) },
  spread: {
    spread: 620,
    axis: (i) => (rand(i) > 0.5 ? 'x' : 'y'),
    at: (c, r, C, R, o, i) => Math.hypot((c + 0.5) / C - o.x, ((r + 0.5) / R - o.y) * (R / C)) * 0.72 + rand(i + 7) * 0.28,
  },
  scan: { spread: 600, axis: () => 'x', at: (c, r, C, R) => (r + rand(c) * 0.35) / (R + 0.35) },
};

function plan(el, wave, origin) {
  const { width: w, height: h } = el.getBoundingClientRect();
  let size = CELL;
  while (Math.ceil(w / size) * Math.ceil(h / size) > MAX_CELLS) size += 4;
  const cols = Math.max(1, Math.round(w / size));
  const rows = Math.max(1, Math.round(h / size));
  const W = WAVES[wave] || WAVES.ripple;
  const raw = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) raw.push(W.at(c, r, cols, rows, origin, r * cols + c));
  const lo = Math.min(...raw);
  const hi = Math.max(...raw) - lo || 1;
  const cells = raw.map((v, i) => ({ d: Math.round(((v - lo) / hi) * W.spread), ax: W.axis(i) }));
  return { cols, rows, cells, total: W.spread + LIFE };
}

export default function Story({ project, lead = false, index }) {
  const { name, status, why, eli5, desc, long, note, tech, links, facts, wave } = project;
  const [side, setSide] = useState('front'); // the face that's up (or on its way up)
  const [morph, setMorph] = useState(null); // { from, cols, rows, cells, total } while it turns
  const ref = useRef(null);
  const frame = useRef(0);
  const clipRef = useRef(null);
  const down = useRef(null);
  const clipId = `tile-clip-${index}`;
  const no = String(index).padStart(2, '0');

  const turn = (origin) => {
    if (morph) return;
    const to = side === 'front' ? 'back' : 'front';
    const focusOther = () =>
      requestAnimationFrame(() => ref.current?.querySelector(`.tile-${to} .tile-flip`)?.focus({ preventScroll: true }));
    if (prefs.reduced || !ref.current) {
      setSide(to);
      focusOther();
      return;
    }
    setMorph({ from: side, ...plan(ref.current, wave, origin) });
    setSide(to);
    focusOther();
  };

  // the face being left is cut away a square at a time, as each scale covers it
  useEffect(() => {
    if (!morph) return;
    const rects = [...(clipRef.current?.querySelectorAll('rect') || [])];
    const start = performance.now();
    let left = rects.length;
    let raf = 0;
    const step = (now) => {
      const t = now - start;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.dataset.gone) continue;
        if (t >= morph.cells[i].d + LIFE * COVER) {
          r.setAttribute('width', '0');
          r.dataset.gone = '1';
          left--;
        }
      }
      if (left > 0) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const done = setTimeout(() => setMorph(null), morph.total + 40);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [morph]);

  // anywhere on the tile turns it, except the links (and a press that turned into a drag)
  const onPointerDown = (e) => (down.current = { x: e.clientX, y: e.clientY });
  const onClick = (e) => {
    if (e.target.closest('a')) return;
    // a click from the keyboard has no place: start from the button
    const keyed = e.detail === 0;
    const d = down.current;
    down.current = null;
    if (!keyed && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
    const r = ref.current.getBoundingClientRect();
    const at = keyed ? e.target.getBoundingClientRect() : null;
    const x = at ? at.left + at.width / 2 : e.clientX;
    const y = at ? at.top + at.height / 2 : e.clientY;
    turn({ x: (x - r.left) / r.width, y: (y - r.top) / r.height });
  };

  const lean = (e) => {
    if (e.pointerType === 'touch' || frame.current) return;
    const el = ref.current;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width;
      const py = (clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((px - 0.5) * TILT).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * TILT).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
  };
  const rest = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };

  const faceClass = (f) => {
    let c = `tile-face tile-${f}`;
    if (morph && morph.from === f) c += ' is-leaving';
    else if (side === f) c += ' is-up';
    return c;
  };
  const linkRow = Object.entries(links || {}).map(([kind, href]) => (
    <a key={kind} className="story-link" href={href} target="_blank" rel="noopener noreferrer" data-pen="">
      {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
    </a>
  ));

  return (
    <article
      ref={ref}
      className={`tile${lead ? ' tile--lead' : ''}${side === 'back' ? ' is-back' : ''}${morph ? ' is-morphing' : ''}`}
      data-arrive="rise"
      data-name={name}
      data-pen="rotate-cw"
      onPointerMove={lean}
      onPointerLeave={rest}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className="tile-lean">
        <div className="tile-turn">
          <div className={faceClass('front')} inert={side !== 'front'} style={morph?.from === 'front' ? { clipPath: `url(#${clipId})` } : undefined}>
            <span className="tile-glow" aria-hidden="true" />
            <div className="tile-main">
              <p className="tile-kicker">
                <span className="tile-no">{no}</span>
                <Stamp label={status} tone={STAMP_TONE[status] || 'ink'} rotate={-5} interactive={false} />
                {note && <Hand className="story-pen">{note}</Hand>}
              </p>
              <h3 className="tile-name">{name}</h3>
              <p className="tile-why">{why || eli5}</p>
            </div>
            {facts?.length > 0 && (
              <ul className="tile-facts">
                {facts.map(([fig, label]) => (
                  <li key={label}>
                    <span className="tile-fact-fig">{fig}</span>
                    <span className="tile-fact-label">{label}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="tile-foot">
              {linkRow}
              <button type="button" className="tile-flip" aria-label={`Turn over: the full file on ${name}`}>
                Turn over <span aria-hidden="true">↻</span>
              </button>
            </div>
          </div>

          <div className={faceClass('back')} inert={side !== 'back'} style={morph?.from === 'back' ? { clipPath: `url(#${clipId})` } : undefined}>
            <span className="tile-glow" aria-hidden="true" />
            <p className="tile-kicker">
              <span className="tile-no">{no}</span>
              <span className="tile-file">The full file · {name}</span>
            </p>
            <p className="tile-desc">{desc}</p>
            <p className="tile-long">{long}</p>
            <p className="story-tech">
              <span className="story-tech-label">Built with</span>
              {tech.map((t) => (
                <span className="cf-tag" key={t}>
                  {t}
                </span>
              ))}
            </p>
            <div className="tile-foot">
              {linkRow}
              <button type="button" className="tile-flip" aria-label={`Turn back to the front of ${name}`}>
                Turn back <span aria-hidden="true">↺</span>
              </button>
            </div>
          </div>

          {morph && (
            <>
              {/* the scales, in a wave */}
              <div
                className={`tile-morph tile-morph--to-${side}`}
                aria-hidden="true"
                style={{ gridTemplateColumns: `repeat(${morph.cols}, 1fr)`, gridTemplateRows: `repeat(${morph.rows}, 1fr)` }}
              >
                {morph.cells.map((c, i) => (
                  <i key={i} className={`tile-scale tile-scale--${c.ax}`} style={{ animationDelay: `${c.d}ms` }} />
                ))}
              </div>
              {/* what's still left of the face being turned away */}
              <svg className="tile-clip" aria-hidden="true" width="0" height="0">
                <clipPath id={clipId} clipPathUnits="objectBoundingBox" ref={clipRef}>
                  {morph.cells.map((c, i) => {
                    const x = (i % morph.cols) / morph.cols;
                    const y = Math.floor(i / morph.cols) / morph.rows;
                    // a hair over a square each, so no seam shows between them
                    return <rect key={i} x={x} y={y} width={1 / morph.cols + 0.002} height={1 / morph.rows + 0.002} />;
                  })}
                </clipPath>
              </svg>
            </>
          )}
        </div>
        {/* the corner that folds back on hover to show the other side's stock */}
        <span className="tile-ear" aria-hidden="true" />
      </div>
    </article>
  );
}
