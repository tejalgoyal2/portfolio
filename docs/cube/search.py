# Finds the staged solve in solve.json. Run: python3 -I search.py [--write]
# (the defaults reproduce the one in the repo: SEED=1123 TRIES=200000 LO=43 HI=46 PICK=3;
# it lists every candidate that passed, and --write saves the picked one)
#
# Built backwards from the solved cube, the way the old one was: a standard last layer
# (2-look OLL: an edge-flip and a Sune, then an A/U/J perm, with AUFs), four F2L inserts
# made only of U and that slot's own two faces, and a cross. The scramble is the
# inverse of the whole solve. Then every stage has to earn its place:
# - the cross is optimal, and each pair is optimal (no shorter sequence of any face
#   turns does that stage), and no other pair could have gone in quicker;
# - nothing is done before its stage (the top cross isn't already there, and so on);
# - no face turn cancels or merges with its neighbour, across stage lines too;
# - and the start looks like a real scramble: about as many stickers on their own
#   face as chance would put there, no bars, no blocks, no pieces home.
# Same sticker model and axes as verify.py.
import json, itertools, os, random, sys
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
AX = {'R': (0, 1), 'L': (0, -1), 'U': (1, 1), 'D': (1, -1), 'F': (2, 1), 'B': (2, -1)}
NORM = {'R': (1, 0, 0), 'L': (-1, 0, 0), 'U': (0, 1, 0), 'D': (0, -1, 0), 'F': (0, 0, 1), 'B': (0, 0, -1)}
COL = {'U': 'Y', 'D': 'W', 'F': 'G', 'B': 'B', 'R': 'R', 'L': 'O'}
OPP = {'U': 'D', 'D': 'U', 'F': 'B', 'B': 'F', 'R': 'L', 'L': 'R'}
MOVES = [f + s for f in 'UDFBRL' for s in ('', "'", '2')]


def rot(v, a, s):
    x, y, z = v
    return (x, -s * z, s * y) if a == 0 else (s * z, y, -s * x) if a == 1 else (-s * y, s * x, z)


SOLVED = {((x, y, z), n): COL[f] for x, y, z in itertools.product((-1, 0, 1), repeat=3) for f, n in NORM.items()
          if any((x, y, z)[i] == n[i] != 0 for i in range(3))}
KEYS = sorted(SOLVED)
IDX = {k: i for i, k in enumerate(KEYS)}
HOME = [SOLVED[k] for k in KEYS]


def turned(k, m):
    (p, n), (a, side) = k, AX[m[0]]
    for _ in range({'': 1, "'": 3, '2': 2}[m[1:]]):
        if p[a] == side:
            p, n = rot(p, a, -side), rot(n, a, -side)
    return p, n


# GO[m][i]: where the sticker at location i ends up after m
GO = {m: tuple(IDX[turned(k, m)] for k in KEYS) for m in MOVES}


def go(seq):
    g = list(range(54))
    for m in seq:
        gm = GO[m]
        g = [gm[x] for x in g]
    return g


def apply(loc, seq):
    g = go(seq)
    return [g[x] for x in loc]


def inverse(seq):
    return [m[0] + {'': "'", "'": '', '2': '2'}[m[1:]] for m in reversed(seq)]


def colours(loc):
    c = [None] * 54
    for i, x in enumerate(loc):
        c[x] = HOME[i]
    return c


CROSS = [(0, -1, 1), (1, -1, 0), (0, -1, -1), (-1, -1, 0)]
SLOT = {'FR': [(1, -1, 1), (1, 0, 1)], 'RB': [(1, -1, -1), (1, 0, -1)],
        'BL': [(-1, -1, -1), (-1, 0, -1)], 'LF': [(-1, -1, 1), (-1, 0, 1)]}
