import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITEKEY } from '../data/site';
import { found } from '../life/discover';

/**
 * Grateful for — the stamp sheet (docs/REVAMP.md §6). A sheet of cream paper
 * on the red, covered in rubber-stamped words: things people passing through
 * were grateful for, each pressed down wherever they chose. Not a question
 * put to anyone and not a form: you type your word or two, it becomes a
 * stamp that follows your pointer over the sheet, and you press it down where
 * you like (or press Enter and it finds a spot). Each stamp is inked in one of
 * a few colours and lands at its own angle; the older ones have faded a
 * little. Anonymous, once a day. Your own stays where you put it for you,
 * even while it waits for a quick check.
 *
 * The stamps come from /api/gratitude (functions/api/gratitude), newest
 * eighty. The person check (Cloudflare Turnstile, invisible unless it's
 * unsure of you) loads only when you start typing. If the sheet isn't set up
 * yet, it says so and takes nothing.
 */
const MAX = 24;
const TODAY_KEY = 'press-letter-day';
const MINE_KEY = 'press-stamp-mine';
const today = () => new Date().toISOString().slice(0, 10);
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* fine: it's only a reminder for this browser */
    }
  },
};
const readMine = () => {
  try {
    return JSON.parse(store.get(MINE_KEY) || 'null');
  } catch {
    return null;
  }
};

// a stamp's ink and angle come from its word and place, so it's the same for everyone
const INKS = ['red', 'ink', 'blue'];
function seed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const looks = (word, x, y) => {
  const h = seed(`${word}|${x}|${y}`);
  return { ink: INKS[h % INKS.length], rot: ((h >>> 3) % 1700) / 100 - 8.5 };
};
// a spot for a stamp that wasn't placed by hand: away from the edges, away from the last few
function freeSpot(stamps) {
  let best = { x: 0.5, y: 0.5 };
  let far = -1;
  for (let k = 0; k < 24; k++) {
    const x = 0.12 + Math.random() * 0.76;
    const y = 0.18 + Math.random() * 0.64;
    const d = Math.min(1, ...stamps.slice(-14).map((s) => Math.hypot((s.x - x) * 1.6, s.y - y)));
    if (d > far) {
      far = d;
      best = { x, y };
    }
  }
  return best;
}
const within = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const keyOf = (s) => `${s.word}|${s.x}|${s.y}`;

let turnstileLoading = null;
const loadTurnstile = () =>
  (turnstileLoading ||= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = reject;
    document.head.appendChild(s);
  }));

function Impression({ s, age, fresh }) {
  const { ink, rot } = looks(s.word, s.x, s.y);
  return (
    <li
      className={`gstamp gstamp--${ink}${fresh ? ' is-fresh' : ''}${s.mine ? ' is-mine' : ''}`}
      style={{ left: `${(s.x * 100).toFixed(2)}%`, top: `${(s.y * 100).toFixed(2)}%`, '--rot': `${rot.toFixed(1)}deg`, '--age': age.toFixed(2) }}
    >
      <span className="gstamp-face">{s.word}</span>
    </li>
  );
}

