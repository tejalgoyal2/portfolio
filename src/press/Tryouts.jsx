import { useRef, useState } from 'react';
import Hand from './Hand';
import Stamp from './Stamp';

/**
 * Try it — a small working piece beside each lead story, so you get what the
 * project is by touching it rather than reading about it. Each one is the
 * idea of the thing, set in the paper's own type, not a screenshot of it:
 *
 * - type: type a few keys and each letter lands like it has weight — it drops
 *   onto the line on a spring, heavier the quicker you go, and the little page
 *   gives under it.
 * - Dime: tap something you'd tell a friend you spent; it's set on the
 *   receipt (what, which pile, how much) and you get teased about it.
 * - IAM Threat Mapper: the four steps of a real break-in (Uber, 2022); tap one
 *   to put the fix there, and everything after it never happens.
 * - Claubi: it asks before it does anything — say no or yes, and every answer
 *   goes in the log, which only ever grows.
 *
 * Transforms and opacity only. Reduced motion: the same pieces, nothing moves.
 */
const reducedNow = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** An underdamped spring from `from` to 0, sampled as keyframes (y in px). */
function springFrames(from, { zeta = 0.32, omega = 22, n = 16, dur = 0.62, opacity = false } = {}) {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = (k / n) * dur;
    const y = from * Math.exp(-zeta * omega * t) * Math.cos(wd * t);
    const f = { transform: `translateY(${y.toFixed(2)}px)`, offset: k / n };
    if (opacity) f.opacity = k === 0 ? 0 : 1;
    return f;
  });
}

/* ---- type ------------------------------------------------------------- */
function TypeTry() {
  const page = useRef(null);
  const line = useRef(null);
  const input = useRef(null);
  const last = useRef(0);
  const [empty, setEmpty] = useState(true);

  const onInput = () => {
    const el = input.current;
    const ln = line.current;
    const caret = ln.querySelector('.try-type-caret');
    const glyphs = () => [...ln.querySelectorAll('.try-type-g')];
    const now = performance.now();
    // the quicker you go, the heavier each letter lands
    const gap = now - (last.current || now - 500);
    last.current = now;
    const weight = Math.round(900 - Math.min(1, Math.max(0, (gap - 70) / 380)) * 520);
    let have = glyphs();
    // backspace (or anything shorter): take letters off the end
    while (have.length > el.value.length) have.pop().remove();
    for (let i = have.length; i < el.value.length; i++) {
      const ch = el.value[i];
      const g = document.createElement('span');
      g.className = 'try-type-g';
      g.textContent = ch === ' ' ? ' ' : ch;
      g.style.fontWeight = weight;
      ln.insertBefore(g, caret);
      if (!reducedNow()) {
        g.animate(springFrames(-(18 + (weight - 380) / 26), { opacity: true }), { duration: 620, easing: 'linear' });
        // the page gives a little under it
        page.current.animate(springFrames(1 + (weight - 380) / 210, { zeta: 0.42, omega: 30, n: 10, dur: 0.4 }), { duration: 400, easing: 'linear' });
      }
    }
    // a full line: the oldest letters fall off the front
    while (ln.scrollWidth > ln.clientWidth + 1 && el.value.length) {
      el.value = el.value.slice(1);
      glyphs()[0]?.remove();
    }
    setEmpty(el.value.length === 0);
  };

  return (
    <div ref={page} className={`try-type${empty ? ' is-empty' : ''}`} onPointerDown={(e) => { if (e.target !== input.current) { e.preventDefault(); input.current?.focus(); } }}>
      <input
        ref={input}
        className="try-type-input"
        type="text"
        maxLength={60}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        aria-label="Type here to try it"
        onInput={onInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.currentTarget.value = '';
            onInput();
          }
        }}
      />
      <p ref={line} className="try-type-line" aria-hidden="true">
        <span className="try-type-caret" />
      </p>
      <span className="try-type-hint" aria-hidden="true">
        click here and type
      </span>
    </div>
  );
}

/* ---- Dime ------------------------------------------------------------- */
const SAYS = [
  { say: 'spent 6.50 on coffee again', item: 'Coffee', pile: 'Food & drink', amt: 6.5, roast: 'Third one this week. Who’s counting? Me.' },
  { say: 'uber home, 23 bucks', item: 'Ride home', pile: 'Getting around', amt: 23, roast: 'The bus was right there.' },
  { say: '40 on a charger i already own', item: 'Charger (another one)', pile: 'Shopping', amt: 40, roast: 'Bhai, pehle drawer check kar le.' },
];
const money = (n) => `$${n.toFixed(2)}`;

