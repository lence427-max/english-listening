# Silentium UI Optimization Design

## Direction

Silentium will use a restrained spatial-learning aesthetic: pale blue-gray
canvas, translucent white surfaces, indigo and cyan accents, generous spacing,
and clear English-first typography. The interface should feel like a focused
learning product that opens into a concept universe, not an admin dashboard.

## Scope

1. Unify global tokens and core components without changing application state.
2. Improve content-library and training layouts through additive class names.
3. Refine the dictionary card and Explore Mode surfaces and proportions.
4. Preserve all current event handlers, storage behavior, APIs, SVG rendering,
   dragging, zooming, journeys, tooltips, and animations.

## Component Decisions

- Navigation becomes a light glass rail with a compact gradient brand mark.
- Cards use 20-24px radii, subtle borders, and low-contrast elevation.
- Primary actions use indigo; secondary actions remain quiet and bordered.
- Page headings use a reusable eyebrow/title/subtitle hierarchy.
- Content-library entries become independent editorial cards rather than rows
  inside heavy category containers.
- Training views use a centered workstation width and visually group progress,
  playback, input, and feedback.
- Dictionary exploration is the dominant footer action.
- Explore Mode keeps its V5 graph logic while receiving a translucent toolbar,
  richer canvas atmosphere, larger spatial footprint, and calmer panels.

## Responsive Behavior

- Desktop content is capped at a readable width with adaptive gutters.
- Tablet cards remain two-column where space permits.
- Mobile uses one column, full-width controls, a bottom-safe layout, and a
  simplified Explore toolbar without changing graph behavior.

## Verification

- Run `npm test` and `npm run check`.
- Check generated markup for preserved IDs and data attributes.
- Browser visual verification is optional because localhost access may be
  blocked by the browser policy in this environment.
