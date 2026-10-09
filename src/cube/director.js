// Decides which quarter turn the cube plays next. Pure and clock-free: the
// caller feeds it time with tick(dt) and reads `active` to animate.
//
// Rules (docs/cube/CUBE.md):
// - scroll sets a target solve-move count; moves play one at a time, never skipped — a long queue
//   (a fast scroll) speeds them up only a little, so the cube always takes its time;
// - scrolling back plays inverse moves;
// - visitor clicks twist a face (either way) and go on a stack; a click mid-twist waits, never dropped;
// - after ~4 s without clicks the stack is undone one by one;
// - if scroll asks for a solve move while the stack is not empty, the stack is undone quickly first;
// - reduced motion: everything applies instantly.
//
// Move kinds: 'solve' | 'unsolve' | 'visitor' | 'undo' | 'flush'
// ActiveMove { move, kind, duration, elapsed }   Committed { move, kind }
import { CubeState, invertMove } from './model';

export class Director {
  /**
   * opts.baseDuration  seconds for one quarter turn when nothing is queued
   * opts.minDuration   fastest a queued move may play
   * opts.flushDuration seconds per move when clearing the visitor's twists before a solve move
   * opts.undoDelay     seconds without clicks before the visitor's twists are undone
   * opts.instant       reduced motion: apply moves instantly
   */
  constructor(scramble, solve, opts = {}) {
    this.state = CubeState.solved().applyAll(scramble);
    /** Solve moves currently applied. */
    this.k = 0;
    this.target = 0;
    this.visitor = [];
    this.clicks = [];
    this.active = null;
    this.sinceClick = Infinity;
    this.instant = opts.instant ?? false;

    this.solve = solve;
    this.base = opts.baseDuration ?? 0.5;
    this.min = opts.minDuration ?? 0.26;
    this.flushDur = opts.flushDuration ?? 0.22;
    this.undoDelay = opts.undoDelay ?? 4;
  }

  get total() {
    return this.solve.length;
  }

  setTarget(k) {
    this.target = Math.max(0, Math.min(this.solve.length, Math.round(k)));
  }

  /** Queue a visitor twist: turns 1 = clockwise, 3 = anticlockwise. */
  click(face, turns = 1) {
    this.clicks.push({ face, turns });
    this.sinceClick = 0;
  }

  /** 0..1 progress of the move in flight. */
  get progress() {
    return this.active ? Math.min(1, this.active.elapsed / this.active.duration) : 0;
  }

  /** True while the visitor's twists are being (or are about to be) undone. */
  get undoing() {
    const k = this.active?.kind;
    return k === 'undo' || k === 'flush' || (this.visitor.length > 0 && this.clicks.length === 0 && this.sinceClick >= this.undoDelay);
  }

  /** True when nothing is moving or waiting. */
  get idle() {
    return !this.active && this.clicks.length === 0 && this.target === this.k && this.visitor.length === 0;
  }

  /** Moves still to play before the cube catches up with scroll and clicks. */
  get backlog() {
    const solveGap = Math.abs(this.target - this.k);
    return this.clicks.length + solveGap + (solveGap > 0 ? this.visitor.length : 0);
  }

  tick(dt) {
    const done = [];
    this.sinceClick += dt;
    let budget = Math.max(0, dt);
    // Bounded so a pathological state can never spin forever.
    for (let guard = 0; guard < 512; guard++) {
      if (!this.active) {
        this.active = this.next();
        if (!this.active) break;
      }
      const a = this.active;
      if (this.instant || a.duration <= 0) {
        done.push(this.commit(a));
        continue;
      }
      a.elapsed += budget;
      budget = 0;
      if (a.elapsed < a.duration) break;
      budget = a.elapsed - a.duration; // carry leftover time into the next move
      done.push(this.commit(a));
    }
    return done;
  }

  duration(base) {
    if (this.instant) return 0;
    const backlog = Math.max(1, this.backlog);
    return Math.max(this.min, base / (1 + 0.12 * (backlog - 1)));
  }

  next() {
    const click = this.clicks.shift();
    if (click) return { move: { face: click.face, turns: click.turns }, kind: 'visitor', duration: this.duration(this.base), elapsed: 0 };

    if (this.target !== this.k) {
      const top = this.visitor[this.visitor.length - 1];
      if (top) return { move: invertMove(top), kind: 'flush', duration: this.instant ? 0 : this.flushDur, elapsed: 0 };
      if (this.target > this.k)
        return { move: this.solve[this.k], kind: 'solve', duration: this.duration(this.base), elapsed: 0 };
      return { move: invertMove(this.solve[this.k - 1]), kind: 'unsolve', duration: this.duration(this.base), elapsed: 0 };
    }

    const top = this.visitor[this.visitor.length - 1];
    if (top && this.sinceClick >= this.undoDelay)
      return { move: invertMove(top), kind: 'undo', duration: this.instant ? 0 : this.base * 1.4, elapsed: 0 };
    return null;
  }

  commit(a) {
    this.state.apply(a.move);
    if (a.kind === 'solve') this.k++;
    else if (a.kind === 'unsolve') this.k--;
    else if (a.kind === 'visitor') this.visitor.push(a.move);
    else this.visitor.pop();
    this.active = null;
    return { move: a.move, kind: a.kind };
  }
}
