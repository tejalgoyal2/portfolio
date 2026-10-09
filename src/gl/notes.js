import { prefs } from '../life/prefs';
import { groundAt } from '../life/ground';

/**
 * The editor's notes on the cube: when the solve reaches a milestone, a pen
 * note is scribbled beside it — "two layers done" with a quick arrow, and for
 * the solve itself "solved it!" with the cube ringed in red pen, and a splash
 * of pencil icons thrown up from it. The arrow and the ring draw themselves on
 * like a pen stroke; the words write in letter by letter; the whole note
 * fades after a few seconds. It sits on the side of the cube with more room,
 * and is inked for the ground it lands on.
 */
const NOTES = {
  layers: { text: 'two layers done', mark: 'arrow' },
  solved: { text: 'solved it!', mark: 'ring' },
};
const LIFE = 3800;

const ARROW = 'M6 34 C 30 30, 52 22, 70 8 M58 7 L71 7 L68 20';
const RING = 'M100 8 C 150 4, 192 40, 186 98 C 180 160, 120 194, 64 180 C 16 168, 2 112, 18 64 C 30 30, 70 10, 112 12';

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
    if (n.mark === 'ring') {
      const s = cube.r * 2.5;
      el.innerHTML = `<svg class="cube-note-ring" viewBox="0 0 200 200" style="width:${s}px;height:${s}px"><path d="${RING}" pathLength="1"/></svg><p class="cube-note-text">${letters}</p>`;
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
    }, LIFE);
    if (kind === 'solved' && !prefs.reduced) {
      // a little celebration: a splash of pencil icons from the cube
      window.dispatchEvent(new CustomEvent('life:burst', { detail: { x: cube.x, y: cube.y - cube.r * 0.4, amount: 0.55 } }));
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
