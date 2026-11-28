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
 * margin — not ruled straight: it winds down in long, easy bends like a snake,
 * pressing a dot in beside each job as it passes. At the bottom it
 * rounds the corner onto the closing rule and runs along it, off the side of
 * the screen. The pen nib rides its very tip, held like a pen — leaning into
 * the stroke, never spinning (one eased scroll value drives
 * line and nib, so they never drift apart); each row is pasted in from the margin and slides off the
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
    // a snake's path: long, easy S-bends, never a kink
    const wave = (y) => CX + Math.sin(y * 0.0118) * 15 + Math.sin(y * 0.0047 + 1) * 6;
    let segs = []; // the line's cubic pieces: { p1, c1, c2, p2, at, len }
    let exitAt = 0; // the point where it turns onto the closing rule
    let downLen = 1;
    const DOWN = 0.86; // the share of the scroll that draws the run down the margin
    const bez = (a, b, c, e, t) => {
      const u = 1 - t;
      const w0 = u * u * u;
      const w1 = 3 * u * u * t;
      const w2 = 3 * u * t * t;
      const w3 = t * t * t;
      return [w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * e[0], w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * e[1]];
    };
    /** The point at length L along the line, and the line's heading there. */
    const along = (L) => {
      let lo = 0;
      let hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].at <= L) lo = mid;
        else hi = mid - 1;
      }
      const g = segs[lo];
      if (!g) return { x: 0, y: 0, a: Math.PI / 2 };
      const t = Math.min(1, Math.max(0, (L - g.at) / Math.max(1e-6, g.len)));
      const [x, y] = bez(g.p1, g.c1, g.c2, g.p2, t);
      // the tangent, smoothed over a little of the line either side
      const [x0, y0] = bez(g.p1, g.c1, g.c2, g.p2, Math.max(0, t - 0.25));
      const [x1, y1] = bez(g.p1, g.c1, g.c2, g.p2, Math.min(1, t + 0.25));
      return { x, y, a: Math.atan2(y1 - y0, x1 - x0) };
    };

    // the line: a snake down the margin, then
    // round the corner at the bottom and out along the closing rule
    const build = () => {
      const H = ledger.offsetHeight;
      const Wd = ledger.clientWidth;
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
      // round the corner onto the closing rule, and out along it, off the side of the screen
      const ex = wave(end);
      const ry = H - 1;
      const RC = 44;
      for (let a = Math.PI; a >= Math.PI / 2 - 1e-6; a -= Math.PI / 14) raw.push([ex + RC + Math.cos(a) * RC, ry - RC + Math.sin(a) * RC]);
      exitAt = raw.length;
      const off = document.documentElement.clientWidth - lr.left - left + 90;
      for (let x = ex + RC + 30; x <= off; x += 30) raw.push([x, ry]);
      // smooth it (Catmull-Rom → cubic Béziers), keeping each piece so the nib
      // can ride the curve by plain arithmetic, never by asking the SVG
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
      // scale our sums to the browser's own length, so the ink and the nib agree
      const scale = total / Math.max(1, acc);
      segs.forEach((g) => {
        g.at *= scale;
        g.len *= scale;
      });
      // where along the line each dot sits
      marks = at.map((y) => {
        for (let k = 1; k < exitAt; k++) if (raw[k][1] >= y - 1 && raw[k][0] > raw[k - 1][0] - 4) return segs[k - 1].at + segs[k - 1].len;
        return total;
      });
      // how much of the line is the run down the margin (the rest is the exit)
      downLen = segs[Math.max(0, exitAt - 2)].at;
      dots.forEach((dot, i) => {
        dot.style.left = `${(left - dot.parentElement.offsetLeft + wave(at[i]) - 6).toFixed(1)}px`;
      });
      draw(state.p, true);
    };
    const state = { p: isReduced ? 1 : 0 };
    let ang = 0;
    let lastT = 0;
    const draw = (p, snap = false) => {
      // most of the scroll draws the run down the margin; the last stretch is the exit
      const L = p < DOWN ? (p / DOWN) * downLen : downLen + ((p - DOWN) / (1 - DOWN)) * (total - downLen);
      path.style.strokeDashoffset = `${(total - L).toFixed(1)}`;
      const pt = along(L);
      // the nib doesn't spin with the line — it's held like a pen, leaning a
      // little into the way the line is going, eased so it never twitches
      let dev = pt.a - Math.PI / 2;
      while (dev > Math.PI) dev -= Math.PI * 2;
      while (dev < -Math.PI) dev += Math.PI * 2;
      const want = (Math.max(-0.62, Math.min(0.62, dev * 0.42)) * 180) / Math.PI;
      const now = performance.now();
      const k = snap ? 1 : 1 - Math.exp(-Math.min(0.1, (now - lastT) / 1000) / 0.12);
      lastT = now;
      ang += (want - ang) * k;
      nib.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) rotate(${ang.toFixed(1)}deg)`;
      nib.classList.toggle('is-on', p > 0.002);
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
