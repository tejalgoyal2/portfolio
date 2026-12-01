import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { prefs } from '../life/prefs';

/**
 * Let's talk is a letter, so it gets a stamp: perforated edges, a little
 * line-drawn cube for the picture, first class, the value in the corner.
 * Click it and it spins like a fidget spinner — always the same way, off
 * quickly and coasting a long while to a stop, and every click while it's
 * still going adds its push to the spin, so a few quick clicks whirl it up
 * (speed lines trailing) — and copies my email. Point at any of the ways to
 * reach me (or the stamp) and a postmark is struck across it — a ring with
 * the press's name and this month, and the wavy cancellation lines — so the
 * letter's ready to go; once you've copied the email it says so.
 *
 * Reduced motion: the postmark just appears.
 */
const EMAIL = 'itejalgoyal@gmail.com';

/**
 * Speed lines for a spinning stamp, the comic way: a couple of curved swishes
 * hugging two opposite corners of the space it whirls in, pointing the way it
 * turns. They stay put (only the stamp turns), so it's the stamp you see
 * spinning, not a disc going round beside it.
 */
function swishes(svg, paper) {
  const w = paper.offsetWidth;
  const h = paper.offsetHeight;
  const r = Math.hypot(w, h) / 2;
  const box = Math.ceil(r + 30);
  svg.setAttribute('viewBox', `${-box} ${-box} ${box * 2} ${box * 2}`);
  svg.style.width = svg.style.height = `${box * 2}px`;
  svg.style.margin = `${-box}px 0 0 ${-box}px`;
  const deg = Math.PI / 180;
  const arc = (rr, from, to) => {
    const p = (a) => `${(Math.cos(a * deg) * rr).toFixed(1)} ${(Math.sin(a * deg) * rr).toFixed(1)}`;
    return `M${p(from)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 1 ${p(to)}`;
  };
  // clockwise: over the top right, and under the bottom left; a long stroke and a short one each
  const d = [-118, 62].map((a) => `${arc(r + 8, a, a + 52)}${arc(r + 18, a + 12, a + 40)}`).join('');
  svg.innerHTML = `<path d="${d}"/>`;
}

