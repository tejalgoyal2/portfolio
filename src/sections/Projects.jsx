import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { PROJECTS, LEADS } from '../data/projects';
import { CONNECTIONS, METRICS } from '../data/connections';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';
import Bug from '../press/Bug';
import Story from '../press/Story';

/**
 * Projects — a front page. The four lead projects are stories (src/press/Story.jsx):
 * the lead across the top, its loop beside it, and three more in columns
 * under it, each with a headline, a short deck, a screen recording or a
 * poster, and the full file folded away. The rest run past on curved
 * rows, like a wraparound display: real CSS 3D, each card turned to face you
 * as it comes round from the side, the rows running in alternating directions
 * slowly enough to read. Hover a row and it eases to a stop; leave and it
 * pulls away, a touch quicker, then settles back to its cruise. Now and then a
 * card is ringed in red, just because. Nothing expands on hover, so siblings
 * never reflow. Reduced motion: the rest are a plain, still index.
 *
 * Hover is tactile: each card tilts in real CSS 3D toward the cursor and a warm
 * desk-lamp highlight tracks the pointer (custom props set on a rAF-throttled
 * pointermove). Relatedness is shown without a drawn line — hovering a file
 * outlines its related cases in red. Reduced motion drops the tilt and lamp;
 * the cards read as a static index.
 */
const STAMP_TONE = { LIVE: 'red', REPO: 'ink', PROTOTYPE: 'ink' };
const LINK_LABEL = { live: 'Live site', github: 'Source', youtube: 'Demo' };
const TILT_MAX = 7; // degrees of rotate at the card's edge

// A few files are filed under short phrases ("deny-first") rather than numerals
// — detect the non-numeric ones so CSS sizes them as descriptors, not giants.
const isNumericMetric = (v) => /^[\d.,]+[%+]?$/.test(String(v).trim());

