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
 * a short dispatch of what I actually did, and a few figures from it — so
 * there's no hover-expand to reflow the page. One security phrase stays redacted
 * until you scroll it into the clear. Entrance
 * staggers in once; reduced motion just reads it static.
 *
 * As you scroll the ledger, a red line of ink draws itself down the left
 * margin — not ruled straight: it winds down in long, easy bends like a snake,
 * pressing a dot in beside each job as it passes, and simply ends below the
 * last one. Each row is pasted in from the margin and slides off the
 * galley on the way out (src/life/arrive.js), and the figures count up as
 * they arrive.
 */
const REDACT = 'shadow AI';

function Plain({ text }) {
  const i = text.indexOf(REDACT);
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
    const dots = [...root.querySelectorAll('.led-dot-mark')];
    let total = 1;
    let marks = []; // arc length at each job's dot
    const CX = 40; // the line's centre inside its strip
    // a snake's path: long, easy S-bends, never a kink; on a phone it keeps to a
    // narrow lane of its own beside the text (amp, set in build)
    let amp = 1;
    const wave = (y) => CX + (Math.sin(y * 0.0118) * 15 + Math.sin(y * 0.0047 + 1) * 6) * amp;
    let segs = []; // the line's cubic pieces: { p1, c1, c2, p2, at, len }
    const bez = (a, b, c, e, t) => {
      const u = 1 - t;
      const w0 = u * u * u;
      const w1 = 3 * u * u * t;
      const w2 = 3 * u * t * t;
      const w3 = t * t * t;
      return [w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * e[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * e[1]];
    };
    // the line: a snake down the margin, stopping short of the closing rule
    const build = () => {
      const H = ledger.offsetHeight;
      const Wd = ledger.clientWidth;
      amp = window.matchMedia('(max-width: 720px)').matches ? 0.3 : 1;
      // the strip sits out in the margin (SVG has no offsetLeft: measure the boxes)
      const lr = ledger.getBoundingClientRect();
      const left = svg.getBoundingClientRect().left - lr.left;
      svg.setAttribute('viewBox', `0 0 ${Wd - left} ${H + 4}`);
      svg.style.width = `${Wd - left}px`;
      svg.style.height = `${H + 4}px`;
      const at = dots.map((d) => d.parentElement.offsetTop + d.offsetTop + d.offsetHeight / 2);
      const raw = [];
      const end = H - 46;
      for (let y = 0; y <= end; y += 6) raw.push([wave(y), y]);
      // smooth it (Catmull-Rom → cubic Béziers), keeping each piece's length so
      // the dots can be placed along it by plain arithmetic, never by asking the SVG
      segs = [];
      let d = `M${raw[0][0].toFixed(1)} ${raw[0][1].toFixed(1)}`;
      let acc = 0;
      for (let k = 0; k < raw.length - 1; k++) {
        const p0 = raw[k - 1] || raw[k];
        const p1 = raw[k];
        const p2 = raw[k + 1];
        const p3 = raw[k + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        // its length, from a few points along it
        let len = 0;
        let prev = p1;
        for (let q = 1; q <= 4; q++) {
          const pt = bez(p1, c1, c2, p2, q / 4);
          len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
          prev = pt;
        }
        segs.push({ p1, c1, c2, p2, at: acc, len });
        acc += len;
      }
      path.setAttribute('d', d);
      total = path.getTotalLength();
      path.style.strokeDasharray = `${total}`;
      // scale our sums to the browser's own length, so the ink and the dots agree
      const scale = total / Math.max(1, acc);
      segs.forEach((g) => {
        g.at *= scale;
        g.len *= scale;
      });
      // where along the line each dot sits
      marks = at.map((y) => {
        for (let k = 1; k < raw.length; k++) if (raw[k][1] >= y - 1) return segs[k - 1].at + segs[k - 1].len;
        return total;
      });
      dots.forEach((dot, i) => {
        dot.style.left = `${(left - dot.parentElement.offsetLeft + wave(at[i]) - 6).toFixed(1)}px`;
      });
      draw(state.p);
    };
    const state = { p: isReduced ? 1 : 0 };
    const draw = (p) => {
      const L = p * total;
      path.style.strokeDashoffset = `${(total - L).toFixed(1)}`;
      dots.forEach((d, i) => d.classList.toggle('is-in', L >= marks[i] - 2));
    };
    build();
    const offLayout = onLayout(build);
    // and whenever the ledger itself changes size (fonts landing, rows settling)
    let sizedH = ledger.offsetHeight;
    let sizedW = ledger.clientWidth;
    const sized = new ResizeObserver(() => {
      if (ledger.offsetHeight === sizedH && ledger.clientWidth === sizedW) return;
      sizedH = ledger.offsetHeight;
      sizedW = ledger.clientWidth;
      build();
    });
    sized.observe(ledger);
    const ctx = gsap.context(() => {
      if (isReduced) return;
      gsap.to(state, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: ledger, start: 'top 70%', end: 'bottom 35%', scrub: 0.6 },
        onUpdate: () => draw(state.p),
      });
    }, root);

    return () => {
      ctx.revert();
      offLayout();
      sized.disconnect();
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
          {EXPERIENCE.map((entry) => (
            <article
              key={`${entry.org}-${entry.period}`}
              className={`led-entry${reduced ? ' is-open' : ''}`}
              data-depart="peel"
            >
              <span className="led-dot-mark" aria-hidden="true" />
              <div className="led-period" data-arrive="stamp">{entry.period}</div>

              <div className="led-body" data-arrive-items="lay">
                <h3 className="led-role">
                  {entry.role}
                  {entry.active && (
                    <span className="led-developing">
                      <span className="sr-only">, </span>
                      Now
                    </span>
                  )}
                </h3>
                <p className="led-org">{entry.org}</p>
                <p className="led-story" data-ink>
                  <Plain text={entry.story} />
                </p>
                {entry.figures.length > 0 && (
                  <dl className="led-figs" data-arrive-items="tick">
                    {entry.figures.map(([fig, label]) => (
                      <div className="led-fig" key={label}>
                        <dt className="led-fig-label">{label}</dt>
                        <dd className="led-fig-num">
                          <CountUp value={fig} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
