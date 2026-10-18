import { useEffect, useRef, useState } from 'react';
import { prefs } from '../life/prefs';

/**
 * Let's talk is a letter, so it gets a stamp: perforated edges, a little
 * line-drawn cube for the picture, first class, the value in the corner.
 * Click it and it spins — flung round fast, slowing gradually to a stop,
 * never at one dull speed — and copies my email. Point at any of the ways to
 * reach me (or the stamp) and a postmark is struck across it — a ring with the press's name and this month,
 * and the wavy cancellation lines — so the letter's ready to go; once you've
 * copied the email it says so.
 *
 * Reduced motion: the postmark just appears.
 */
const EMAIL = 'itejalgoyal@gmail.com';

export default function Postage() {
  const ref = useRef(null);
  const [struck, setStruck] = useState(false);
  const [copied, setCopied] = useState(false);
  const month = new Date().toLocaleString('en', { month: 'short' }).toUpperCase();
  const year = new Date().getFullYear();

  // any of the contact links strikes the postmark too
  useEffect(() => {
    const links = [...document.querySelectorAll('.contact-line-link')];
    const on = () => setStruck(true);
    links.forEach((a) => a.addEventListener('pointerenter', on));
    links.forEach((a) => a.addEventListener('focus', on));
    return () => {
      links.forEach((a) => a.removeEventListener('pointerenter', on));
      links.forEach((a) => a.removeEventListener('focus', on));
    };
  }, []);

  // a spin: quick off the mark, a long slow coast to a stop, alternating ways
  const spins = useRef(0);
  const spin = () => {
    setStruck(true);
    const paper = ref.current?.querySelector('.postage-paper');
    if (!paper || prefs.reduced || paper.getAnimations().length) return;
    const dir = spins.current++ % 2 ? -1 : 1;
    paper.animate([{ rotate: '-5deg' }, { rotate: `${-5 + dir * 720}deg` }], {
      duration: 2200,
      easing: 'cubic-bezier(0.08, 0.82, 0.17, 1)',
    });
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
      <span className="postage-tip" aria-hidden="true">
        {copied ? 'email copied!' : 'click to copy my email'}
      </span>
    </button>
  );
}