function DimeTry() {
  const [rows, setRows] = useState([]);
  const total = rows.reduce((s, r) => s + r.amt, 0);
  const latest = rows[rows.length - 1];
  const add = (s) => setRows((rs) => [...rs, { ...s, key: rs.length }]);

  return (
    <div className="try-dime">
      <p className="try-ask">Tell it what you spent, like you’d tell a friend:</p>
      <div className="try-dime-says">
        {SAYS.map((s) => (
          <button key={s.say} type="button" className="try-dime-say" onClick={() => add(s)}>
            {s.say}
          </button>
        ))}
      </div>
      <div className="try-dime-receipt" aria-live="polite">
        {rows.length === 0 ? (
          <p className="try-dime-none">Nothing spent yet. Impressive.</p>
        ) : (
          <>
            <ul className="try-dime-rows">
              {rows.slice(-3).map((r) => (
                <li key={r.key} className="try-dime-row">
                  <span className="try-dime-item">{r.item}</span>
                  <span className="try-dime-pile">{r.pile}</span>
                  <span className="try-dime-amt">{money(r.amt)}</span>
                </li>
              ))}
            </ul>
            <p className="try-dime-total">
              <span>So far</span>
              <span>{money(total)}</span>
            </p>
            <Hand as="p" key={latest.key} className="try-dime-roast">
              {latest.roast}
            </Hand>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- IAM Threat Mapper ------------------------------------------------ */
const STEPS = [
  { did: 'Bought a contractor’s stolen password', fix: 'a passkey: a password alone opens nothing' },
  { did: 'Spammed login approvals until one got tapped', fix: 'number-matching on every approval' },
  { did: 'Found admin passwords sitting in a script', fix: 'secrets in a vault, never in scripts' },
  { did: 'Walked into nearly everything', fix: 'no one account that opens it all' },
];

function ChainTry() {
  const [stop, setStop] = useState(-1);
  return (
    <div className="try-chain">
      <p className="try-ask">
        Uber, 2022. <span>Tap a step to stop it there.</span>
      </p>
      <ol className="try-chain-steps">
        {STEPS.map((s, i) => {
          const state = stop < 0 ? '' : i === stop ? ' is-stopped' : i > stop ? ' is-gone' : '';
          return (
            <li key={s.did} className={`try-chain-step${state}`}>
              <button type="button" aria-pressed={i === stop} onClick={() => setStop((v) => (v === i ? -1 : i))}>
                <span className="try-chain-n">{i + 1}</span>
                <span className="try-chain-did">{s.did}</span>
              </button>
              {i === stop && (
                <span className="try-chain-fix">
                  <Stamp label="STOPPED" tone="red" rotate={-6} pressIn interactive={false} />
                  <Hand>{`with ${s.fix}`}</Hand>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---- Claubi ----------------------------------------------------------- */
const ASKS = [
  { verb: 'run', what: 'rm -rf ./build' },
  { verb: 'read', what: '~/.ssh/id_ed25519' },
  { verb: 'edit', what: 'src/main.rs' },
  { verb: 'run', what: 'cargo test' },
];
const clock = () => new Date().toTimeString().slice(0, 8);

function PermitTry() {
  const [at, setAt] = useState(0);
  const [log, setLog] = useState([]);
  const ask = ASKS[at % ASKS.length];
  const [aside, setAside] = useState('');
  const answer = (you) => {
    setLog((l) => [...l, { key: l.length, line: `{"at":"${clock()}","${ask.verb}":"${ask.what}","you":"${you}"}` }]);
    // the one you really shouldn't say yes to
    setAside(you === 'allow' && ask.what.includes('.ssh') ? 'bold. that was your SSH key.' : '');
    setAt((a) => a + 1);
  };
  return (
    <div className="try-permit">
      <div className="try-permit-ask" aria-live="polite">
        <p className="try-permit-who">
          claubi wants to <b>{ask.verb}</b>
        </p>
        <p className="try-permit-what">{ask.what}</p>
        <div className="try-permit-row">
          <button type="button" className="try-permit-no" onClick={() => answer('deny')}>
            Deny
          </button>
          <button type="button" className="try-permit-yes" onClick={() => answer('allow')}>
            Allow once
          </button>
        </div>
      </div>
      {aside && (
        <Hand as="p" key={log.length} className="try-permit-aside">
          {aside}
        </Hand>
      )}
      <div className="try-permit-log">
        <p className="try-permit-file">audit.jsonl · only ever grows</p>
        {log.length === 0 ? (
          <p className="try-permit-line is-quiet">nothing asked yet</p>
        ) : (
          log.slice(-3).map((l) => (
            <p key={l.key} className="try-permit-line">
              {l.line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

const TRY = { type: TypeTry, Dime: DimeTry, 'IAM Threat Mapper': ChainTry, Claubi: PermitTry };

export function hasTry(name) {
  return !!TRY[name];
}

export default function Tryout({ name }) {
  const Piece = TRY[name];
  if (!Piece) return null;
  return (
    <figure className="story-try">
      <figcaption className="story-try-label">Try it</figcaption>
      <Piece />
    </figure>
  );
}