export default function Postage() {
  const ref = useRef(null);
  const [struck, setStruck] = useState(false);
  const [copied, setCopied] = useState(false);
  const month = new Date().toLocaleString('en', { month: 'short' }).toUpperCase();
  const year = new Date().getFullYear();

  // any of the contact links strikes the postmark too
  useEffect(() => {
    const links = [...document.querySelectorAll('.contact-line a')];
    const on = () => setStruck(true);
    links.forEach((a) => a.addEventListener('pointerenter', on));
    links.forEach((a) => a.addEventListener('focus', on));
    return () => {
      links.forEach((a) => a.removeEventListener('pointerenter', on));
      links.forEach((a) => a.removeEventListener('focus', on));
    };
  }, []);

  // the spin: one way only; each click is a push that adds to whatever spin
  // it already has, and it coasts down on friction — fast at first, then a
  // long, slow fade to a stop
  const spinner = useRef({ a: -5, v: 0, push: 0, on: false });
  const tickRef = useRef(null);
  useEffect(() => () => tickRef.current && gsap.ticker.remove(tickRef.current), []);
  const spin = () => {
    setStruck(true);
    const paper = ref.current?.querySelector('.postage-paper');
    const spinEl = ref.current?.querySelector('.postage-spin');
    const lines = ref.current?.querySelector('.postage-whirl');
    if (!paper || !spinEl || prefs.reduced) return;
    const sp = spinner.current;
    if (lines && !lines.childElementCount) swishes(lines, paper);
    sp.push += 430; // deg/s per click
    if (sp.on) return;
    sp.on = true;
    const tick = (t, deltaMs) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      // a push lands over a few frames, not in one jolt
      const take = sp.push * (1 - Math.exp(-dt / 0.05));
      sp.push -= take;
      sp.v = Math.min(1700, sp.v + take);
      // friction: drag that grows with speed, and a little that's always there
      sp.v = Math.max(0, sp.v - (0.55 * sp.v + 38) * dt);
      sp.a += sp.v * dt;
      // the stamp and its postmark turn together
      spinEl.style.rotate = `${(sp.a + 5).toFixed(2)}deg`;
      const k = Math.min(1, Math.max(0, (sp.v - 240) / 700));
      // a touch of motion blur when it's really going
      spinEl.style.filter = k > 0.05 ? `blur(${(k * 0.7).toFixed(2)}px)` : '';
      if (lines) lines.style.opacity = (k * (0.85 + 0.15 * Math.sin(t * 38))).toFixed(3);
      if (sp.v <= 0 && sp.push < 1) {
        sp.on = false;
        sp.a = ((sp.a + 5) % 360) - 5;
        spinEl.style.filter = '';
        if (lines) lines.style.opacity = '0';
        gsap.ticker.remove(tick);
        tickRef.current = null;
      }
    };
    tickRef.current = tick;
    gsap.ticker.add(tick);
  };

  const copy = async () => {
    setStruck(true);
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* no clipboard: the mailto link is right there */
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`postage${struck ? ' is-struck' : ''}${copied ? ' is-copied' : ''}`}
      onPointerEnter={() => setStruck(true)}
      onClick={() => {
        spin();
        copy();
      }}
      aria-label={`Copy my email address, ${EMAIL}`}
      data-pen="rocket"
    >
      {/* comic swishes by its corners while it whirls (drawn on the first spin) */}
      <svg className="postage-whirl" aria-hidden="true" />
      {/* the stamp and its postmark spin as one */}
      <span className="postage-spin" aria-hidden="true">
        <span className="postage-paper" aria-hidden="true">
          <span className="postage-face">
            <span className="postage-top">FIRST CLASS</span>
            <svg className="postage-art" viewBox="0 0 60 60">
              {/* a little cube, in three faces */}
              <path className="pa-top" d="M30 8 52 19 30 30 8 19Z" />
              <path className="pa-left" d="M8 19 30 30V54L8 43Z" />
              <path className="pa-right" d="M52 19 30 30V54L52 43Z" />
              <path className="pa-grid" d="M15.3 15.3 37.3 26.3M22.7 11.7 44.7 22.7M15.3 22.7 37.3 11.7M22.7 26.3 44.7 15.3M8 27 30 38M8 35 30 46M15.3 22.7V46.7M22.7 26.3V50.3M52 27 30 38M52 35 30 46M44.7 22.7V46.7M37.3 26.3V50.3" />
            </svg>
            <span className="postage-value">
              67<small>¢</small>
            </span>
          </span>
        </span>
        <svg className="postage-mark" viewBox="0 0 150 90" aria-hidden="true">
          <defs>
            <path id="pm-ring" d="M45 45m-30 0a30 30 0 1 1 60 0a30 30 0 1 1-60 0" />
          </defs>
          <circle cx="45" cy="45" r="36" />
          <circle cx="45" cy="45" r="25" />
          <text className="pm-ring-text">
            <textPath href="#pm-ring" startOffset="2%">
              THE PERSONAL PRESS · {month} {year} ·
            </textPath>
          </text>
          <text className="pm-centre" x="45" y="50" textAnchor="middle">
            {copied ? 'COPIED' : 'SENT'}
          </text>
          <path className="pm-waves" d="M86 26q8-6 16 0t16 0 16 0M86 38q8-6 16 0t16 0 16 0M86 50q8-6 16 0t16 0 16 0M86 62q8-6 16 0t16 0 16 0" />
        </svg>
      </span>
      <span className="postage-tip" aria-hidden="true">
        {copied ? 'email copied!' : 'click to copy my email'}
      </span>
    </button>
  );
}
