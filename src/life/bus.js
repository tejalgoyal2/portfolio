/**
 * Tiny shared registry between the DOM life layer and the lazy-loaded WebGL
 * stage. The stage fills these in once three.js has loaded; until then
 * everything treats the cube as absent.
 *
 *   cubeAt(x, y)      → the face under a viewport point, or null
 *   twist(face)       → queue a visitor twist; returns 1 (clockwise) or 3
 *   orbit(dx, dy)     → turn the whole cube by a drag, in px
 *   release(vx, vy)   → let go of a drag, with its speed in px/s
 *   cursorHint        → a cursor state the canvas wants ('twist'), or null
 */
export const bus = {
  cubeAt: null,
  twist: null,
  orbit: null,
  release: null,
  cursorHint: null,
};
