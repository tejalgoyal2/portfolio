import { describe, expect, it } from 'vitest';
import { targetAt, thresholdOf } from '../../src/cube/schedule';
import { SECTION_MOVES } from '../../src/cube/solve';

// About from 1000 to 4000 px; Skills from 4000 to 5000 px; a gap; Contact from 9000 to 9600 px.
const spans = [
  { start: 1000, end: 4000, from: SECTION_MOVES.hero, to: SECTION_MOVES.about },
  { start: 4000, end: 5000, from: SECTION_MOVES.about, to: SECTION_MOVES.skills },
  { start: 9000, end: 9600, from: SECTION_MOVES.writing, to: SECTION_MOVES.contact },
];

describe('scroll → solve moves', () => {
  it('scrambled through the hero', () => {
    expect(targetAt(0, spans)).toBe(0);
    expect(targetAt(999, spans)).toBe(0);
  });

  it('the cross is complete at the end of About', () => {
    expect(targetAt(3999.99, spans)).toBe(6);
  });

  it('holds a stage across a gap, then solves by the end of Contact and stays solved', () => {
    expect(targetAt(5000, spans)).toBe(18);
    expect(targetAt(8999, spans)).toBe(18);
    expect(targetAt(9600, spans)).toBe(62);
    expect(targetAt(1e9, spans)).toBe(62);
  });

  it('moves are spread evenly and the mapping is monotonic', () => {
    let last = 0;
    for (let y = 0; y <= 10000; y += 7) {
      const k = targetAt(y, spans);
      expect(k).toBeGreaterThanOrEqual(last);
      last = k;
    }
    // About: 6 moves over 3000 px → thresholds at 1250, 1750, ..., 3750
    expect([1, 2, 3, 4, 5, 6].map((m) => thresholdOf(m, spans))).toEqual([1250, 1750, 2250, 2750, 3250, 3750]);
    expect(targetAt(1249, spans)).toBe(0);
    expect(targetAt(1250, spans)).toBe(1);
    // each threshold switches exactly one move
    for (const m of [...Array(18).keys()].map((i) => i + 1)) {
      const t = thresholdOf(m, spans);
      expect(targetAt(t - 0.01, spans)).toBe(m - 1);
      expect(targetAt(t, spans)).toBe(m);
    }
  });
});
