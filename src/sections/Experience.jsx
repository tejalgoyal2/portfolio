import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { EXPERIENCE } from '../data/experience';
import KineticHeadline from '../press/KineticHeadline';
import Redacted from '../press/Redacted';
import CountUp from '../press/CountUp';
import { onLayout } from '../life/layout';

/**
 * Experience — the working history on the first dark spread. The section owns
 * its ink background, so the bright text is legible no matter where the scroll
 * sits (no scrubbed layer to desync). Every entry shows in full — role, place,
 * and what I actually did — so there's no hover-expand to reflow the page. One
 * security line stays redacted until you scroll it into the clear. Entrance
 * staggers in once; reduced motion just reads it static.
 *
 * As you scroll the ledger, a red line of ink draws itself down the left
 * margin — not ruled straight: it meanders a little and makes a small loop as
 * it comes to each job, pressing a dot in beside it — with the pen nib riding
 * its very tip (one eased scroll value drives both, so they never drift
 * apart); each row is pasted in from the margin and slides off the
 * galley on the way out (src/life/arrive.js), and the headline numbers —
 * marked {{like this}} in the data — count up as they arrive.
 */
const REDACT = 'C2';

function Plain({ text }) {
  const i = text.indexOf(`${REDACT} indicators`);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <Redacted trigger="scroll" tone="red">
        {REDACT}
      </Redacted>
      {text.slice(i + REDACT.length)}
    </>
  );
}

function Dispatch({ text }) {
  return text.split(/(\{\{.+?\}\})/).map((part, k) =>
    part.startsWith('{{') ? <CountUp key={k} value={part.slice(2, -2)} /> : <Plain key={k} text={part} />
  );
}

