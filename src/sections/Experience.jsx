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
    const CX = 26; // the line's centre inside its strip
    const wave = (y) => CX + Math.sin(y * 0.017) * 5 + Math.sin(y * 0.0061 + 1) * 3;

    // the line: a meander down the margin with a little loop before each job
    const build = () => {
      const H = ledger.offsetHeight;
      svg.setAttribute('viewBox', `0 0 52 ${H}`);
      svg.style.height = `${H}px`;
      const at = dots.map((d) => d.parentElement.offsetTop + d.offsetTop + d.offsetHeight / 2);
      const pts = [];
      let len = 0;
      const push = (x, y) => {
        const p = pts[pts.length - 1];
        if (p) len += Math.hypot(x - p[0], y - p[1]);
        pts.push([x, y, len]);
      };
      marks = [];
      let next = 0;
      for (let y = 0; y <= H; y += 5) {
        while (next < at.length && y >= at[next] - 30) {
          // a small loop, up and round, then on down to the dot
          const ly = at[next] - 30;
          const cx = wave(ly) - 8;
          for (let a = 0; a >= -Math.PI * 2; a -= Math.PI / 10) push(cx + Math.cos(a) * 8, ly + Math.sin(a) * 8);
          next++;
        }
        push(wave(y), y);
      }
      // where along the line each dot sits
      marks = at.map((y) => (pts.find((p) => p[1] >= y && p !== pts[0]) || pts[pts.length - 1])[2]);
      dots.forEach((d, i) => {
        d.style.left = `${(svg.offsetLeft - d.parentElement.offsetLeft + wave(at[i]) - 6).toFixed(1)}px`;
        d.dataset.len = marks[i];
      });
      path.setAttribute('d', pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(''));
      total = path.getTotalLength();
      path.style.strokeDasharray = `${total}`;
      draw(state.p);
    };
    const state = { p: isReduced ? 1 : 0 };
    const draw = (p) => {
      const L = p * total;
      path.style.strokeDashoffset = `${(total - L).toFixed(1)}`;
      const pt = path.getPointAtLength(L);
      const ahead = path.getPointAtLength(Math.min(total, L + 2));
      const ang = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI - 90;
      nib.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) rotate(${ang.toFixed(1)}deg)`;
      nib.classList.toggle('is-on', p > 0.002 && p < 0.998);
      dots.forEach((d, i) => d.classList.toggle('is-in', L >= marks[i] - 2));
    };
    build();
    const offLayout = onLayout(build);
    const ctx = gsap.context(() => {
      if (isReduced) return;
      gsap.to(state, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: ledger, start: 'top 70%', end: 'bottom 70%', scrub: 0.5 },
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
