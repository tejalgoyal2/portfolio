import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { PROJECTS } from '../data/projects';
import { CONNECTIONS, METRICS } from '../data/connections';
import KineticHeadline from '../press/KineticHeadline';
import Stamp from '../press/Stamp';

/**
 * Work — a board of project cards. Tier-1 files render their full dossier
 * always (deck + metrics + notes + links). The rest run past on three curved
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

const ROWS = 3;
const COPIES = 4; // each row's cards repeat so the loop always overfills the screen
const CRUISE = [24, 31, 27]; // px per second, slow enough to read

/**
 * The wraparound display. Each row is a strip of cards on the inside of a
 * cylinder: a card's place along the strip sets its angle round it, so cards
 * coming in from the sides are turned to face you and sit nearer, and the one
 * in the middle is flat on. Its speed is a soft second-order spring: easing to
 * a stop under the pointer, pulling away with a little extra when it leaves.
 */
function CurvedRows({ projects, first, tilt, onEnter, onLeave, linkedSet }) {
  const ref = useRef(null);
  const rows = Array.from({ length: ROWS }, (_, r) => projects.map((p, i) => ({ p, i })).filter(({ i }) => i % ROWS === r));

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const state = [...root.querySelectorAll('.cf-row')].map((row, r) => ({
      row,
      slots: [...row.querySelectorAll('.cf-slot')],
      dir: r % 2 ? -1 : 1,
      cruise: CRUISE[r % CRUISE.length],
      off: r * 140,
      v: CRUISE[r % CRUISE.length],
      a: 0,
      held: false,
      pitch: 380,
      w: 360,
      W: 1200,
    }));
    const measure = () => {
      for (const s of state) {
        const card = s.slots[0]?.firstElementChild;
        if (!card) continue;
        s.w = card.offsetWidth;
        s.pitch = s.w + 22;
        s.W = s.row.clientWidth;
        s.row.style.height = `${Math.max(...s.slots.map((el) => el.firstElementChild.offsetHeight)) + 24}px`;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);

    const holds = state.map((s) => {
      const on = () => (s.held = true);
      const off = () => (s.held = false);
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
      // speed: a spring on the speed itself, so it eases off and pulls away smoothly
      // held: firm and well damped, so it comes to rest; let go: looser, so it
      // pulls away past its cruise and settles back down to it
      const target = s.held ? 0 : s.cruise;
      const [k, c] = s.held ? [10, 6.4] : [5, 2.4];
      s.a += (k * (target - s.v) - c * s.a) * dt;
      s.v = Math.max(0, s.v + s.a * dt);
      if (s.held && s.v < 0.4) s.v = s.a = 0;
      s.off += s.v * s.dir * dt;
      const total = s.slots.length * s.pitch;
      const R = s.W * 0.78;
      s.slots.forEach((el, k) => {
        const x = (((k * s.pitch + s.off) % total) + total) % total - s.pitch;
        const c = x + s.w / 2 - s.W / 2;
        const th = c / R;
        const show = Math.abs(c) < s.W / 2 + s.w;
        if (!show) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          return;
        }
        if (el.style.visibility) el.style.visibility = '';
        const X = Math.sin(th) * R;
        const Z = (1 - Math.cos(th)) * R * 0.55;
        el.style.transform = `translate3d(${(s.W / 2 + X - s.w / 2).toFixed(1)}px,0,${Z.toFixed(1)}px) rotateY(${(-th * 0.75).toFixed(4)}rad)`;
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
      if (flagged.length > 3) flagged.shift().classList.remove('is-flagged');
    }, 2200);

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
          {Array.from({ length: COPIES }, (_, copy) =>
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

  const tier1 = PROJECTS.filter((p) => p.tier === 1);
  const rest = PROJECTS.filter((p) => p.tier !== 1);

  const onEnter = (name) => setActive(name);
  const onLeave = () => setActive(null);

  const linkedSet = active ? new Set(CONNECTIONS[active] || []) : null;

  return (
    <section className="projects" id="work" aria-label="Work — projects" data-ground="paper" data-section="projects">
      <div className="press-container cf-stage">
        <header className="cf-head" data-depart="lift">
          <span className="kicker">Work</span>
          <KineticHeadline as="h2" font="impact" className="cf-headline">
            Things I&rsquo;ve built. Some broke.
          </KineticHeadline>
          <p className="cf-sub">
            Hover a file — the cases it&rsquo;s related to light up alongside it.
          </p>
        </header>

        <div className="cf-features">
          {tier1.map((p, i) => {
            return (
              <CaseFile
                key={p.name}
                project={p}
                index={i + 1}
                variant="feature"
                tilt={tilt}
                onEnter={onEnter}
                onLeave={onLeave}
                linked={linkedSet?.has(p.name) || false}
              />
            );
          })}
        </div>

        {tilt ? (
          <CurvedRows
            projects={rest}
            first={tier1.length + 1}
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
                  index={tier1.length + i + 1}
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