export default function Experience() {
  const rootRef = useRef(null);
  const [reduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const root = rootRef.current;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ledger = root.querySelector('.ledger');
    const svg = root.querySelector('.led-ink');
    const path = svg.querySelector('path');
    const nib = root.querySelector('.led-nib');
    const dots = [...root.querySelectorAll('.led-dot-mark')];
    let total = 1;
    let marks = []; // arc length at each job's dot
    const CX = 40; // the line's centre inside its strip
    const wave = (y) => CX + Math.sin(y * 0.0105) * 12 + Math.sin(y * 0.0037 + 1) * 7;
    const LOOP = 19; // radius of the little loop before each job

    // the line: a meander down the margin with a loop before each job, then
    // round the corner at the bottom and out along the closing rule
    const build = () => {
      const H = ledger.offsetHeight;
      const Wd = ledger.clientWidth;
      // the strip sits out in the margin (SVG has no offsetLeft: measure the boxes)
      const left = svg.getBoundingClientRect().left - ledger.getBoundingClientRect().left;
      svg.setAttribute('viewBox', `0 0 ${Wd - left} ${H + 4}`);
      svg.style.width = `${Wd - left}px`;
      svg.style.height = `${H + 4}px`;
      const at = dots.map((d) => d.parentElement.offsetTop + d.offsetTop + d.offsetHeight / 2);
      const raw = [];
      let next = 0;
      const end = H - 30;
      for (let y = 0; y <= end; y += 6) {
        while (next < at.length && y >= at[next] - 52) {
          // a loop: up and round to the left, then on down to the dot
          const ly = at[next] - 52;
          const cx = wave(ly) - LOOP;
          for (let a = 0; a >= -Math.PI * 2; a -= Math.PI / 14) raw.push([cx + Math.cos(a) * LOOP, ly + Math.sin(a) * LOOP * 1.1]);
          next++;
        }
        raw.push([wave(y), y]);
      }
      // round the corner onto the closing rule, and out along it
      const ex = wave(end);
      const ry = H - 1;
      for (let a = Math.PI; a >= Math.PI / 2; a -= Math.PI / 12) raw.push([ex + 28 + Math.cos(a) * 28, ry - 28 + Math.sin(a) * 28]);
      for (let x = ex + 40; x <= Wd - left; x += 24) raw.push([x, ry]);
      // smooth it (Catmull-Rom), and note how far along each dot is
      let d = `M${raw[0][0].toFixed(1)} ${raw[0][1].toFixed(1)}`;
      for (let k = 0; k < raw.length - 1; k++) {
        const p0 = raw[k - 1] || raw[k];
        const p1 = raw[k];
        const p2 = raw[k + 1];
        const p3 = raw[k + 2] || p2;
        d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      path.setAttribute('d', d);
      total = path.getTotalLength();
      path.style.strokeDasharray = `${total}`;
      // where along the line each dot sits: the running length of the points
      // we laid down (cheap — no measuring the curve), scaled to the real path
      const run = [0];
      for (let k = 1; k < raw.length; k++) run.push(run[k - 1] + Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]));
      const scale = total / Math.max(1, run[run.length - 1]);
      const tail = raw.length - Math.ceil((Wd - left - ex) / 24) - 7; // the points before the exit
      marks = at.map((y) => {
        for (let k = 1; k < tail; k++) if (raw[k][1] >= y - 1) return run[k] * scale;
        return total;
      });
      dots.forEach((dot, i) => {
        dot.style.left = `${(left - dot.parentElement.offsetLeft + wave(at[i]) - 6).toFixed(1)}px`;
      });
      draw(state.p, true);
    };
    const state = { p: isReduced ? 1 : 0 };
    let ang = 0;
    const draw = (p, snap = false) => {
      const L = p * total;
      path.style.strokeDashoffset = `${(total - L).toFixed(1)}`;
      const pt = path.getPointAtLength(L);
      // the nib's lean follows the line, smoothed over a few px so it never twitches
      const a0 = path.getPointAtLength(Math.max(0, L - 10));
      const a1 = path.getPointAtLength(Math.min(total, L + 10));
      let want = (Math.atan2(a1.y - a0.y, a1.x - a0.x) * 180) / Math.PI - 90;
      while (want - ang > 180) want -= 360;
      while (want - ang < -180) want += 360;
      ang = snap ? want : ang + (want - ang) * 0.35;
      nib.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) rotate(${ang.toFixed(1)}deg)`;
      nib.classList.toggle('is-on', p > 0.002 && p < 0.995);
      dots.forEach((d, i) => d.classList.toggle('is-in', L >= marks[i] - 2));
    };
    build();
    const offLayout = onLayout(build);
    const ctx = gsap.context(() => {
      if (isReduced) return;
      gsap.to(state, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: ledger, start: 'top 70%', end: 'bottom 55%', scrub: 0.5 },
        onUpdate: () => draw(state.p),
      });
    }, root);

    return () => {
      ctx.revert();
      offLayout();
    };
  }, []);

  return (
    <section ref={rootRef} className="experience" id="experience" aria-label="Experience" data-ground="ink" data-section="experience">
      <div className="press-container">
        <header className="led-head" data-depart="lift">
          <span className="kicker">Experience</span>
          <KineticHeadline as="h2" font="name" className="led-headline">
            Where I&rsquo;ve worked
          </KineticHeadline>
        </header>

        <div className="ledger">
          <svg className="led-ink" aria-hidden="true">
            <path />
          </svg>
          <span className="led-nib" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 22 6.5 12.5 9 4h6l2.5 8.5z" />
              <circle cx="12" cy="11.5" r="1.4" />
              <path d="M12 13v8" />
            </svg>
          </span>
          {EXPERIENCE.map((entry) => (
            <article
              key={`${entry.org}-${entry.period}`}
              className={`led-entry${reduced ? ' is-open' : ''}`}
              data-arrive="paste"
              data-depart="slide"
            >
              <span className="led-dot-mark" aria-hidden="true" />
              <div className="led-period">{entry.period}</div>

              <div className="led-body">
                <h3 className="led-role">
                  {entry.role}
                  {entry.active && (
                    <span className="led-developing">
                      Now
                    </span>
                  )}
                </h3>
                <p className="led-org">{entry.org}</p>
                <p className="led-desc" data-ink>{entry.desc}</p>

                {entry.details?.length > 0 && (
                  <ul className="led-dispatches">
                    {entry.details.map((d, j) => (
                      <li className="led-dispatch" key={j} data-ink="block">
                        <Dispatch text={d} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
