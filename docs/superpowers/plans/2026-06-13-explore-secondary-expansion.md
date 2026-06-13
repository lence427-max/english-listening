# Explore Secondary Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable high-quality `planet -> orbit` exploration with useful child-word cards, contextual Knowledge Dust, and a softer nebula background.

**Architecture:** Extend the existing shared concept quality module with an `orbit` fallback, then reuse the current Explore Mode card and flight path. Keep semantic filtering centralized and make visual changes through existing SVG/CSS layers.

**Tech Stack:** Native ES modules, SVG DOM APIs, CSS, Node test runner.

---

### Task 1: Orbit Semantic Fallback

**Files:**
- Modify: `js/concept-quality.js`
- Modify: `tests/concept-quality.test.mjs`

- [ ] Add a failing test asserting that `getSemanticFallback('orbit')` includes `gravity`, `satellite`, `rotation`, `revolution`, `path`, and `spacecraft`, and excludes stopwords.
- [ ] Run `node --test tests/concept-quality.test.mjs` and confirm the missing fallback failure.
- [ ] Add the curated `orbit` concept map with Chinese meanings, definitions, insight, categories, and bridges.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Child Explanation Card and Flight

**Files:**
- Modify: `js/explore-mode.js`
- Modify: `tests/explore-quality-integration.test.mjs`

- [ ] Add failing source integration assertions that a word node supplies its semantic fields to the click card and still calls `flyToWord()` on double click.
- [ ] Run the focused integration test and confirm the explanation-card assertion fails.
- [ ] Change the current card renderer so it opens even when no material occurrence exists and displays word, Chinese meaning, definition, and relation before optional source rows.
- [ ] Preserve the current `savePathMarkers()` and `flyToWord()` transition.

### Task 3: Contextual Dust and Softer Background

**Files:**
- Modify: `js/explore-mode.js`
- Modify: `css/style.css`
- Modify: `tests/explore-quality-integration.test.mjs`

- [ ] Add failing assertions for shared candidate cleaning in Knowledge Dust and star opacity within `0.02-0.06`.
- [ ] Build Knowledge Dust only from the sanitized current concept map when a center is active.
- [ ] Render generic dust only when no center exists.
- [ ] Reduce grid alpha, enlarge grid spacing, and set star opacity to `0.02-0.06`.

### Task 4: Verification

**Files:**
- Verify all changed files.

- [ ] Run `npm.cmd test` and require all tests to pass.
- [ ] Run `npm.cmd run check` and require exit code 0.
- [ ] Run `git diff --check` and require exit code 0.