export default function GratefulFor() {
  const [stamps, setStamps] = useState([]);
  const [open, setOpen] = useState(!!TURNSTILE_SITEKEY);
  const [value, setValue] = useState('');
  // idle | sending | set (printed) | held (waiting for a look) | done (already today) | error
  const [state, setState] = useState(store.get(TODAY_KEY) === today() ? 'done' : 'idle');
  const [note, setNote] = useState('');
  const [fresh, setFresh] = useState(null);
  const box = useRef(null);
  const widget = useRef(null);
  const token = useRef('');
  const waiting = useRef(null);
  const rootRef = useRef(null);
  const sheetRef = useRef(null);
  const ghostRef = useRef(null);

  // the stamps, fetched once the sheet is near
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        fetch('/api/gratitude')
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            // a stamp from before stamps had a place gets one from its word
            const list = (d.stamps || []).map((s) => {
              if (Number.isFinite(s.x) && Number.isFinite(s.y)) return s;
              const h = seed(s.word);
              return { ...s, x: 0.12 + ((h % 1000) / 1000) * 0.76, y: 0.18 + (((h >>> 10) % 1000) / 1000) * 0.64 };
            });
            setStamps(list);
            if (!d.open) setOpen(false);
          })
          .catch(() => setOpen(false));
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // the person check, the first time you start typing
  const ready = async () => {
    if (!open || widget.current !== null || !box.current) return;
    widget.current = 'loading';
    try {
      const ts = await loadTurnstile();
      widget.current = ts.render(box.current, {
        sitekey: TURNSTILE_SITEKEY,
        action: 'gratitude',
        appearance: 'interaction-only',
        callback: (t) => {
          token.current = t;
          waiting.current?.(t);
        },
        // when it does want a click, say so: the box is just under the sheet
        'before-interactive-callback': () => setNote('A quick robot check just below, then it goes to press.'),
        'expired-callback': () => (token.current = ''),
        'error-callback': () => {
          token.current = '';
          waiting.current?.('');
        },
      });
    } catch {
      widget.current = null;
    }
  };
  // pressed before the check has finished: wait for it a moment
  const tokenSoon = () =>
    token.current
      ? Promise.resolve(token.current)
      : new Promise((resolve) => {
          const t = setTimeout(() => resolve(''), 15000);
          waiting.current = (v) => {
            clearTimeout(t);
            waiting.current = null;
            resolve(v);
          };
        });

  const word = value.trim().replace(/\s+/g, ' ');
  const canStamp = open && !!word && (state === 'idle' || state === 'error');

  const stamp = async (at) => {
    if (!canStamp) return;
    // letters in any language, accents and all (the same rule the server keeps)
    if (!/^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)?$/u.test(word)) {
      setState('error');
      setNote('One or two words, letters only. It’s an old press.');
      return;
    }
    const spot = at || freeSpot(stamps);
    const x = Math.round(within(spot.x, 0.06, 0.94) * 1000) / 1000;
    const y = Math.round(within(spot.y, 0.1, 0.9) * 1000) / 1000;
    // it lands straight away; the check happens while the ink dries
    const mine = { word: word.toLowerCase(), x, y, mine: true };
    setStamps((ss) => [...ss, mine]);
    setFresh(keyOf(mine));
    setValue('');
    setState('sending');
    setNote('');
    const unstamp = () => setStamps((ss) => ss.filter((s) => s !== mine));
    try {
      await ready();
      const t = await tokenSoon();
      const r = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word, token: t, x, y }),
      });
      token.current = '';
      if (window.turnstile && widget.current && widget.current !== 'loading') window.turnstile.reset(widget.current);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        unstamp();
        if (r.status === 429 && d.error === 'full today') {
          setState('done');
          setNote('Today’s sheet is full. A fresh one goes up tomorrow.');
        } else if (r.status === 429) {
          // one a day for each connection: say whose it was, if it's this browser's
          const mineToday = !!readMine() && store.get(TODAY_KEY) === today();
          store.set(TODAY_KEY, today());
          setState('done');
          setNote(
            mineToday
              ? 'One a day, and yours is already on the sheet.'
              : 'Someone on your network beat you to it (it’s one a day each). Tomorrow?'
          );
        } else if (r.status === 403) {
          setState('error');
          setNote('The robot check didn’t buy it. One more go?');
          setValue(word);
        } else {
          setState('error');
          setNote(r.status === 422 ? 'One or two words, letters only. It’s an old press.' : 'The press jammed. Try again?');
          setValue(word);
        }
        return;
      }
      found('sheet');
      store.set(TODAY_KEY, today());
      store.set(MINE_KEY, JSON.stringify({ word: d.word, x, y }));
      setState(d.printed ? 'set' : 'held');
      setNote(d.printed ? 'Stamped. It’s on the sheet for everyone now.' : 'Stamped. Everyone else sees it once it’s been proofread.');
    } catch {
      unstamp();
      setState('error');
      setNote('The press jammed. Try again?');
      setValue(word);
    }
  };

  // your stamp follows the pointer over the sheet, and goes down where you click
  const onMove = (e) => {
    const g = ghostRef.current;
    if (!g || !canStamp || e.pointerType === 'touch') return;
    const r = sheetRef.current.getBoundingClientRect();
    g.style.transform = `translate3d(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px, 0) translate(-50%, -50%) rotate(-4deg)`;
    g.classList.add('is-on');
  };
  const onLeave = () => ghostRef.current?.classList.remove('is-on');
  const onPress = (e) => {
    if (!canStamp) return;
    onLeave();
    const r = sheetRef.current.getBoundingClientRect();
    stamp({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };

  // yours is kept where you put it, for you, even before everyone else can see it
  const saved = readMine();
  const shown = stamps.slice(-80).map((s) => (saved && keyOf(s) === keyOf(saved) ? { ...s, mine: true } : s));
  if (saved && state === 'done' && !shown.some((s) => keyOf(s) === keyOf(saved))) shown.push({ ...saved, mine: true });
  const n = shown.length;

  let how = 'Anonymous, one a day. Type a word or two, then press it anywhere on the sheet.';
  if (note) how = note;
  else if (!open) how = 'The press is warming up. Back soon.';
  else if (state === 'done') how = 'Today’s is in. Same time tomorrow?';
  else if (word) how = 'Now pick a spot on the sheet and press. Or just hit Enter.';

  return (
    <section ref={rootRef} className="grateful" aria-labelledby="grateful-title">
      <p className="grateful-kicker">The gratitude sheet</p>
      <div className="grateful-head">
        <h3 className="grateful-title" id="grateful-title">
          What are you grateful for today?
        </h3>
        {open && (state === 'idle' || state === 'error') && (
          <form
            className="grateful-form"
            onSubmit={(e) => {
              e.preventDefault();
              stamp();
            }}
          >
            <label className="sr-only" htmlFor="grateful-word">
              A word or two you’re grateful for
            </label>
            <input
              id="grateful-word"
              className="grateful-input"
              type="text"
              maxLength={MAX}
              size={Math.max(17, value.length + 2)}
              autoComplete="off"
              enterKeyHint="done"
              spellCheck="true"
              placeholder="a nap, cold brew…"
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX))}
              onFocus={ready}
            />
            <button className="grateful-set" type="submit" disabled={!word}>
              Stamp it
            </button>
          </form>
        )}
      </div>
      <p className="grateful-how" role="status">
        {how}
      </p>

      <div
        ref={sheetRef}
        className={`grateful-sheet${canStamp ? ' is-inked' : ''}`}
        data-note-clear
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={onPress}
      >
        <ul className="grateful-stamps" aria-label="What people here were grateful for">
          {shown.map((s, i) => (
            <Impression key={keyOf(s)} s={s} age={n > 1 ? 1 - i / (n - 1) : 0} fresh={fresh === keyOf(s)} />
          ))}
        </ul>
        {n === 0 && <p className="grateful-empty">A clean sheet. Go on, be first.</p>}
        {canStamp && (
          <span ref={ghostRef} className="gstamp-ghost" aria-hidden="true">
            <span className="gstamp-face">{word.toLowerCase()}</span>
          </span>
        )}
      </div>
      <div ref={box} className="grateful-check" />
    </section>
  );
}
