// Decides which quarter turn the cube plays next. Pure and clock-free: the
// caller feeds it time with tick(dt) and reads `active` to animate.
//
// Rules (docs/cube/CUBE.md):
// - scroll sets a target solve-move count; moves play one at a time, never skipped — a long queue
//   (a fast scroll) speeds them up only a little, so the cube always takes its time;
// - a jump (Home/End, a fling, a menu link) more than `catchUp` moves away becomes a speed-solve:
//   every move still plays, in order, but the further behind it is the faster they go (down to a
//   blur-free floor), easing back to the usual pace as it catches up — never an instant snap;
// - scrolling back plays inverse moves;
// - visitor clicks twist a face (either way), and the twist stays: nothing is ever undone. The
//   solve's moves carry on from whatever state the cube is in, so a twisted cube won't come out
//   solved at the end. A click mid-twist waits, never dropped;
// - once the cube is really solved (by the solve or by hand) it stays put: scroll plays no more moves;
// - reduced motion: everything applies instantly.
//
// Move kinds: 'solve' | 'unsolve' | 'visitor'
// ActiveMove { move, kind, duration, elapsed }   Committed { move, kind, solved? }
import { CubeState, invertMove } from './model';

export class Director {
  /**
   * opts.baseDuration  seconds for one quarter turn when nothing is queued
   * opts.minDuration   fastest a queued move may play
   * opts.catchUp       beyond this many moves behind, it speed-solves
   * opts.rushDuration  the fastest a speed-solve move may play
   * opts.instant       reduced motion: apply moves instantly
   */
  constructor(scramble, solve, opts = {}) {
    this.state = CubeState.solved().applyAll(scramble);
    /** Solve moves currently applied. */
    this.k = 0;
    this.target = 0;
    this.clicks = [];
    /** Twists the visitor has made (they all stay). */
    this.twists = 0;
    this.active = null;
    /** True once the cube has really been solved; from then on it rests. */
    this.solvedOnce = false;
    this.instant = opts.instant ?? false;

    this.solve = solve;
    this.base = opts.baseDuration ?? 0.5;
    this.min = opts.minDuration ?? 0.26;
    this.catchUp = opts.catchUp ?? 4;
    // not so fast that a turn is only a frame or two: it reads as a fluid run, not a strobe
    this.rushMin = opts.rushDuration ?? 0.062;
  }

  get total() {
    return this.solve.length;
  }

  setTarget(k) {
    if (this.solvedOnce) return;
    this.target = Math.max(0, Math.min(this.solve.length, Math.round(k)));
  }

  /**
   * Arrive at k solve moves at once, as if they'd always been there (the page
   * loaded mid-scroll): no turns to watch, and no milestones.
   */
  arrive(k) {
    this.setTarget(k);
    while (this.k < this.target) this.state.apply(this.solve[this.k++]);
    while (this.k > this.target) this.state.apply(invertMove(this.solve[--this.k]));
  }

  /** Queue a visitor twist: turns 1 = clockwise, 3 = anticlockwise. */
  click(face, turns = 1) {
    this.clicks.push({ face, turns });
  }

  /** 0..1 progress of the move in flight. */
  get progress() {
    return this.active ? Math.min(1, this.active.elapsed / this.active.duration) : 0;
  }

  /** True while it's speed-solving to catch up with a jump. */
  get rushing() {
    return !this.instant && Math.abs(this.target - this.k) > this.catchUp;
  }

  /** True when nothing is moving or waiting. */
  get idle() {
    return !this.active && this.clicks.length === 0 && this.target === this.k;
  }

  /** Moves still to play before the cube catches up with scroll and clicks. */
  get backlog() {
    return this.clicks.length + Math.abs(this.target - this.k);
  }

  tick(dt) {
    const done = [];
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
    // your own twists are quick (and click home with a little overshoot, in the view)
    if (click) return { move: { face: click.face, turns: click.turns }, kind: 'visitor', duration: this.instant ? 0 : Math.max(0.22, this.duration(this.base) * 0.62), elapsed: 0 };
    if (this.target === this.k) return null;
    // far behind: a speed-solve, fastest when furthest, easing back as it catches up
    const gap = Math.abs(this.target - this.k);
    const dur = gap > this.catchUp && !this.instant ? Math.max(this.rushMin, this.base / (1 + 0.5 * (gap - 1))) : this.duration(this.base);
    if (this.target > this.k) return { move: this.solve[this.k], kind: 'solve', duration: dur, elapsed: 0 };
    return { move: invertMove(this.solve[this.k - 1]), kind: 'unsolve', duration: dur, elapsed: 0 };
  }

  commit(a) {
    this.state.apply(a.move);
    if (a.kind === 'solve') this.k++;
    else if (a.kind === 'unsolve') this.k--;
    else this.twists++;
    this.active = null;
    const c = { move: a.move, kind: a.kind };
    if (!this.solvedOnce && this.state.isSolved()) {
      // really solved: it rests here, and scroll plays nothing more over it
      this.solvedOnce = true;
      this.target = this.k;
      c.solved = true;
    }
    return c;
  }
}
