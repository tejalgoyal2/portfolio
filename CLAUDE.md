# Portfolio — Design & Engineering Rules

## Before any design or frontend work

Read these files in order before writing a single line of code or making any design decision:

1. `/Users/tejalgoyal/Desktop/Vibin/skills/taste-skill/SKILL.md` — style router, picks visual direction
2. `/Users/tejalgoyal/Desktop/Vibin/skills/taste-skill/components/style-recipes.md` — component patterns per style
3. `/Users/tejalgoyal/Desktop/Vibin/skills/SKILL.md` — animation engineering rules (Emil Kowalski)
4. `/Users/tejalgoyal/Desktop/Vibin/skills/universal/.claude/skills/impeccable/SKILL.md` — design laws and anti-slop rules

Do not skip this step to move faster. Generic output comes from skipping context.

## About this portfolio

This is Tejal's (he/him) personal portfolio. Not a resume site, not a corporate page. It should have personality, craft, and a point of view. Safe is wrong here.

- Desktop-first. Full animations, no performance compromises.
- Go all out. Bold design choices over safe ones.
- The portfolio is a playground, not a LinkedIn profile.

## Design workflow

- **Opus session**: creative direction only. Use taste-skill to pick and commit to a visual direction. Think from scratch — do not look at the existing code for inspiration, only for content to preserve (project data, copy, experience).
- **Sonnet session**: implementation only. Follow what Opus decided. Do not re-open design questions during implementation. Just build it right.

## Hard engineering rules — no exceptions

These are not suggestions. If you are about to violate one, stop and find a different approach.

**Animations:**
- Never `transition: all` — always specify exact properties (`transition: transform 200ms, opacity 200ms`)
- Never animate from `scale(0)` — start from `scale(0.95)` with `opacity: 0`
- Never `ease-in` on any UI element — use `ease-out` or a custom `cubic-bezier`
- Preferred easing: `cubic-bezier(0.23, 1, 0.32, 1)` for exits/interactions
- Only animate `transform` and `opacity` — never `height`, `width`, `padding`, `margin`
- Duration ceiling: 300ms for UI elements, longer only for cinematic/marketing moments
- Stagger delays: 30–80ms between items, never longer

**Framer Motion:**
- For hardware acceleration, use `transform: "translateX(100px)"` — not `x={100}`
- `x`, `y`, `scale` shorthand props run on the main thread and drop frames under load

**No fake effects:**
- No faking depth or 3D unless it is real CSS 3D with `transform-style: preserve-3d` and `perspective`
- No using `backdrop-filter: blur` as a primary structural element
- No effects that only work visually in one color mode

## Light mode is not optional and not derived

Light mode must be designed as a first-class experience from the start, not adapted from dark mode afterward. Every shadow, depth illusion, gradient, and visual effect must be verified in light mode before it is considered done. If an effect only looks right on dark, it needs to be redesigned, not toggled off.

## Color

Use OKLCH for all colors. Never `#000` or `#fff` — tint every neutral toward the brand hue even slightly (`oklch(98% 0.008 270)` not `oklch(100% 0 0)`).

## What to preserve from the existing code

Preserve only: project data, copy, experience/timeline data, any Notion API integration. The visual layer — components, styles, animations — should be treated as starting from zero.
