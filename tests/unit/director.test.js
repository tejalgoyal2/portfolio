import { describe, expect, it } from 'vitest';
import { CubeState, invertMove, parseMoves } from '../../src/cube/model';
import { Director } from '../../src/cube/director';
import { SCRAMBLE, SOLVE } from '../../src/cube/solve';

const N = SOLVE.length;
const expected = (k) => CubeState.solved().applyAll(SCRAMBLE).applyAll(SOLVE.slice(0, k));
const run = (d, seconds, step = 1 / 60) => {
  const out = [];
  for (let t = 0; t < seconds; t += step) out.push(...d.tick(step));
  return out;
};

describe('Director', () => {
  it('loads with the scramble already applied and nothing playing', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    expect(d.state.equals(expected(0))).toBe(true);
    expect(d.tick(1 / 60)).toEqual([]);
    expect(d.idle).toBe(true);
  });

  it('takes its time: one quarter turn in about half a second', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.setTarget(1);
    expect(run(d, 0.45)).toEqual([]);
    expect(d.active?.kind).toBe('solve');
    expect(run(d, 0.07).length).toBe(1);
    expect(d.k).toBe(1);
  });

  it('a short run plays every move, a little faster, never skipping a state', () => {
    const d = new Director(SCRAMBLE, SOLVE, { catchUp: 99 });
    const n = Math.min(33, N);
    d.setTarget(n);
    const seen = [];
    let elapsed = 0;
    while (d.k < n && elapsed < 30) {
      for (const c of d.tick(1 / 60)) {
        expect(c.kind).toBe('solve');
        seen.push(d.state.clone());
      }
      elapsed += 1 / 60;
    }
    expect(seen.length).toBe(n);
    seen.forEach((s, i) => expect(s.equals(expected(i + 1)), `state ${i + 1}`).toBe(true));
    expect(elapsed).toBeLessThan(n * 0.5); // faster than one by one…
    expect(elapsed).toBeGreaterThan(n * 0.26 - 0.1); // …but never a blur
  });

  it('a jump speed-solves: every move plays in order, fast, then eases back to the usual pace', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.setTarget(N);
    expect(d.rushing).toBe(true);
    expect(d.tick(1 / 60)).toEqual([]); // nothing snaps
    const seen = [];
    let t = 0;
    while (d.k < N && t < 20) {
      for (const c of d.tick(1 / 60)) seen.push(c.move);
      t += 1 / 60;
    }
    expect(seen).toEqual(SOLVE);
    expect(t).toBeLessThan(6); // quick…
    expect(t).toBeGreaterThan(2.5); // …but you see it happen
    expect(d.rushing).toBe(false);
    expect(d.state.isSolved()).toBe(true);
  });

  it('scrolling back plays the inverse moves', () => {
    const d = new Director(SCRAMBLE, SOLVE, { instant: true });
    d.setTarget(10);
    d.tick(0);
    d.instant = false;
    d.setTarget(7);
    const back = run(d, 2);
    expect(back.map((c) => c.kind)).toEqual(['unsolve', 'unsolve', 'unsolve']);
    expect(back.map((c) => c.move)).toEqual([9, 8, 7].map((i) => invertMove(SOLVE[i])));
    expect(d.state.equals(expected(7))).toBe(true);
  });

  it('arriving mid-page puts the cube in that state at once, with nothing to watch and no milestone', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.arrive(12);
    expect(d.k).toBe(12);
    expect(d.state.equals(expected(12))).toBe(true);
    expect(d.idle).toBe(true);
    d.arrive(N);
    expect(d.state.isSolved()).toBe(true);
    expect(d.solvedOnce).toBe(false); // you didn't see it solve: scrolling up still plays it back
    d.setTarget(N - 2);
    expect(run(d, 2).map((c) => c.kind)).toEqual(['unsolve', 'unsolve']);
  });

  it('a click turns that face', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    const out = run(d, 0.6);
    expect(out).toEqual([{ move: parseMoves('R')[0], kind: 'visitor' }]);
    expect(d.twists).toBe(1);
    expect(d.state.equals(expected(0).applyAll(parseMoves('R')))).toBe(true);
  });

  it('clicks mid-twist are queued, never dropped', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    const out = [];
    d.click('U');
    out.push(...d.tick(0.05));
    d.click('F');
    d.click('F');
    out.push(...d.tick(0.01));
    d.click('L', 3);
    out.push(...run(d, 2.5));
    expect(out.map((c) => c.move)).toEqual(parseMoves("U F F L'"));
    expect(d.state.equals(expected(0).applyAll(parseMoves("U F F L'")))).toBe(true);
  });

  it('a visitor twist is never undone, however long you wait or scroll', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.click('U', 3);
    const out = run(d, 30);
    expect(out.map((c) => c.kind)).toEqual(['visitor', 'visitor']);
    const twisted = expected(0).applyAll(parseMoves("R U'"));
    expect(d.state.equals(twisted)).toBe(true);
    // scroll on and back: only solve moves and their inverses play, the twists stay underneath
    d.setTarget(9);
    const on = run(d, 20);
    d.setTarget(0);
    const back = run(d, 20);
    expect([...on, ...back].every((c) => c.kind === 'solve' || c.kind === 'unsolve')).toBe(true);
    expect(d.state.equals(twisted)).toBe(true);
  });

  it('scripted moves still advance on top of whatever state the cube is in', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('F');
    run(d, 1);
    d.setTarget(5);
    const out = run(d, 5);
    expect(out.map((c) => c.kind)).toEqual(Array(5).fill('solve'));
    expect(out.map((c) => c.move)).toEqual(SOLVE.slice(0, 5));
    expect(d.k).toBe(5);
    expect(d.state.equals(expected(0).applyAll(parseMoves('F')).applyAll(SOLVE.slice(0, 5)))).toBe(true);
  });

  it('a click mid-solve goes in between solve moves, and stays', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.setTarget(4);
    run(d, 0.6); // the first solve move lands
    d.click('D');
    run(d, 10);
    expect(d.k).toBe(4);
    const want = expected(1).applyAll(parseMoves('D')).applyAll(SOLVE.slice(1, 4));
    expect(d.state.equals(want)).toBe(true);
  });

  it('solved milestone: once, on the move that really solves it, and then it rests', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.setTarget(N);
    const out = run(d, 20);
    const solved = out.filter((c) => c.solved);
    expect(solved.length).toBe(1);
    expect(solved[0]).toBe(out.at(-1));
    expect(d.state.isSolved()).toBe(true);
    expect(d.solvedOnce).toBe(true);
    // scrolling back up doesn't scramble it again…
    d.setTarget(0);
    expect(run(d, 5)).toEqual([]);
    expect(d.state.isSolved()).toBe(true);
    // …but you can still twist it, and the twist stays
    d.click('B');
    expect(run(d, 1).map((c) => [c.kind, !!c.solved])).toEqual([['visitor', false]]);
    expect(d.state.isSolved()).toBe(false);
  });

  it('no solved milestone when a twist leaves the end unsolved', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.setTarget(N);
    const out = run(d, 20);
    expect(d.k).toBe(N);
    expect(d.state.isSolved()).toBe(false);
    expect(out.some((c) => c.solved)).toBe(false);
    expect(d.solvedOnce).toBe(false);
    // and it still follows scroll, both ways
    d.setTarget(N - 3);
    expect(run(d, 3).map((c) => c.kind)).toEqual(['unsolve', 'unsolve', 'unsolve']);
  });

  it('a twist undone by hand (R, then Shift-R) still ends solved', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.click('R', 3);
    d.setTarget(N);
    const out = run(d, 20);
    expect(out.filter((c) => c.solved).length).toBe(1);
    expect(d.state.isSolved()).toBe(true);
  });

  it('solving it by hand counts: the milestone fires and scroll plays nothing more over it', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.arrive(N - 1);
    const last = SOLVE[N - 1];
    d.click(last.face, last.turns === 2 ? 1 : last.turns);
    if (last.turns === 2) d.click(last.face, 1);
    d.setTarget(N);
    const out = run(d, 3);
    expect(out.every((c) => c.kind === 'visitor')).toBe(true);
    expect(out.at(-1).solved).toBe(true);
    expect(d.state.isSolved()).toBe(true);
    expect(d.k).toBe(N - 1); // the solve's own last move never plays over it
  });

  it('whatever the visitor does, only their twists and the solve play, in order', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    const ref = expected(0);
    const faces = ['U', 'R', 'F', 'L', 'B', 'D'];
    let k = 0;
    const check = (c) => {
      expect(['visitor', 'solve', 'unsolve']).toContain(c.kind);
      if (c.kind === 'solve') expect(c.move).toEqual(SOLVE[k++]);
      if (c.kind === 'unsolve') expect(c.move).toEqual(invertMove(SOLVE[--k]));
      ref.apply(c.move);
    };
    for (let i = 0; i < 60; i++) {
      if (i % 3 === 0) d.click(faces[i % 6], i % 2 ? 3 : 1);
      d.setTarget((i * 7) % (N + 1));
      run(d, 0.13).forEach(check);
    }
    d.setTarget(N);
    run(d, 40).forEach(check);
    expect(d.k).toBe(N);
    expect(k).toBe(N);
    expect(d.state.equals(ref)).toBe(true);
    expect(d.twists).toBe(20);
  });

  it('reduced motion applies moves and clicks instantly', () => {
    const d = new Director(SCRAMBLE, SOLVE, { instant: true });
    d.setTarget(6);
    expect(d.tick(0).length).toBe(6);
    d.click('F');
    expect(d.tick(0).map((c) => c.kind)).toEqual(['visitor']);
    d.setTarget(14);
    expect(d.tick(0).map((c) => c.kind)).toEqual(Array(8).fill('solve'));
    expect(d.state.equals(expected(6).applyAll(parseMoves('F')).applyAll(SOLVE.slice(6, 14)))).toBe(true);
  });
});
