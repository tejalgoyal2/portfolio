import { prefs } from '../life/prefs';
import { groundAt } from '../life/ground';

/**
 * The editor's notes on the cube, and the comic bits round it.
 *
 * Milestones: when the solve reaches one, a pen
 * note is scribbled beside it — "two layers done" with a quick arrow; and when
 * it's solved, it's yours: "you solved it!" with a little crown scribbled
 * over it, and the cube throws off a burst of its own stickers in all six
 * colours. The arrow draws itself on like a pen stroke; the words
 * write in letter by letter; the note fades after a while. It sits on the side
 * of the cube with more room, and is inked for the ground it lands on. A
 * note only appears while the cube is actually on screen, and hides if the
 * cube slides away.
 *
 * Motion lines: every turn is drawn round the cube, never on it — a few
 * curved comic strokes just outside the turning layer's rim, swept the way
 * that layer is going, drawn on and wiped off along themselves in a blink.
 * Your own twists get bold ones; the solve's own turns lighter, and fewer of
 * them while it speed-solves.
 *
 * And now and then the cube says something, in a speech bubble: "play with
 * me?" once, when you first come near it; and if the page is running slowly,
 * "is the page slow? hide me :(" with a button that does.
 */
const NOTES = {
  layers: { text: 'two layers done', mark: 'arrow', life: 3800 },
  solved: { text: 'you solved it!', mark: 'stickers', life: 9000 },
};
const STICKERS = ['#f3eee4', '#ffcf1f', '#12a153', '#1b5fd1', '#de2a2b', '#ff7b16'];
const NS = 'http://www.w3.org/2000/svg';
const SAYS = {
  play: { text: 'play with me?', small: 'click a face · shift turns it back', life: 6500 },
  slow: { text: 'is the page slow? hide me :(', small: null, life: 12000, button: 'hide the cube' },
};

// a crown, scribbled in one go, with a little flourish under it
const CROWN = 'M8 36 L4 10 L22 24 L40 4 L58 24 L76 10 L72 36 Z M12 42 C 30 38, 50 38, 70 42';
const ARROW = 'M6 34 C 30 30, 52 22, 70 8 M58 7 L71 7 L68 20';

export function createNotes(host) {
  let el = null;
  let timer = 0;

  function show(kind, cube) {
    const n = NOTES[kind];
    if (!n || !host || !cube.seen) return;
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

  /** Keep a showing note pinned to the cube as it moves (and out of sight when it is). */
  function follow(cube) {
    if (bubble) {
      bubble.style.setProperty('--cx', `${cube.x.toFixed(1)}px`);
      bubble.style.setProperty('--cy', `${cube.y.toFixed(1)}px`);
      bubble.style.setProperty('--cr', `${cube.r.toFixed(1)}px`);
      bubble.classList.toggle('is-hidden', !cube.seen);
    }
    if (!el) return;
    el.classList.toggle('is-hidden', !cube.seen);
    el.style.setProperty('--cx', `${cube.x.toFixed(1)}px`);
    el.style.setProperty('--cy', `${cube.y.toFixed(1)}px`);
    el.style.setProperty('--cr', `${cube.r.toFixed(1)}px`);
  }

  // motion lines: one fixed layer over the page, a few short-lived strokes at a time
  let lines = null;
  let live = 0;
  /**
   * Strokes round the cube where a layer is turning. rim: from view.rim() —
   * points just outside the turning layer and the way it moves there.
   * bold: a twist you made (thicker, a second stroke beside each).
   */
  function swoosh(cube, rim, bold = false) {
    if (!host || prefs.reduced || !cube.seen || live > 8) return;
    if (!lines) {
      lines = document.createElementNS(NS, 'svg');
      lines.setAttribute('class', 'cube-lines');
      lines.setAttribute('aria-hidden', 'true');
      host.appendChild(lines);
    }
    const ground = groundAt(cube.y);
    const [cx, cy] = rim.centre;
    const out = cube.r * 1.12; // never on the cube: just outside its outline
    const L = cube.r * (bold ? 0.62 : 0.46);
    for (const p of rim.pts) {
      // pushed out past the cube, along the line from its centre
      let ox = p.x - cx;
      let oy = p.y - cy;
      const d = Math.hypot(ox, oy) || 1;
      ox /= d;
      oy /= d;
      const at = Math.max(d, out);
      const x = cx + ox * at;
      const y = cy + oy * at;
      // a stroke trailing behind the moving rim, bowed round the cube
      const strokes = bold ? [0, 1] : [0];
      for (const k of strokes) {
        const off = k * 9;
        const len = L * (1 - k * 0.3);
        const sx = x + ox * off - p.dx * len;
        const sy = y + oy * off - p.dy * len;
        const mx = x + ox * (off + len * 0.22) - p.dx * len * 0.5;
        const my = y + oy * (off + len * 0.22) - p.dy * len * 0.5;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x + ox * off).toFixed(1)} ${(y + oy * off).toFixed(1)}`);
        path.setAttribute('pathLength', '1');
        path.setAttribute('class', `cl${bold ? ' is-bold' : ''}${k ? ' is-thin' : ''}`);
        path.dataset.ground = ground;
        lines.appendChild(path);
        live++;
        const a = path.animate(
          [
            { strokeDashoffset: 1, opacity: 1 },
            { strokeDashoffset: 0, opacity: 1, offset: 0.45 },
            { strokeDashoffset: -1, opacity: 0.2 },
          ],
          { duration: bold ? 460 : 340, delay: k * 50, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'backwards' }
        );
        a.onfinish = () => {
          path.remove();
          live--;
        };
      }
    }
  }

  // the cube's speech bubble
  let bubble = null;
  let bubbleKind = '';
  let bubbleT = 0;
  let onButton = null;
  function say(kind, cube, onClick = null) {
    const n = SAYS[kind];
    if (!n || !host) return;
    hush();
    bubbleKind = kind;
    bubble = document.createElement('div');
    bubble.className = `cube-say cube-say--${kind}`;
    bubble.dataset.ground = groundAt(cube.y);
    bubble.classList.toggle('is-left', cube.x > document.documentElement.clientWidth / 2);
    bubble.setAttribute('role', 'status');
    bubble.innerHTML = `<p class="cube-say-text"></p>${n.small ? '<p class="cube-say-small"></p>' : ''}${n.button ? '<span class="cube-say-row"><button type="button" class="cube-say-btn"></button><button type="button" class="cube-say-no">nah, stay</button></span>' : ''}`;
    bubble.querySelector('.cube-say-text').textContent = n.text;
    if (n.small) bubble.querySelector('.cube-say-small').textContent = n.small;
    if (n.button) {
      const btn = bubble.querySelector('.cube-say-btn');
      btn.textContent = n.button;
      onButton = () => {
        onClick?.();
        hush();
      };
      btn.addEventListener('click', onButton);
      bubble.querySelector('.cube-say-no').addEventListener('click', hush);
    }
    follow(cube);
    host.appendChild(bubble);
    requestAnimationFrame(() => bubble?.classList.add('is-on'));
    bubbleT = setTimeout(hush, n.life);
  }
  function hush() {
    clearTimeout(bubbleT);
    const b = bubble;
    bubble = null;
    if (!b) return;
    b.classList.remove('is-on');
    b.classList.add('is-off');
    setTimeout(() => b.remove(), 400);
  }

  const hushIf = (kind) => bubble && bubbleKind === kind && hush();

  return { show, follow, swoosh, say, hush, hushIf, dispose: () => (el?.remove(), lines?.remove(), bubble?.remove()) };
}
