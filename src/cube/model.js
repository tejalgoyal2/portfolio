// Logical Rubik's cube. Pure, exact (integer maths), no rendering.
// Axes match docs/cube/verify.py and three.js: x = R, y = U, z = F.
// A face turn is clockwise as seen looking at that face from outside.
//
// Types, for reference:
//   Face   'U' | 'D' | 'F' | 'B' | 'R' | 'L'
//   Colour 'Y' | 'W' | 'G' | 'B' | 'R' | 'O'
//   Vec3   [x, y, z]            Mat3  row-major 3×3 integer rotation (9 numbers)
//   Move   { face, turns }      turns: 1 = clockwise quarter, 2 = half, 3 = anticlockwise quarter

export const FACES = ['U', 'D', 'F', 'B', 'R', 'L'];

export const FACE_AXIS = {
  R: { axis: 0, side: 1 },
  L: { axis: 0, side: -1 },
  U: { axis: 1, side: 1 },
  D: { axis: 1, side: -1 },
  F: { axis: 2, side: 1 },
  B: { axis: 2, side: -1 },
};

export const FACE_NORMAL = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/** White on D, yellow on U, green F, red R, orange L, blue B. */
export const FACE_COLOUR = {
  U: 'Y',
  D: 'W',
  F: 'G',
  B: 'B',
  R: 'R',
  L: 'O',
};

const SUFFIX_TURNS = { '': 1, '2': 2, "'": 3 };
const TURNS_SUFFIX = { 1: '', 2: '2', 3: "'" };

export function parseMove(token) {
  const face = token[0];
  const turns = SUFFIX_TURNS[token.slice(1)];
  if (!FACE_AXIS[face] || turns === undefined) throw new Error(`Bad move "${token}"`);
  return { face, turns };
}

export function parseMoves(sequence) {
  return sequence.trim().split(/\s+/).filter(Boolean).map(parseMove);
}

export function formatMove(m) {
  return m.face + TURNS_SUFFIX[m.turns];
}

export function formatMoves(ms) {
  return ms.map(formatMove).join(' ');
}

export function invertMove(m) {
  return { face: m.face, turns: m.turns === 2 ? 2 : m.turns === 1 ? 3 : 1 };
}

export function invertSequence(ms) {
  return ms.slice().reverse().map(invertMove);
}

/** Signed quarter turns about the +axis (right-handed) that a move makes. */
export function moveQuarterTurns(m) {
  const { side } = FACE_AXIS[m.face];
  const q = m.turns === 3 ? -1 : m.turns;
  return -side * q;
}

export function faceOfNormal(n) {
  for (const f of FACES) {
    const v = FACE_NORMAL[f];
    if (v[0] === n[0] && v[1] === n[1] && v[2] === n[2]) return f;
  }
  return null;
}

// ---------- integer matrix helpers ----------

export const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Rotation by +90°·s about `axis`; identical to rot(v, a, s) in verify.py. */
export function quarter(axis, s) {
  if (axis === 0) return [1, 0, 0, 0, 0, -s, 0, s, 0];
  if (axis === 1) return [0, 0, s, 0, 1, 0, -s, 0, 0];
  return [0, -s, 0, s, 0, 0, 0, 0, 1];
}

