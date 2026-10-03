/**
 * Tiny shared registry between the DOM life layer and the lazy-loaded WebGL
 * stage. The stage fills these in once three.js has loaded; until then
 * everything treats the cube as absent.
 *
 *   cubeAt(x, y)  → the face under a viewport point, or null
 *   twist(face)   → queue a visitor twist
 *   cursorHint    → a cursor state the canvas wants ('twist'), or null
 */
export const bus = {
  cubeAt: null,
  twist: null,
  cursorHint: null,
};