at = lambda ps: [i for i, (p, n) in enumerate(KEYS) if p in ps]
CROSS_ST = at(CROSS)
SLOT_ST = {s: at(ps) for s, ps in SLOT.items()}
home = lambda loc, idx: all(loc[i] == i for i in idx)
U_EDGES = [IDX[(p, (0, 1, 0))] for p in [(0, 1, 1), (1, 1, 0), (0, 1, -1), (-1, 1, 0)]]
U_ALL = [i for i, (p, n) in enumerate(KEYS) if n == (0, 1, 0)]
top_cross = lambda loc: all(colours(loc)[i] == 'Y' for i in U_EDGES)
top_face = lambda loc: all(colours(loc)[i] == 'Y' for i in U_ALL)


# ---------- distance tables: the cross (190 080 states) and each pair (576) ----------
def bfs(start):
    dist, q = {start: 0}, deque([start])
    while q:
        s = q.popleft()
        d = dist[s] + 1
        for m in MOVES:
            g = GO[m]
            t = tuple(g[x] for x in s)
            if t not in dist:
                dist[t] = d
                q.append(t)
    return dist


CROSS_W = tuple(IDX[(p, (0, -1, 0))] for p in CROSS)  # the white sticker of each cross edge
PAIR_ID = {s: (IDX[(c, (0, -1, 0))], IDX[(e, (e[0], 0, 0))]) for s, (c, e) in SLOT.items()}
DCROSS = bfs(CROSS_W)
DPAIR = {s: bfs(ids) for s, ids in PAIR_ID.items()}


def shortest(loc, slots, limit):
    """Fewest face turns (below `limit`) that leave the cross and these slots solved, else None."""
    track = list(CROSS_W) + [i for s in slots for i in PAIR_ID[s]]
    goal = tuple(track)
    tabs = [DPAIR[s] for s in slots]

    def h(s):
        return max([DCROSS[s[:4]]] + [t[s[4 + 2 * j:6 + 2 * j]] for j, t in enumerate(tabs)])

    def dfs(s, depth, last):
        if depth == 0:
            return s == goal
        if h(s) > depth:
            return False
        for m in MOVES:
            f = m[0]
            if f == last or (OPP[f] == last and f in 'UFR'):
                continue
            g = GO[m]
            if dfs(tuple(g[x] for x in s), depth - 1, f):
                return True
        return False

    start = tuple(loc[i] for i in track)
    for depth in range(h(start), limit):
        if dfs(start, depth, None):
            return depth
    return None


# ---------- the pieces it's built from ----------
EO = ["F R U R' U' F'", "F U R U' R' F'"]  # line, L
OCLL = ["R U R' U R U2 R'", "R U2 R' U' R U' R'"]  # Sune, Antisune
PLL = {
    'Aa': "R' F R' B2 R F' R' B2 R2",
    'Ab': "R2 B2 R F R' B2 R F' R",
    'Ua': "R U' R U R U R U' R' U' R2",
    'Ub': "R2 U R U R' U' R' U' R' U R'",
    'Ja': "R' U L' U2 R U' R' U2 R L",
}
AUF = ['', 'U', "U'", 'U2']
Y = {'F': 'R', 'R': 'B', 'B': 'L', 'L': 'F', 'U': 'U', 'D': 'D'}  # one slot round (y): FR → RB → BL → LF


def round_slots(m, n):
    """The same move made n slots round the cube (an FR insert, done at RB, BL or LF)."""
    f = m[0]
    for _ in range(n):
        f = Y[f]
    return f + m[1:]


def f2l_inserts(max_len=7):
    """F2L sequences for the FR slot: U, F and R only, keep the cross, end on the slot."""
    out = []

    def walk(seq, g, last):
        if seq and seq[-1][0] != 'U' and home(g, CROSS_ST) and not home(g, SLOT_ST['FR']):
            out.append(seq)
        if len(seq) == max_len:
            return
        for f in 'UFR':
            if f == last:
                continue
            for s in ('', "'", '2'):
                gm = GO[f + s]
                walk(seq + [f + s], [gm[x] for x in g], f)

    walk([], list(range(54)), None)
    return out


def canonical(seq):
    for i in range(1, len(seq)):
        if seq[i][0] == seq[i - 1][0]:
            return False
        if i > 1 and seq[i][0] == seq[i - 2][0] and OPP[seq[i][0]] == seq[i - 1][0]:
            return False
    return True