export function mulMat(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

export function mulVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// ---------- the cube ----------
// Cubie      { id, home: Vec3 (solved position; decides sticker colours), pos: Vec3, rot: Mat3 }
// StickerRef { id, cubie, homeNormal: Vec3 (outward normal when solved), colour }

const COORDS = [-1, 0, 1];

// An edge or a corner looks solved only when it's home and not turned at all; a
// centre (or the core) only ever spins in place, which no sticker shows.
const settled = (c) =>
  c.home.filter((v) => v !== 0).length < 2 ||
  (c.pos[0] === c.home[0] && c.pos[1] === c.home[1] && c.pos[2] === c.home[2] && c.rot.every((v, i) => v === IDENTITY[i]));

function buildCubies() {
  const out = [];
  for (const x of COORDS)
    for (const y of COORDS)
      for (const z of COORDS) out.push({ id: out.length, home: [x, y, z], pos: [x, y, z], rot: IDENTITY });
  return out;
}

/** The 54 stickers, in a fixed order the renderer instances against. */
export const STICKERS = (() => {
  const list = [];
  buildCubies().forEach((c) => {
    for (const f of FACES) {
      const { axis, side } = FACE_AXIS[f];
      if (c.home[axis] === side)
        list.push({ id: list.length, cubie: c.id, homeNormal: FACE_NORMAL[f], colour: FACE_COLOUR[f] });
    }
  });
  return list;
})();

export const stickerKey = (p, n) => `${p[0]},${p[1]},${p[2]}|${n[0]},${n[1]},${n[2]}`;

export class CubeState {
  constructor(cubies) {
    this.cubies = cubies;
  }

  static solved() {
    return new CubeState(buildCubies());
  }

  clone() {
    return new CubeState(this.cubies.map((c) => ({ ...c })));
  }

  /** Ids of the cubies currently in a face's layer. */
  layer(face) {
    const { axis, side } = FACE_AXIS[face];
    return this.cubies.filter((c) => c.pos[axis] === side).map((c) => c.id);
  }

  apply(m) {
    const { axis, side } = FACE_AXIS[m.face];
    const q = moveQuarterTurns(m);
    let r = quarter(axis, q < 0 ? -1 : 1);
    if (Math.abs(q) === 2) r = mulMat(r, r);
    for (const c of this.cubies) {
      if (c.pos[axis] !== side) continue;
      c.pos = mulVec(r, c.pos);
      c.rot = mulMat(r, c.rot);
    }
    return this;
  }

  applyAll(ms) {
    for (const m of ms) this.apply(m);
    return this;
  }

  /** Current position and outward normal of a sticker. */
  stickerPose(s) {
    const c = this.cubies[s.cubie];
    return { pos: c.pos, normal: mulVec(c.rot, s.homeNormal) };
  }

  /** Face a sticker currently lies on. */
  stickerFace(s) {
    return faceOfNormal(this.stickerPose(s).normal);
  }

  /** (position, normal) → colour for all 54 stickers; the same view verify.py checks. */
  stickers() {
    const map = new Map();
    for (const s of STICKERS) {
      const { pos, normal } = this.stickerPose(s);
      map.set(stickerKey(pos, normal), s.colour);
    }
    return map;
  }

  stickerAt(pos, normal) {
    return this.stickers().get(stickerKey(pos, normal));
  }

  /**
   * One face's 9 colours in standard facelet order: the face seen from outside,
   * rows top to bottom, columns left to right (U has B at the top, D has F at the top).
   */
  facelets(face) {
    const VIEW = {
      U: [[0, 0, -1], [1, 0, 0]],
      D: [[0, 0, 1], [1, 0, 0]],
      F: [[0, 1, 0], [1, 0, 0]],
      B: [[0, 1, 0], [-1, 0, 0]],
      R: [[0, 1, 0], [0, 0, -1]],
      L: [[0, 1, 0], [0, 0, 1]],
    };
    const [up, right] = VIEW[face];
    const n = FACE_NORMAL[face];
    const map = this.stickers();
    let out = '';
    for (const r of [1, 0, -1])
      for (const c of [-1, 0, 1]) {
        const p = [n[0] + up[0] * r + right[0] * c, n[1] + up[1] * r + right[1] * c, n[2] + up[2] * r + right[2] * c];
        out += map.get(stickerKey(p, n)) ?? '?';
      }
    return out;
  }

  equals(other) {
    const a = this.stickers();
    const b = other.stickers();
    for (const [k, v] of a) if (b.get(k) !== v) return false;
    return true;
  }

  /** Every sticker on its own face (the same as equals(solved()), without building the sticker maps). */
  isSolved() {
    return this.cubies.every(settled);
  }

  /** The first two layers are done: the cross and all four F2L pairs (everything below the U layer). */
  firstTwoLayers() {
    return this.cubies.every((c) => c.home[1] === 1 || settled(c));
  }
}
