// Scroll position → how many solve moves should be applied.
// Each section's moves are spread evenly over its scroll range; move i's
// threshold sits in the middle of its slice, so the first move fires just
// after the range starts and the last one before it ends.
//
// MoveSpan { start, end } — scroll offsets (px) where the span starts and ends
//          { from, to }   — solve-move counts at the start and end of the span

export function targetAt(y, spans) {
  if (spans.length === 0) return 0;
  let k = spans[0].from;
  for (const s of spans) {
    if (y < s.start) break;
    const n = s.to - s.from;
    const len = Math.max(1, s.end - s.start);
    if (y >= s.end) {
      k = s.to;
      continue;
    }
    // number of thresholds that y has crossed, compared with the exact
    // threshold values so floating point can never flip a move early or late
    const at = (i) => s.start + ((i - 0.5) / n) * len;
    let crossed = Math.max(0, Math.min(n, Math.floor(((y - s.start) / len) * n + 0.5)));
    while (crossed < n && y >= at(crossed + 1)) crossed++;
    while (crossed > 0 && y < at(crossed)) crossed--;
    k = s.from + crossed;
    break;
  }
  return k;
}

/** Scroll offset of move i's threshold (1-based within the whole solve). */
export function thresholdOf(move, spans) {
  for (const s of spans) {
    if (move > s.from && move <= s.to) {
      const n = s.to - s.from;
      return s.start + ((move - s.from - 0.5) / n) * Math.max(1, s.end - s.start);
    }
  }
  return null;
}
