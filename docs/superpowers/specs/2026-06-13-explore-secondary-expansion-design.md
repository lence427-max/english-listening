# Explore Mode Secondary Expansion Design

## Goal

Make child concepts useful exploration entry points while preserving the existing focused flight path and light Apple Vision visual language.

## Interaction

- A single click on a child word opens the existing glass card with its English word, Chinese meaning, English definition, relation, and optional material occurrences.
- A double click keeps using `flyToWord()`: the old center is saved as a path marker, the camera pans and gently zooms, then the child becomes the new center without a page refresh.
- `planet -> orbit` must work without an API key through a curated semantic fallback.

## Semantic Quality

- Add an `orbit` fallback to the shared `concept-quality.js` module.
- The fallback includes `gravity`, `satellite`, `rotation`, `revolution`, `path`, and `spacecraft`, with Chinese meanings and definitions.
- All AI, local graph, fallback, rendered nodes, and Knowledge Dust continue through shared stopword and renderability checks.
- When a center has a valid concept map, Knowledge Dust is sourced only from that map. Generic dust is used only on the empty landing canvas.

## Visual Direction

- Preserve the current light, low-saturation glass treatment.
- Reduce grid alpha and increase grid spacing so it supplies orientation without reading as a design canvas.
- Keep stars static and sparse, with opacity constrained to `0.02-0.06`.
- Avoid additional animation systems and game-like effects.

## Verification

- Unit-test `orbit` fallback semantics and stopword exclusion.
- Source-level integration-test child click/double-click behavior and dust sourcing.
- Run `npm test`, `npm run check`, and `git diff --check`.
