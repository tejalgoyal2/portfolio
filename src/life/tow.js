/**
 * The banner tow over Writing: a little line-drawn prop plane (the same hand
 * as the car and the van, src/life/car.js) flying right to left with a cloth
 * banner on a rope behind it, and the first clipping tied on behind that, so
 * the posts come onto the spread pulled in by the plane. Blog.jsx flies it
 * (where the plane is, where the first card is); this only draws.
 *
 * One SVG layer over the strip, in CSS px. The plane bobs and its propeller
 * spins, the banner ripples from its leading edge back, the ropes sag. When
 * the plane lets go, the card's rope drops away and trails off with it.
 * Transforms and attributes on a handful of nodes; nothing else on the page.
 *
 *   const tow = createTow(host, { small })
 *   tow.draw({ x, y, cardX, cardY, unhook, t })  // x, y: the plane's tail
 *   tow.size  // { plane, rope, banner, tail, len } in px; len: tail to card
 *   tow.hide(); tow.destroy()
 */
const NS = 'http://www.w3.org/2000/svg';

// facing right in its own units (nose at x 86, tail hook at x 2, y 23); drawn mirrored
const PLANE = `
  <path class="tow-wing" d="M30 8H62Q65 8 65 10Q65 12 62 12H30Q27 12 27 10Q27 8 30 8Z"/>
  <path class="tow-strut" d="M37 12V20M56 12V20"/>
  <path class="tow-shell" d="M8 22L3.5 7.6Q3.4 5.6 5.6 6.2L19 15.6H62Q75 15.6 82.5 20Q86 22.5 82.5 25Q75 28.6 62 28.6H18Q9 28.6 6.4 25Z"/>
  <path class="tow-glass" d="M47 15.6Q49 10.4 55 10.4L58.6 15.6Z"/>
  <path class="tow-stripe" d="M15 22.4H74"/>
  <path class="tow-wing" d="M33 20.4H60Q63 20.4 63 23Q63 25.6 60 25.6H33Q30 25.6 30 23Q30 20.4 33 20.4Z"/>
  <path class="tow-strut" d="M47 28.6L44.6 34"/>
  <circle class="tow-wheel" cx="44" cy="35.4" r="2.8"/>
  <circle class="tow-hub" cx="86.2" cy="22.4" r="2.2"/>
  <ellipse class="tow-prop" cx="87.6" cy="22.4" rx="1.3" ry="10"/>`;
const PLANE_W = 90;

export function createTow(host, { small = false } = {}) {
  const k = small ? 0.9 : 1.35; // the plane's scale
  const size = {
    plane: PLANE_W * k,
    rope: small ? 22 : 34, // tail to banner
    banner: small ? 160 : 260,
    tail: small ? 64 : 110, // banner to card
    h: small ? 30 : 42,
  };
  size.len = size.rope + size.banner + size.tail;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'tow');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <path class="tow-rope" data-r="1"/>
    <path class="tow-rope" data-r="2"/>
    <path class="tow-banner"/>
    <text class="tow-words" text-anchor="middle" dominant-baseline="central" font-size="${small ? 15 : 21}">READ ALL ABOUT IT</text>
    <g class="tow-plane"><g transform="scale(${-k} ${k})">${PLANE}</g></g>`;
  host.appendChild(svg);
  const rope1 = svg.querySelector('[data-r="1"]');
  const rope2 = svg.querySelector('[data-r="2"]');
  const cloth = svg.querySelector('.tow-banner');
  const words = svg.querySelector('.tow-words');
  const plane = svg.querySelector('.tow-plane');
  const prop = svg.querySelector('.tow-prop');

  const f = (n) => n.toFixed(1);
  let shown = false;

  /** x, y: where the plane's tail hook is; cardX/Y: the card's corner; unhook 0..1 as it lets go. */
  function draw({ x, y, cardX, cardY, unhook = 0, t }) {
    if (!shown) {
      svg.classList.add('is-on');
      shown = true;
    }
    const pitch = Math.sin(t * 2.3) * 2.2;
    // the drawing's tail hook is at (2, 23) in its own units; mirrored, it sits at -2k
    plane.setAttribute('transform', `translate(${f(x + 2 * k)} ${f(y - 23 * k)}) rotate(${pitch.toFixed(2)} ${f(-2 * k)} ${f(23 * k)})`);
    prop.setAttribute('ry', (10 * Math.abs(Math.cos(t * 41))).toFixed(2));

    // the banner, rippling from its leading edge (on the left) back
    const bx = x + size.rope;
    const by = y + 3 + Math.sin(t * 2.3 - 0.6) * 2;
    const h = size.h;
    const N = 10;
    const top = [];
    const bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const px = bx + u * size.banner;
      const amp = 1.2 + u * 3.6;
      const w = Math.sin(t * 7.5 - u * 6.5) * amp;
      top.push(`${f(px)} ${f(by - h / 2 + w)}`);
      bot.push(`${f(px)} ${f(by + h / 2 + w * 0.8)}`);
    }
    cloth.setAttribute('d', `M${top.join('L')}L${bot.reverse().join('L')}Z`);
    const mid = Math.sin(t * 7.5 - 3.25) * 2.6;
    words.setAttribute('x', f(bx + size.banner / 2));
    words.setAttribute('y', f(by + mid));
    words.setAttribute('transform', `rotate(${(Math.cos(t * 7.5 - 3.25) * 1.2).toFixed(2)} ${f(bx + size.banner / 2)} ${f(by)})`);

    // the ropes: a little sag each
    rope1.setAttribute('d', `M${f(x)} ${f(y)}Q${f(x + size.rope / 2)} ${f(y + 5)} ${f(bx)} ${f(by - h / 2 + 4)}`);
    const ex = bx + size.banner;
    const ey = by + Math.sin(t * 7.5 - 6.5) * 4.8;
    // once it lets go the card end falls away and trails behind the banner
    const tx = cardX + (ex + 26 - cardX) * unhook;
    const ty = cardY + (ey + 54 - cardY) * unhook;
    const sag = 10 + 18 * unhook;
    rope2.setAttribute('d', `M${f(ex)} ${f(ey)}Q${f((ex + tx) / 2)} ${f(Math.max(ey, ty) + sag)} ${f(tx)} ${f(ty)}`);
    rope2.style.opacity = (1 - unhook * 0.85).toFixed(2);
  }

  return {
    size,
    draw,
    hide() {
      svg.classList.remove('is-on');
      shown = false;
    },
    destroy() {
      svg.remove();
    },
  };
}
