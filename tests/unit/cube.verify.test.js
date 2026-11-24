// Port of docs/cube/verify.py as a unit test for the site's cube engine.
// Every assertion in verify.py is repeated here against CubeState, and a
// line-by-line JS copy of verify.py's own sticker model is used as an
// independent reference after every single move.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CubeState, formatMoves, invertMove, parseMoves } from '../../src/cube/model';
import { SCRAMBLE, SOLVE, STAGES, TOTAL_MOVES, SECTION_MOVES, SECTION_ORDER } from '../../src/cube/solve';

// Read the file directly as well, so the test fails if solve.js ever stops using it.
const d = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/cube/solve.json', import.meta.url)), 'utf8'));

// ---------- verify.py, transcribed ----------
// AX={'R':(0,1),'L':(0,-1),'U':(1,1),'D':(1,-1),'F':(2,1),'B':(2,-1)}
const AX = { R: [0, 1], L: [0, -1], U: [1, 1], D: [1, -1], F: [2, 1], B: [2, -1] };
const NORM = { R: [1, 0, 0], L: [-1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] };
const COL = { U: 'Y', D: 'W', F: 'G', B: 'B', R: 'R', L: 'O' };
const key = (p, n) => `${p[0]},${p[1]},${p[2]}|${n[0]},${n[1]},${n[2]}`;
const unkey = (k) => k.split('|').map((s) => s.split(',').map(Number));

function rot(v, a, s) {
  const [x, y, z] = v;
  return a === 0 ? [x, -s * z, s * y] : a === 1 ? [s * z, y, -s * x] : [-s * y, s * x, z];
}
function refSolved() {
  const st = new Map();
  for (const x of [-1, 0, 1])
    for (const y of [-1, 0, 1])
      for (const z of [-1, 0, 1])
        for (const [f, n] of Object.entries(NORM)) {
          const p = [x, y, z];
          if ([0, 1, 2].some((i) => p[i] === n[i] && n[i] !== 0)) st.set(key(p, n), COL[f]);
        }
  return st;
}
function refMove(st, m) {
  const [a, side] = AX[m[0]];
  const times = { '': 1, "'": 3, '2': 2 }[m.slice(1)];
  for (let t = 0; t < times; t++) {
    const next = new Map();
    for (const [k, c] of st) {
      const [p, n] = unkey(k);
      next.set(p[a] === side ? key(rot(p, a, -side), rot(n, a, -side)) : k, c);
    }
    st = next;
  }
  return st;
}
const refApply = (st, seq) => seq.trim().split(/\s+/).reduce(refMove, st);
const sameAsRef = (cube, ref) => {
  const s = cube.stickers();
  return s.size === ref.size && [...ref].every(([k, v]) => s.get(k) === v);
};

// ---------- verify.py's checks on the engine ----------
const S0 = CubeState.solved();
const S0map = S0.stickers();
const ok = (st, ps) => {
  const m = st.stickers();
  const want = new Set(ps.map((p) => p.join(',')));
  return [...S0map].filter(([k]) => want.has(k.split('|')[0])).every(([k, v]) => m.get(k) === v);
};
const CROSS = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]];
const TOP = [[0, 1, 1], [1, 1, 0], [0, 1, -1], [-1, 1, 0]];
const SLOT = {
  FR: [[1, -1, 1], [1, 0, 1]],
  RB: [[1, -1, -1], [1, 0, -1]],
  BL: [[-1, -1, -1], [-1, 0, -1]],
  LF: [[-1, -1, 1], [-1, 0, 1]],
};
const apply = (st, seq) => st.clone().applyAll(parseMoves(seq));

