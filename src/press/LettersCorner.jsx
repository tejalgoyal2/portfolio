import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITEKEY } from '../data/site';
import Stamp from './Stamp';

/**
 * Letters to the editor — the gratitude corner (docs/REVAMP.md §6). One
 * question: what are you grateful for today? You leave a word or two,
 * anonymously, once a day; a RECEIVED stamp lands on your slip. Every word
 * that's been approved is set as a slug of type on the corner — the same word
 * from different people merges and grows with each one — the newest sixty.
 *
 * The words come from /api/gratitude (functions/api/gratitude). A person check
 * (Cloudflare Turnstile) is loaded only when you start writing. Each word is
 * checked before it's printed; anything doubtful waits for Tejal. If the
 * desk isn't set up yet (no site key, no database), the corner says so and
 * stays quiet.
 */
const MAX = 24;
const TODAY_KEY = 'press-letter-day';
const today = () => new Date().toISOString().slice(0, 10);
const sentToday = () => {
  try {
    return localStorage.getItem(TODAY_KEY) === today();
  } catch {
    return false;
  }
};

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

export default function LettersCorner() {
  const [words, setWords] = useState([]);
  const [open, setOpen] = useState(!!TURNSTILE_SITEKEY);
  const [value, setValue] = useState('');
  const [state, setState] = useState(sentToday() ? 'done' : 'idle'); // idle | sending | done | error
  const [msg, setMsg] = useState('');
  const box = useRef(null);
  const widget = useRef(null);
  const token = useRef('');
  const rootRef = useRef(null);

  // the words, fetched once the corner is near
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
            setWords(d.words || []);
            if (!d.open) setOpen(false);
          })
          .catch(() => setOpen(false));
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // the person check, the first time you start writing
  const ready = async () => {
    if (!open || widget.current !== null || !box.current) return;
    widget.current = 'loading';
    try {
      const ts = await loadTurnstile();
      widget.current = ts.render(box.current, {
        sitekey: TURNSTILE_SITEKEY,
        appearance: 'interaction-only',
        callback: (t) => (token.current = t),
        'expired-callback': () => (token.current = ''),
      });
    } catch {
      widget.current = null;
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const word = value.trim();
    if (!word || state === 'sending') return;
    setState('sending');
    setMsg('');
    try {
      const r = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word, token: token.current }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setState(r.status === 429 ? 'done' : 'error');
        setMsg(
          r.status === 429
            ? 'One a day — come back tomorrow.'
            : r.status === 422
              ? 'One or two words, letters only.'
              : 'That didn’t go through. Try again?'
        );
        if (window.turnstile && widget.current) window.turnstile.reset(widget.current);
        return;
      }
      try {
        localStorage.setItem(TODAY_KEY, today());
      } catch {
        /* fine */
      }
      setState('done');
      setMsg(d.printed ? '' : 'It’ll be printed once the editor has a look.');
      if (d.printed)
        setWords((ws) => {
          const at = ws.findIndex((w) => w.word === d.word);
          if (at < 0) return [{ word: d.word, n: 1, fresh: true }, ...ws];
          const next = [...ws];
          next.splice(at, 1);
          return [{ word: d.word, n: ws[at].n + 1, fresh: true }, ...next];
        });
    } catch {
      setState('error');
      setMsg('That didn’t go through. Try again?');
    }
  };

  const most = Math.max(1, ...words.map((w) => w.n));

  return (
    <aside ref={rootRef} className="letters" aria-labelledby="letters-title">
      <p className="letters-kicker" id="letters-title">
        Letters to the editor
      </p>
      <form className={`letters-slip is-${state}`} onSubmit={send}>
        <label className="letters-q" htmlFor="letters-word">
          What are you grateful for today?
        </label>
        <div className="letters-row">
          <input
            id="letters-word"
            className="letters-input"
            type="text"
            maxLength={MAX}
            autoComplete="off"
            spellCheck="true"
            placeholder={open ? 'a word or two' : 'the desk opens soon'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={ready}
            disabled={!open || state === 'done' || state === 'sending'}
            data-cursor="nib"
          />
          <button className="letters-send" type="submit" disabled={!open || state === 'done' || !value.trim()}>
            Send
          </button>
        </div>
        <div ref={box} className="letters-check" />
        {state === 'done' && !msg.startsWith('One a day') && (
          <span className="letters-stamp">
            <Stamp label="RECEIVED" tone="red" rotate={-9} pressIn />
          </span>
        )}
        <p className="letters-msg" role="status">
          {msg || (state === 'done' ? 'Thank you. See you tomorrow.' : 'Anonymous. One a day.')}
        </p>
      </form>
      {words.length > 0 && (
        <ul className="letters-words" aria-label="What people are grateful for">
          {words.map((w) => (
            <li
              key={w.word}
              className={`letters-word${w.fresh ? ' is-fresh' : ''}`}
              style={{ '--k': (Math.log(w.n) / Math.log(most + 1)).toFixed(3) }}
              title={w.n > 1 ? `${w.n} people` : undefined}
            >
              {w.word}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
