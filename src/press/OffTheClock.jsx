import { useRef, useState } from 'react';
import Hand from './Hand';
import { bus } from '../life/bus';
import { prefs } from '../life/prefs';

/**
 * Off the clock — the Profile's margin notes, written in by the pencil
 * (src/life/writeIn.js) in a natural hand: each line its own slope and
 * indent, the way you'd jot things down over a few days. Three of them do
 * what they say when you ask:
 *
 * - the speedcubing one: the cube in the margin does a quick R U R' U'
 *   (your twists, so it undoes them itself once you scroll on);
 * - the origami one: a paper plane takes off from the note and flies off the page;
 * - the card tricks one, on request: a real one — pick a card, don't say,
 *   and it takes yours away (the old princess trick).
 */
const NOTES = [
  { t: 'F1 on weekends.' },
  { t: 'Speedcubes (hence the cube).', act: 'cube', label: 'Speedcubes (hence the cube). Make the cube do a quick trigger.' },
  { t: 'Folded an origami MiG-29.', act: 'plane', label: 'Folded an origami MiG-29. Throw a paper plane.' },
  { t: 'Card tricks, on request.', act: 'cards', label: 'Card tricks, on request. Show me one.' },
  { t: 'Co-founded an NGO with my brother — 1,000+ trees in.' },
  { t: 'State-level badminton, once.' },
  { t: 'Finished the TC10K (slowly).' },
  { t: 'Will bake you a loaf.' },
];
// a little in or out from the margin, the way a hand drifts down a page
const INDENT = [0, 0.9, 0.3, 1.4, 0.15, 0.7, 1.1, 0.4];

// the princess trick: five to pick from, then four that are all different —
// whichever you picked, it's gone
const PICK = [['K', '♠'], ['Q', '♥'], ['J', '♣'], ['K', '♦'], ['Q', '♣']];
const LEFT = [['K', '♣'], ['Q', '♦'], ['J', '♠'], ['K', '♥']];
const isRed = (s) => s === '♥' || s === '♦';

function CardTrick({ onDone }) {
  const [took, setTook] = useState(false);
  const cards = took ? LEFT : PICK;
  return (
    <div className="trick" role="group" aria-label="A card trick">
      <Hand as="p" className="trick-say" key={took ? 'took' : 'pick'}>
        {took ? 'I took yours. It’s gone, isn’t it?' : 'Pick one. Don’t tell me. Just remember it.'}
      </Hand>
      <div className={`trick-cards${took ? ' is-took' : ''}`} key={took ? 'b' : 'a'} aria-live="polite">
        {cards.map(([r, s], i) => (
          <span key={r + s} className={`trick-card${isRed(s) ? ' is-red' : ''}`} style={{ '--i': i }} aria-label={`${r === 'K' ? 'King' : r === 'Q' ? 'Queen' : 'Jack'} of ${{ '♠': 'spades', '♥': 'hearts', '♣': 'clubs', '♦': 'diamonds' }[s]}`}>
            <b>{r}</b>
            <i aria-hidden="true">{s}</i>
          </span>
        ))}
      </div>
      <div className="trick-row">
        {took ? (
          <>
            <button type="button" onClick={() => setTook(false)}>
              Again
            </button>
            <button type="button" onClick={onDone}>
              Done
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setTook(true)}>
            Got one
          </button>
        )}
      </div>
    </div>
  );
}

let planeSvg = null;
async function throwPlane(from) {
  if (prefs.reduced || !from) return;
  planeSvg ||= (await import('../life/icons')).ICON.send;
  const r = from.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'otc-plane';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = planeSvg;
  el.style.left = `${r.right + 6}px`;
  el.style.top = `${r.top + r.height / 2 - 14}px`;
  document.body.appendChild(el);
  // a throw: quick off the hand, a gentle climb, a long glide away up the page
  const frames = [];
  const W = window.innerWidth;
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const u = 1 - (1 - t) ** 1.8;
    const x = u * Math.min(W * 0.55, 620);
    const y = -Math.sin(u * Math.PI * 0.62) * 150 + u * u * 40 - u * 120;
    const a = -18 + u * 26 + Math.sin(t * 9) * 4;
    frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(1)}deg) scale(${(1 - u * 0.35).toFixed(3)})`, opacity: t > 0.85 ? (1 - t) / 0.15 : 1, offset: t });
  }
  el.animate(frames, { duration: 2200, easing: 'linear' }).onfinish = () => el.remove();
}

export default function OffTheClock() {
  const [trick, setTrick] = useState(false);
  const notes = useRef([]);

  const act = (kind, i) => {
    if (kind === 'cube') {
      // a speedcuber's trigger, on the cube in the margin
      ['R', 'U'].forEach((f) => bus.twist?.(f));
      ['R', 'U'].forEach((f) => bus.twist?.(f, true));
    } else if (kind === 'plane') throwPlane(notes.current[i]);
    else if (kind === 'cards') setTrick((v) => !v);
  };

  return (
    <>
      <p className="about-otc-kicker">Off the clock</p>
      <ul className="about-margin" aria-label="Off the clock">
        {NOTES.map((n, i) => (
          <li key={n.t} style={{ '--indent': `${INDENT[i % INDENT.length]}rem` }}>
            {n.act ? (
              <button
                type="button"
                ref={(el) => (notes.current[i] = el)}
                className="otc-act"
                aria-label={n.label}
                aria-expanded={n.act === 'cards' ? trick : undefined}
                onClick={() => act(n.act, i)}
              >
                <Hand className="otc-note">{n.t}</Hand>
              </button>
            ) : (
              <Hand className="otc-note">{n.t}</Hand>
            )}
          </li>
        ))}
      </ul>
      {trick && <CardTrick onDone={() => setTrick(false)} />}
    </>
  );
}