describe('cube engine passes docs/cube/verify.py', () => {
  it("sanity: (R U R' U')×6 is the identity, and R lifts green onto U", () => {
    // assert apply(S0,"R U R' U' "*6)==S0 and apply(S0,"R")[((1,1,1),(0,1,0))]=='G'
    expect(apply(S0, "R U R' U' ".repeat(6)).equals(S0)).toBe(true);
    expect(apply(S0, 'R').stickerAt([1, 1, 1], [0, 1, 0])).toBe('G');
  });

  it('the scramble leaves the cross unsolved', () => {
    expect(ok(apply(S0, d.scramble), CROSS)).toBe(false);
  });

  it('every stage holds: cross, F2L slots in order, top cross, top face, solved', () => {
    let st = apply(S0, d.scramble);
    const done = [];
    d.stages.forEach((s, i) => {
      st = apply(st, s.moves);
      const c = s.caption;
      expect(ok(st, CROSS), c).toBe(true);
      if (c.startsWith('pair')) done.push(d.slot_order[Number(c.at(-1)) - 1]);
      for (const [k, v] of Object.entries(SLOT)) expect(ok(st, v), `${c} ${k}`).toBe(done.includes(k) || i > 4);
      if (c === 'top cross') {
        for (const p of TOP) expect(st.stickerAt(p, [0, 1, 0]), `${c} ${p}`).toBe('Y');
        expect(st.facelets('U'), c).not.toBe('YYYYYYYYY');
      }
      if (c === 'top face') {
        const m = st.stickers();
        for (const [k, col] of m) if (k.endsWith('|0,1,0')) expect(col, k).toBe('Y');
        expect(st.isSolved(), c).toBe(false);
      }
      expect(parseMoves(s.moves).length, c).toBe(s.count);
    });
    expect(st.equals(S0)).toBe(true);
    expect(st.isSolved()).toBe(true);
    expect(d.stages.reduce((n, s) => n + s.count, 0)).toBe(d.total_moves);
  });
});

describe('cube engine matches the verify.py model move by move', () => {
  it('after every scramble and solve move', () => {
    const cube = CubeState.solved();
    let ref = refSolved();
    expect(sameAsRef(cube, ref)).toBe(true);
    const tokens = `${d.scramble} ${d.stages.map((s) => s.moves).join(' ')}`.split(/\s+/);
    expect(tokens.length).toBe(d.scramble_length + d.total_moves);
    tokens.forEach((t, i) => {
      cube.applyAll(parseMoves(t));
      ref = refMove(ref, t);
      expect(sameAsRef(cube, ref), `move ${i + 1}: ${t}`).toBe(true);
    });
  });

  it('every face, every turn, from the solved cube', () => {
    for (const f of ['U', 'D', 'F', 'B', 'R', 'L'])
      for (const suffix of ['', "'", '2']) {
        const m = f + suffix;
        expect(sameAsRef(apply(S0, m), refApply(refSolved(), m)), m).toBe(true);
      }
  });
});

