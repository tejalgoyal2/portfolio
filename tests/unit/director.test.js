import { describe, expect, it } from 'vitest';
import { CubeState, invertMove, parseMoves } from '../../src/cube/model';
import { Director } from '../../src/cube/director';
import { SCRAMBLE, SOLVE } from '../../src/cube/solve';

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
    d.setTarget(33);
    const seen = [];
    let elapsed = 0;
    while (d.k < 33 && elapsed < 30) {
      for (const c of d.tick(1 / 60)) {
        expect(c.kind).toBe('solve');
        seen.push(d.state.clone());
      }
      elapsed += 1 / 60;
    }
    expect(seen.length).toBe(33);
    seen.forEach((s, i) => expect(s.equals(expected(i + 1)), `state ${i + 1}`).toBe(true));
    expect(elapsed).toBeLessThan(33 * 0.5); // faster than one by one…
    expect(elapsed).toBeGreaterThan(33 * 0.26 - 0.1); // …but never a blur
  });

  it('a jump applies the moves in between at once, in order, and animates the last few', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.setTarget(33);
    const first = d.tick(1 / 60);
    expect(first.length).toBe(29);
    first.forEach((c, i) => expect(c.move).toEqual(SOLVE[i]));
    expect(d.active?.kind).toBe('solve');
    run(d, 3);
    expect(d.k).toBe(33);
    expect(d.state.equals(expected(33))).toBe(true);
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

  it('a click turns that face and goes on the stack', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    run(d, 0.6);
    expect(d.visitor).toEqual(parseMoves('R'));
    expect(d.state.equals(expected(0).applyAll(parseMoves('R')))).toBe(true);
  });

  it('clicks mid-twist are queued, never dropped', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('U');
    d.tick(0.05);
    d.click('F');
    d.click('F');
    d.tick(0.01);
    d.click('L', 3);
    run(d, 2.5);
    expect(d.visitor).toEqual(parseMoves("U F F L'"));
  });

  it("keeps the visitor's twists while they play, however long", () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.click('U');
    const out = run(d, 30);
    expect(out.map((c) => c.kind)).toEqual(['visitor', 'visitor']);
    expect(d.visitor.length).toBe(2);
    expect(d.undoing).toBe(false);
  });

  it('once let go, undoes the twists one by one', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.click('U');
    run(d, 1.2);
    d.letGo();
    expect(d.undoing).toBe(true);
    const undone = run(d, 2);
    expect(undone.map((c) => c.kind)).toEqual(['undo', 'undo']);
    expect(undone.map((c) => c.move)).toEqual(parseMoves("U' R'"));
    expect(d.state.equals(expected(0))).toBe(true);
    expect(d.undoing).toBe(false);
  });

  it('a new click during the undo holds the rest in place again', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('R');
    d.click('U');
    run(d, 1.2);
    d.letGo();
    run(d, 0.3); // first undo in flight — it finishes, the rest waits
    d.click('F');
    run(d, 5);
    expect(d.visitor).toEqual(parseMoves('R F'));
    d.letGo();
    run(d, 3);
    expect(d.visitor.length).toBe(0);
    expect(d.state.equals(expected(0))).toBe(true);
  });

  it('a solve move asked for by scroll first undoes the stack quickly', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    d.click('B');
    d.click('D');
    run(d, 1.2);
    d.setTarget(1);
    const out = run(d, 1.2);
    expect(out.map((c) => c.kind)).toEqual(['flush', 'flush', 'solve']);
    expect(d.state.equals(expected(1))).toBe(true);
  });

  it('the solve state is always reached exactly, whatever the visitor does', () => {
    const d = new Director(SCRAMBLE, SOLVE);
    const faces = ['U', 'R', 'F', 'L', 'B', 'D'];
    for (let i = 0; i < 40; i++) {
      if (i % 3 === 0) d.click(faces[i % 6]);
      d.setTarget((i * 7) % 63);
      run(d, 0.13);
    }
    d.setTarget(62);
    run(d, 40);
    expect(d.visitor.length).toBe(0);
    expect(d.k).toBe(62);
    expect(d.state.isSolved()).toBe(true);
  });

  it('reduced motion applies moves and clicks instantly', () => {
    const d = new Director(SCRAMBLE, SOLVE, { instant: true });
    d.setTarget(6);
    expect(d.tick(0).length).toBe(6);
    d.click('F');
    expect(d.tick(0).map((c) => c.kind)).toEqual(['visitor']);
    d.setTarget(14);
    expect(d.tick(0).map((c) => c.kind)).toEqual(['flush', ...Array(8).fill('solve')]);
    expect(d.state.equals(expected(14))).toBe(true);
  });
});