def grid(cols, face):
    view = {'U': ((0, 0, -1), (1, 0, 0)), 'D': ((0, 0, 1), (1, 0, 0)), 'F': ((0, 1, 0), (1, 0, 0)),
            'B': ((0, 1, 0), (-1, 0, 0)), 'R': ((0, 1, 0), (0, 0, -1)), 'L': ((0, 1, 0), (0, 0, 1))}
    up, right = view[face]
    n = NORM[face]
    return [[cols[IDX[(tuple(n[i] + up[i] * r + right[i] * c for i in range(3)), n)]] for c in (-1, 0, 1)]
            for r in (1, 0, -1)]


def looks(loc):
    """How scrambled the start looks: (stickers on their own face, matching neighbours, bars/blocks, pieces home)."""
    cols = colours(loc)
    own = adj = bad = 0
    for f in 'UDFBRL':
        g = grid(cols, f)
        own += sum(g[r][c] == g[1][1] for r in range(3) for c in range(3)) - 1
        adj += sum(g[r][c] == g[r][c + 1] for r in range(3) for c in range(2))
        adj += sum(g[r][c] == g[r + 1][c] for r in range(2) for c in range(3))
        bad += sum(len(set(row)) == 1 for row in g) + sum(len({g[r][c] for r in range(3)}) == 1 for c in range(3))
        bad += sum(len({g[r][c], g[r][c + 1], g[r + 1][c], g[r + 1][c + 1]}) == 1 for r in range(2) for c in range(2))
    pieces = {}
    for i, (p, n) in enumerate(KEYS):
        if p.count(0) < 2:
            pieces.setdefault(p, []).append(loc[i] == i)
    homed = sum(all(v) for v in pieces.values())
    return own, adj, bad, homed


def build(rng, inserts):
    """One candidate, built backwards from solved. Returns (stages, order, start loc) or None."""
    ll = [('top cross', (rng.choice(['', '', 'U', "U'", 'U2']) + ' ' + rng.choice(EO)).split()),
          ('top face', (rng.choice(AUF) + ' ' + rng.choice(OCLL)).split()),
          ('solved', (rng.choice(AUF) + ' ' + PLL[rng.choice(list(PLL))] + ' ' + rng.choice(AUF)).split())]
    loc = list(range(54))
    for _, moves in reversed(ll):
        loc = apply(loc, inverse(moves))
    order = rng.sample(list(SLOT), 4)
    pairs = [None] * 4
    for k in (3, 2, 1, 0):
        n = rng.choices([3, 4, 5, 6, 7], weights=[3, 4, 2, 2, 1])[0]
        pool = inserts.get((order[k], frozenset(order[:k]), n))
        if not pool:
            return None
        moves = rng.choice(pool)
        loc = apply(loc, inverse(moves))
        if any(home(loc, SLOT_ST[s]) for s in order[k:]):
            return None
        pairs[k] = moves
    after_cross = loc
    n = rng.choice([5, 6, 6, 7])
    cross = []
    while len(cross) < n:
        m = rng.choice(MOVES)
        if canonical(cross + [m]):
            cross.append(m)
    start = apply(after_cross, inverse(cross))
    if DCROSS[tuple(start[i] for i in CROSS_W)] != n:
        return None
    stages = [('cross', cross)] + [(f'pair {k + 1}', pairs[k]) for k in range(4)] + ll
    stages = [(c, [m for m in ms if m]) for c, ms in stages]
    if not canonical([m for _, ms in stages for m in ms]):
        return None
    return stages, order, start


def honest(stages, order, start):
    """Forward replay: each stage does exactly its job, and no less."""
    loc, done = start, []
    if home(loc, CROSS_ST):
        return False
    for i, (c, ms) in enumerate(stages):
        before = loc
        loc = apply(loc, ms)
        if not home(loc, CROSS_ST):
            return False
        if c.startswith('pair'):
            done.append(order[int(c[-1]) - 1])
        for s in SLOT:
            if home(loc, SLOT_ST[s]) != (s in done or i > 4):
                return False
        if c == 'top cross' and (top_cross(before) or not top_cross(loc) or top_face(loc)):
            return False
        if c == 'top face' and (not top_face(loc) or loc == list(range(54))):
            return False
    return loc == list(range(54))


