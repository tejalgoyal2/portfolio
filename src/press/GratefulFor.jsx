import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITEKEY } from '../data/site';

/**
 * Grateful for — the gratitude line (docs/REVAMP.md §6). Not a question put
 * to anyone and not a form: one running line of type across the bottom of the
 * paper, "Grateful for coffee · the sea · my mum · …", and at the end of it
 * a blank that's yours. Write a word or two, press Enter, and it's set into
 * the line with the others. Anonymous, once a day. The same word from
 * different people is set bigger each time; the newest sixty are shown.
 *
 * The words come from /api/gratitude (functions/api/gratitude). The person
 * check (Cloudflare Turnstile, invisible unless it's unsure of you) loads only
 * when you start writing. Each word is checked before it's printed; anything
 * doubtful waits for Tejal. If the line isn't set up yet, the blank says so.
 */
const MAX = 24;
const TODAY_KEY = 'press-letter-day';
const MINE_KEY = 'press-letter-word';
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

export default function GratefulFor() {
  const [words, setWords] = useState([]);
  const [open, setOpen] = useState(!!TURNSTILE_SITEKEY);
  const [value, setValue] = useState('');
  // idle | sending | set (printed) | held (waiting for a look) | done (already today) | error
  const [state, setState] = useState(store.get(TODAY_KEY) === today() ? 'done' : 'idle');
  const [note, setNote] = useState('');
  const box = useRef(null);
  const widget = useRef(null);
  const token = useRef('');
  const waiting = useRef(null);
  const rootRef = useRef(null);

  // the words, fetched once the line is near
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
        action: 'gratitude',
        appearance: 'interaction-only',
        callback: (t) => {
          token.current = t;
          waiting.current?.(t);
        },
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
  // Enter before the check has finished: wait for it a moment
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

  const send = async (e) => {
    e.preventDefault();
    const word = value.trim().replace(/\s+/g, ' ');
    if (!word || state === 'sending') return;
    if (!/^\p{L}+(?: \p{L}+)?$/u.test(word)) {
      setState('error');
      setNote('One or two words, letters only.');
      return;
    }
    setState('sending');
    setNote('');
    try {
      await ready();
      const t = await tokenSoon();
      const r = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ word, token: t }),
      });
      token.current = '';
      if (window.turnstile && widget.current && widget.current !== 'loading') window.turnstile.reset(widget.current);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 429 && d.error === 'full today') {
          setState('done');
          setNote('The line’s full for today. Come back tomorrow?');
        } else if (r.status === 429) {
          store.set(TODAY_KEY, today());
          setState('done');
          setNote('One a day. This one’s yours again tomorrow.');
        } else {
          setState('error');
          setNote(r.status === 422 ? 'One or two words, letters only.' : 'That didn’t go through. Try again?');
        }
        return;
      }
      store.set(TODAY_KEY, today());
      store.set(MINE_KEY, d.word);
      setValue('');
      if (d.printed) {
        setState('set');
        setNote('Set. It’s on the page now.');
        setWords((ws) => {
          const at = ws.findIndex((w) => w.word === d.word);
          if (at < 0) return [{ word: d.word, n: 1, fresh: true }, ...ws];
          const next = [...ws];
          next.splice(at, 1);
          return [{ word: d.word, n: ws[at].n + 1, fresh: true }, ...next];
        });
      } else {
        setState('held');
        setNote('Set aside for a quick look. It’ll be on the page soon.');
      }
    } catch {
      setState('error');
      setNote('That didn’t go through. Try again?');
    }
  };

  const most = Math.max(1, ...words.map((w) => w.n));
  const mine = store.get(MINE_KEY);
  const canWrite = open && (state === 'idle' || state === 'error' || state === 'sending');

  return (
    <section ref={rootRef} className="grateful" aria-labelledby="grateful-title">
      <h3 className="grateful-kicker" id="grateful-title">
        Grateful for
      </h3>
      <ul className="grateful-line" aria-label="What people here are grateful for">
        {words.map((w) => (
          <li
            key={w.word}
            className={`grateful-word${w.fresh ? ' is-fresh' : ''}${w.word === mine ? ' is-mine' : ''}`}
            style={{ '--k': (Math.log(w.n) / Math.log(most + 1)).toFixed(3) }}
            title={w.n > 1 ? `${w.n} people` : undefined}
          >
            {w.word}
          </li>
        ))}
        {(canWrite || !open) && (
          <li className="grateful-blank">
            {open ? (
              <form onSubmit={send}>
                <label className="sr-only" htmlFor="grateful-word">
                  What are you grateful for today? A word or two.
                </label>
                <input
                  id="grateful-word"
                  className="grateful-input"
                  type="text"
                  maxLength={MAX}
                  size={Math.max(9, value.length + 1)}
                  autoComplete="off"
                  enterKeyHint="done"
                  spellCheck="true"
                  placeholder={words.length ? 'and yours?' : 'be the first'}
                  value={value}
                  onChange={(e) => setValue(e.target.value.slice(0, MAX))}
                  onFocus={ready}
                  readOnly={state === 'sending'}
                  data-cursor="nib"
                />
                {value.trim() && (
                  <button className="grateful-set" type="submit" disabled={state === 'sending'}>
                    {state === 'sending' ? 'Setting…' : 'Set it ↵'}
                  </button>
                )}
              </form>
            ) : (
              <span className="grateful-closed">opening soon</span>
            )}
          </li>
        )}
      </ul>
      <p className="grateful-note" role="status">
        {note || (state === 'done' ? 'Yours is in. See you tomorrow.' : 'Anonymous · one a day')}
      </p>
      <div ref={box} className="grateful-check" />
    </section>
  );
}
