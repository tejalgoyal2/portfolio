import { prefs } from '../life/prefs';
import { groundAt } from '../life/ground';

/**
 * The editor's notes on the cube: when the solve reaches a milestone, a pen
 * note is scribbled beside it — "two layers done" with a quick arrow; and when
 * it's solved, it's yours: "you solved it!" with a little crown scribbled
 * over it, and the cube throws off a burst of its own stickers in all six
 * colours. The arrow draws itself on like a pen stroke; the words
 * write in letter by letter; the note fades after a while. It sits on the side
 * of the cube with more room, and is inked for the ground it lands on.
 */
const NOTES = {
  layers: { text: 'two layers done', mark: 'arrow', life: 3800 },
  solved: { text: 'you solved it!', mark: 'stickers', life: 9000 },
};
const STICKERS = ['#f3eee4', '#ffcf1f', '#12a153', '#1b5fd1', '#de2a2b', '#ff7b16'];

// a crown, scribbled in one go, with a little flourish under it
const CROWN = 'M8 36 L4 10 L22 24 L40 4 L58 24 L76 10 L72 36 Z M12 42 C 30 38, 50 38, 70 42';
const ARROW = 'M6 34 C 30 30, 52 22, 70 8 M58 7 L71 7 L68 20';

export function createNotes(host) {
  let el = null;
  let timer = 0;

  function show(kind, cube) {
    const n = NOTES[kind];
    if (!n || !host) return;
    clearTimeout(timer);
    el?.remove();
    el = document.createElement('div');
    el.className = `cube-note cube-note--${n.mark}`;
    el.dataset.ground = groundAt(cube.y);
    el.setAttribute('role', 'status');
    const left = cube.x > document.documentElement.clientWidth / 2;
    el.classList.toggle('is-left', left);
    const letters = [...n.text]
      .map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`)
      .join('');
    if (n.mark === 'stickers') {
      el.innerHTML = `<svg class="cube-note-crown" viewBox="0 0 80 44"><path d="${CROWN}" pathLength="1"/></svg><p class="cube-note-text">${letters}</p>`;
    } else {
      el.innerHTML = `<svg class="cube-note-arrow" viewBox="0 0 76 40"><path d="${ARROW}" pathLength="1"/></svg><p class="cube-note-text">${letters}</p>`;
    }
    el.style.setProperty('--cx', `${cube.x}px`);
    el.style.setProperty('--cy', `${cube.y}px`);
    el.style.setProperty('--cr', `${cube.r}px`);
    host.appendChild(el);
    if (prefs.reduced) el.classList.add('is-still');
    requestAnimationFrame(() => el?.classList.add('is-on'));
    timer = setTimeout(() => {
      el?.classList.remove('is-on');
      el?.classList.add('is-off');
      const gone = el;
      setTimeout(() => gone?.remove(), 700);
    }, n.life);
    if (kind === 'solved' && !prefs.reduced) confetti(cube);
  }

  /** The cube throws off its stickers: rounded squares in its six colours, flung out and falling. */
  function confetti(cube) {
    const layer = document.createElement('div');
    layer.className = 'cube-confetti';
    host.appendChild(layer);
    const n = 42;
    let left = n;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      const size = 7 + Math.random() * 9;
      d.style.width = d.style.height = `${size}px`;
      d.style.background = STICKERS[i % STICKERS.length];
      d.style.left = `${cube.x - size / 2}px`;
      d.style.top = `${cube.y - size / 2}px`;
      layer.appendChild(d);
      const th = Math.random() * Math.PI * 2;
      const v = cube.r * (1.1 + Math.random() * 1.6);
      const dx = Math.cos(th) * v;
      const up = Math.sin(th) * v - cube.r * 0.6;
      const fall = cube.r * (1.4 + Math.random());
      const spin = (Math.random() - 0.5) * 900;
      const a = d.animate(
        [
          { transform: 'translate(0,0) rotate(0deg) scale(0.3)', opacity: 1 },
          { transform: `translate(${dx * 0.7}px,${up * 0.8}px) rotate(${spin * 0.4}deg) scale(1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${dx}px,${up + fall}px) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
        ],
        { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.15,.65,.35,1)', delay: Math.random() * 120 }
      );
      a.onfinish = () => {
        d.remove();
        if (--left === 0) layer.remove();
      };
    }
  }

  /** Keep a showing note pinned to the cube as it moves. */
  function follow(cube) {
    if (!el) return;
    el.style.setProperty('--cx', `${cube.x.toFixed(1)}px`);
    el.style.setProperty('--cy', `${cube.y.toFixed(1)}px`);
    el.style.setProperty('--cr', `${cube.r.toFixed(1)}px`);
  }

  return { show, follow, dispose: () => el?.remove() };
}