def optimal(stages, order, start):
    """The cross and every pair optimal, and each pair the quickest one left to put in."""
    loc = apply(start, stages[0][1])
    for k in range(4):
        ms = stages[k + 1][1]
        for s in order[k:]:
            if shortest(loc, order[:k] + [s], len(ms)) is not None:
                return False
        loc = apply(loc, ms)
    return True


SEED = int(os.environ.get('SEED', 1123))


def main():
    rng = random.Random(SEED)
    base = f2l_inserts()
    # (slot, slots it must keep, length) → inserts that keep at least those
    inserts = {}
    for i, slot in enumerate(['FR', 'RB', 'BL', 'LF']):
        others = [s for s in SLOT if s != slot]
        for seq in base:
            seq = [round_slots(m, i) for m in seq]
            g = go(seq)
            keeps = {s for s in others if home(g, SLOT_ST[s])}
            for r in range(4):
                for need in itertools.combinations(others, r):
                    if keeps >= set(need):
                        inserts.setdefault((slot, frozenset(need), len(seq)), []).append(seq)
    print(f'{len(base)} F2L inserts per slot', file=sys.stderr)

    lo, hi = int(os.environ.get('LO', 43)), int(os.environ.get('HI', 46))
    found = []
    for attempt in range(int(os.environ.get('TRIES', 200000))):
        got = build(rng, inserts)
        if not got:
            continue
        stages, order, start = got
        total = sum(len(ms) for _, ms in stages)
        if not lo <= total <= hi or min(len(ms) for _, ms in stages) < 3:
            continue
        own, adj, bad, homed = looks(start)
        if bad or homed or not 6 <= own <= 10 or not 9 <= adj <= 15:
            continue
        if not honest(stages, order, start):
            continue
        found.append((abs(own - 8) + abs(adj - 12) * 0.5, total, attempt, stages, order, start))
    found.sort(key=lambda f: (f[1], f[0]))
    print(f'{len(found)} candidates; checking optimality', file=sys.stderr)
    passed = [f for f in found if optimal(*f[3:])]
    pick = int(os.environ.get('PICK', 3))
    for i, (score, total, attempt, stages, order, start) in enumerate(passed):
        lens = ' '.join(str(len(ms)) for _, ms in stages)
        print(f'{"*" if i == pick else " "}{i:3d}  total {total}  [{lens}]  look {score:.1f}  attempt {attempt}', file=sys.stderr)
    if len(passed) > pick:
        score, total, attempt, stages, order, start = passed[pick]
        own, adj, bad, homed = looks(start)
        solve = [m for _, ms in stages for m in ms]
        cols = colours(start)
        out = {
            'orientation': 'white on D (bottom), yellow on U (top), green F (front), red R, orange L, blue B. Standard notation; clockwise = as seen looking at that face.',
            'scramble': ' '.join(inverse(solve)),
            'scramble_length': len(solve),
            'start_state_faces_UDFBRL': {f: ''.join(c for row in grid(cols, f) for c in row) for f in 'UDFBRL'},
            'stages': [{'caption': c, 'moves': ' '.join(ms), 'count': len(ms)} for c, ms in stages],
            'total_moves': total,
            'slot_order': order,
            'optimal_cross_len': len(stages[0][1]),
            'seed': SEED,
            'attempt': attempt,
        }
        for c, ms in stages:
            print(f"{c:10s} {len(ms):2d}  {' '.join(ms)}")
        print(f'total {total}; slots {order}; start: {own} stickers on their own face, {adj} matching neighbours', file=sys.stderr)
        if '--write' in sys.argv:
            with open(os.path.join(HERE, 'solve.json'), 'w') as fh:
                json.dump(out, fh, indent=1)
                fh.write('\n')
        return
    sys.exit('nothing passed; try more TRIES or another SEED')


if __name__ == '__main__':
    main()