describe('solve data as the site uses it', () => {
  it('start state equals start_state_faces_UDFBRL (standard facelet order)', () => {
    const st = CubeState.solved().applyAll(SCRAMBLE);
    for (const f of ['U', 'D', 'F', 'B', 'R', 'L']) expect(st.facelets(f), f).toBe(d.start_state_faces_UDFBRL[f]);
  });

  it('solve.js reads the same scramble and stages', () => {
    expect(formatMoves(SCRAMBLE)).toBe(d.scramble);
    expect(SCRAMBLE.length).toBe(d.scramble_length);
    expect(SOLVE.length).toBe(TOTAL_MOVES);
    expect(TOTAL_MOVES).toBe(44);
    STAGES.forEach((s, i) => expect(formatMoves(s.moves)).toBe(d.stages[i].moves));
    expect(STAGES.map((s) => s.end)).toEqual([5, 9, 13, 16, 20, 26, 33, 44]);
  });

  it('sections reach the stages in docs/REVAMP.md §2', () => {
    expect(SECTION_MOVES).toEqual({ hero: 0, about: 5, skills: 13, projects: 20, experience: 26, writing: 33, contact: 44 });
    expect(Object.keys(SECTION_MOVES)).toEqual(SECTION_ORDER);
    const at = (section) => CubeState.solved().applyAll(SCRAMBLE).applyAll(SOLVE.slice(0, SECTION_MOVES[section]));
    expect(ok(at('hero'), CROSS)).toBe(false);
    expect(ok(at('about'), CROSS)).toBe(true);
    expect([SLOT.FR, SLOT.RB].every((v) => ok(at('skills'), v))).toBe(true);
    expect([SLOT.BL, SLOT.LF].some((v) => ok(at('skills'), v))).toBe(false);
    expect(Object.values(SLOT).every((v) => ok(at('projects'), v))).toBe(true);
    expect(at('projects').isSolved()).toBe(false);
    expect(at('writing').facelets('U')).toBe('YYYYYYYYY');
    expect(at('writing').isSolved()).toBe(false);
    expect(at('contact').isSolved()).toBe(true);
  });

  it('scrolling back: each inverse move restores the previous state, down to the scramble', () => {
    const cube = CubeState.solved().applyAll(SCRAMBLE);
    const history = [cube.clone()];
    for (const m of SOLVE) history.push(cube.apply(m).clone());
    for (let k = SOLVE.length; k > 0; k--) {
      cube.apply(invertMove(SOLVE[k - 1]));
      expect(cube.equals(history[k - 1]), `back to ${k - 1}`).toBe(true);
    }
  });
});

describe('what the cube knows about itself', () => {
  // a fixed pseudo-random walk, so the test is the same every run
  const walk = (n, seed) => {
    const faces = ['U', 'D', 'F', 'B', 'R', 'L'];
    const out = [];
    let x = seed;
    for (let i = 0; i < n; i++) {
      x = (x * 1103515245 + 12345) % 2147483648;
      out.push({ face: faces[x % 6], turns: 1 + ((x >> 8) % 3) });
    }
    return out;
  };

  it('isSolved() says the same as comparing every sticker with the solved cube', () => {
    for (let seed = 1; seed < 40; seed++) {
      const ms = walk(seed % 7, seed);
      const st = CubeState.solved().applyAll(ms);
      expect(st.isSolved(), ms.map((m) => m.face + m.turns).join(' ')).toBe(st.equals(S0));
    }
    // there and back again: solved, though the centres have spun on the way
    for (let seed = 1; seed < 20; seed++) {
      const ms = walk(12, seed);
      const st = CubeState.solved().applyAll(ms);
      expect(st.isSolved()).toBe(st.equals(S0));
      expect(st.applyAll(ms.slice().reverse().map(invertMove)).isSolved()).toBe(true);
    }
    expect(apply(S0, "R U R' U' ".repeat(6)).isSolved()).toBe(true);
    expect(apply(S0, 'U').isSolved()).toBe(false);
    expect(apply(S0, 'U U U U').isSolved()).toBe(true);
  });

  it('firstTwoLayers(): from pair 4 on, and not before; never once you twist under the top', () => {
    const start = CubeState.solved().applyAll(SCRAMBLE);
    for (let k = 0; k <= SOLVE.length; k++) {
      const st = start.clone().applyAll(SOLVE.slice(0, k));
      const f2l = [...Object.values(SLOT), CROSS].every((ps) => ok(st, ps));
      expect(st.firstTwoLayers(), `after ${k} moves`).toBe(f2l);
    }
    const layers = start.clone().applyAll(SOLVE.slice(0, STAGES[4].end));
    expect(layers.firstTwoLayers()).toBe(true);
    expect(layers.clone().applyAll(parseMoves('U')).firstTwoLayers()).toBe(true); // the top doesn't matter
    expect(layers.clone().applyAll(parseMoves('R')).firstTwoLayers()).toBe(false);
    expect(start.firstTwoLayers()).toBe(false);
  });
});
