// The fixed scramble and the verified 62-move solve, read straight from
// docs/cube/solve.json so the site and verify.py can never drift apart.
import data from '../../docs/cube/solve.json';
import { parseMoves } from './model';

// Stage { caption, moves, start, end } — start / end are solve-move counts
// before and after the stage.

export const SCRAMBLE = parseMoves(data.scramble);

export const STAGES = (() => {
  let at = 0;
  return data.stages.map((s) => {
    const moves = parseMoves(s.moves);
    const stage = { caption: s.caption, moves, start: at, end: at + moves.length };
    at += moves.length;
    return stage;
  });
})();

export const SOLVE = STAGES.flatMap((s) => s.moves);
export const TOTAL_MOVES = data.total_moves;
export const SLOT_ORDER = data.slot_order;
export const START_FACES = data.start_state_faces_UDFBRL;

/**
 * Solve-move counts each section has reached by the time you've scrolled
 * through it (docs/REVAMP.md §2): the hero is scrambled, About finishes the
 * cross, Skills pairs 1–2, Projects pairs 3–4, Experience the top cross,
 * Writing the top face, and Contact solves it.
 */
export const SECTION_MOVES = {
  hero: 0,
  about: STAGES[0].end,
  skills: STAGES[2].end,
  projects: STAGES[4].end,
  experience: STAGES[5].end,
  writing: STAGES[6].end,
  contact: STAGES[7].end,
};

export const SECTION_ORDER = ['hero', 'about', 'skills', 'projects', 'experience', 'writing', 'contact'];

/** The last stage completed after k solve moves, or null while still scrambled. */
export function stageAt(k) {
  let last = null;
  for (const s of STAGES) if (k >= s.end) last = s;
  return last;
}