function CaseFile({ project, index, variant, tilt, onEnter, onLeave, linked, arrive = true, ...rest }) {
  const { name, status, desc, long, note, tech, links } = project;
  const metrics = METRICS[name] || [];
  const linkEntries = Object.entries(links || {});
  const feature = variant === 'feature';

  const elRef = useRef(null);
  const frame = useRef(0);
  const data = useRef(null);

  const onPointerMove = (e) => {
    if (!tilt) return;
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    data.current = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const d = data.current;
      if (!d || !elRef.current) return;
      const px = d.x / d.w - 0.5;
      const py = d.y / d.h - 0.5;
      const s = elRef.current.style;
      s.setProperty('--ry', `${(px * TILT_MAX).toFixed(2)}deg`);
      s.setProperty('--rx', `${(-py * TILT_MAX).toFixed(2)}deg`);
      s.setProperty('--mx', `${((d.x / d.w) * 100).toFixed(1)}%`);
      s.setProperty('--my', `${((d.y / d.h) * 100).toFixed(1)}%`);
    });
  };

  const handleEnter = () => {
    if (tilt) elRef.current?.classList.add('is-tilt');
    onEnter(name);
  };
  const handleLeave = () => {
    const el = elRef.current;
    if (el) {
      el.classList.remove('is-tilt');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    onLeave();
  };

  return (
    <article
      ref={elRef}
      className={`case-file case-file--${variant}${linked ? ' is-linked' : ''}`}
      // features are laid down from below; the index is dealt in from alternate sides
      data-arrive={arrive ? (feature ? 'rise' : index % 2 ? 'deal-l' : 'deal-r') : undefined}
      data-depart={arrive ? 'file' : undefined}
      data-name={name}
      onPointerEnter={handleEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      <span className="cf-glow" aria-hidden="true" />

      <div className="cf-top">
        <span className="cf-no">{String(index).padStart(2, '0')}</span>
        <h3 className="cf-name">{name}</h3>
        <Stamp
          label={status}
          tone={STAMP_TONE[status] || 'ink'}
          rotate={-5}
          pressIn
          interactive={status === 'LIVE' || status === 'REPO'}
        />
      </div>

      <p className="cf-deck" data-ink>{desc}</p>

      {feature && note && <p className="cf-pen">{note}</p>}

      {feature && (
        <>
          {metrics.length > 0 && (
            <div className="cf-metrics">
              {metrics.map((m) => (
                <div className="cf-metric" key={m.label}>
                  <span
                    className={`cf-metric-n${isNumericMetric(m.n) ? '' : ' cf-metric-n--phrase'}`}
                  >
                    {m.n}
                  </span>
                  <span className="cf-metric-l">{m.label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="cf-notes" data-ink>{long}</p>
        </>
      )}

      <div className="cf-foot">
        <div className="cf-filed">
          <span className="cf-filed-label">Built with</span>
          {tech.map((t) => (
            <span className="cf-tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        {linkEntries.length > 0 && (
          <div className="cf-links">
            {linkEntries.map(([kind, href]) => (
              <a
                key={kind}
                className="cf-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {LINK_LABEL[kind] || kind} <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

const ROWS = 2;
const GAP = 64; // px between cards, measured along the curve
const CRUISE = [27, 32]; // px per second, slow enough to read

// the lead stories, in their order, and the rest for the rows
const STORIES = LEADS.map((n) => PROJECTS.find((p) => p.name === n)).filter(Boolean);
const REST = PROJECTS.filter((p) => !LEADS.includes(p.name));

/**
 * How fast a row runs, as a function of time since it was last held or let
 * go — smooth everywhere, so nothing ever lurches:
 * - held: it eases to a stop (a critically damped fall from whatever speed it had);
 * - let go: it pulls away quickly, swells a little past its cruise (a bell
 *   bump that rises fast and fades slowly), and settles to a steady crawl.
 */
function speedAt(held, t, from, cruise) {
  const settle = (tau) => Math.exp(-t / tau) * (1 + t / tau); // 1 → 0, flat at both ends
  if (held) return from * settle(0.19);
  const rise = 1 - settle(0.32);
  const bump = 0.85 * (t / 0.55) * Math.exp(1 - t / 0.55) * rise;
  return from * settle(0.32) + cruise * (rise + bump);
}

/**
 * The wraparound display. Each row is a strip of cards on the inside of a
 * cylinder, and you're standing at its centre: every card is the same
 * distance from you, turned to face you, evenly spaced round the curve — so
 * the ones coming in from the sides are foreshortened, never crowded or
 * overlapping. Real CSS 3D (a perspective as deep as the cylinder's radius).
 * Cards fade in and out at the edges of the view.
 */
function CurvedRows({ projects, first, tilt, onEnter, onLeave, linkedSet }) {
  const ref = useRef(null);
  const rows = Array.from({ length: ROWS }, (_, r) => projects.map((p, i) => ({ p, i })).filter(({ i }) => i % ROWS === r));
  // enough copies round each row that the visible arc is always full, but no more
  const copies = rows.map((items) => Math.max(2, Math.ceil(5 / Math.max(1, items.length))));

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const state = [...root.querySelectorAll('.cf-row')].map((row, r) => ({
      row,
      track: row.querySelector('.cf-track'),
      slots: [...row.querySelectorAll('.cf-slot')],
      dir: r % 2 ? -1 : 1,
      cruise: CRUISE[r % CRUISE.length],
      off: r * 170,
      v: CRUISE[r % CRUISE.length],
      held: false,
      since: 10,
      from: CRUISE[r % CRUISE.length],
      w: 340,
      R: 1200,
      W: 1200,
    }));
    const measure = () => {
      for (const s of state) {
        const card = s.slots[0]?.firstElementChild;
        if (!card) continue;
        s.w = card.offsetWidth;
        s.W = s.row.clientWidth;
        s.R = Math.max(1300, s.W * 1.5); // deep enough that the sides curve in without stretching
        s.row.style.perspective = `${s.R.toFixed(0)}px`;
        s.row.style.height = `${Math.max(...s.slots.map((el) => el.firstElementChild.offsetHeight)) + 26}px`;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);

    const holds = state.map((s) => {
      const set = (held) => () => {
        if (s.held === held) return;
        s.from = s.v;
        s.since = 0;
        s.held = held;
      };
      const on = set(true);
      const off = set(false);
      s.row.addEventListener('pointerenter', on);
      s.row.addEventListener('pointerleave', off);
      s.row.addEventListener('focusin', on);
      s.row.addEventListener('focusout', off);
      return () => {
        s.row.removeEventListener('pointerenter', on);
        s.row.removeEventListener('pointerleave', off);
        s.row.removeEventListener('focusin', on);
        s.row.removeEventListener('focusout', off);
      };
    });

    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '120px 0px' });
    io.observe(root);

    const place = (s, dt) => {
      s.since += dt;
      s.v = speedAt(s.held, s.since, s.from, s.cruise);
      s.off += s.v * s.dir * dt;
      const pitch = s.w + GAP;
      const total = s.slots.length * pitch;
      const view = s.W / 2 + s.w; // how far round the curve is still on screen
      s.slots.forEach((el, k) => {
        // arc length from the middle of the view
        const a = ((((k * pitch + s.off) % total) + total) % total) - total / 2;
        const seen = Math.abs(a) < view;
        if (!seen) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          return;
        }
        if (el.style.visibility) el.style.visibility = '';
        const th = a / s.R;
        // stand at the centre: out to the wall, turned to face you
        el.style.transform = `translateZ(${s.R.toFixed(0)}px) rotateY(${th.toFixed(4)}rad) translateZ(${(-s.R).toFixed(0)}px)`;
        const edge = 1 - Math.min(1, Math.max(0, (Math.abs(a) - (view - s.w * 1.1)) / (s.w * 1.1)));
        el.style.opacity = edge.toFixed(3);
      });
    };
    const tick = (t, deltaMs) => {
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, deltaMs / 1000);
      state.forEach((s) => place(s, dt));
    };
    state.forEach((s) => place(s, 0));
    gsap.ticker.add(tick);

    // now and then, a card is ringed in red
    const cards = [...root.querySelectorAll('.cf-slot > .case-file')];
    const flagged = [];
    const flag = setInterval(() => {
      if (!visible) return;
      const c = cards[(Math.random() * cards.length) | 0];
      if (!c || flagged.includes(c)) return;
      c.classList.add('is-flagged');
      flagged.push(c);
      if (flagged.length > 2) flagged.shift().classList.remove('is-flagged');
    }, 2600);

    return () => {
      gsap.ticker.remove(tick);
      clearInterval(flag);
      io.disconnect();
      holds.forEach((f) => f());
      window.removeEventListener('resize', measure);
    };
  }, [projects]);

  return (
    <div ref={ref} className="cf-rows">
      {rows.map((items, r) => (
        <div className="cf-row" key={r} data-arrive={r % 2 ? 'deal-r' : 'deal-l'}>
          <div className="cf-track">
            {Array.from({ length: copies[r] }, (_, copy) =>
              items.map(({ p, i }) => (
                <div className="cf-slot" key={`${copy}-${p.name}`} aria-hidden={copy > 0 || undefined} inert={copy > 0 || undefined}>
                  <CaseFile
                    project={p}
                    index={first + i}
                    variant="index"
                    tilt={tilt}
                    arrive={false}
                    onEnter={onEnter}
                    onLeave={onLeave}
                    linked={linkedSet?.has(p.name) || false}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Projects() {
  const [active, setActive] = useState(null);
  const tilt = !(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const rest = REST;

  const onEnter = (name) => setActive(name);
  const onLeave = () => setActive(null);

  const linkedSet = active ? new Set(CONNECTIONS[active] || []) : null;

  return (
    <section className="projects" id="projects" aria-label="Projects" data-ground="paper" data-section="projects">
      <div className="press-container cf-stage">
        {/* the bug keeps to the paper beside the headline, never over the stories */}
        <div className="cf-headrow">
          <Bug />
          <header className="cf-head" data-depart="lift">
            <span className="kicker">Projects</span>
            <KineticHeadline as="h2" font="impact" className="cf-headline">
              Things I&rsquo;ve built. Some broke.
            </KineticHeadline>
          </header>
        </div>

        <div className="cf-front">
          {STORIES.map((p, i) => (
            <Story key={p.name} project={p} index={i + 1} lead={i === 0} />
          ))}
        </div>

        <p className="cf-also">
          <span>Also in this edition</span>
          <span className="cf-also-hint">hover a file and its related cases light up</span>
        </p>

        {tilt ? (
          <CurvedRows
            projects={rest}
            first={STORIES.length + 1}
            tilt={tilt}
            onEnter={onEnter}
            onLeave={onLeave}
            linkedSet={linkedSet}
          />
        ) : (
          <div className="cf-index">
            {rest.map((p, i) => {
              return (
                <CaseFile
                  key={p.name}
                  project={p}
                  index={STORIES.length + i + 1}
                  variant="index"
                  tilt={tilt}
                  onEnter={onEnter}
                  onLeave={onLeave}
                  linked={linkedSet?.has(p.name) || false}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
