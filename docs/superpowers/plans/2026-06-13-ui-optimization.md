# Silentium UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Silentium into a cohesive spatial learning interface without changing its business logic.

**Architecture:** Keep the current HTML SPA and native ES module boundaries. Add semantic presentation classes to existing templates, centralize appearance in `css/style.css`, and limit Explore Mode JavaScript changes to layout constants and presentation attributes.

**Tech Stack:** HTML5, Tailwind CSS CDN utilities, native ES modules, CSS custom properties, SVG DOM APIs.

---

### Task 1: Global design system

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] Replace the single-font import with the Silentium display/body pairing.
- [ ] Expand semantic color, radius, shadow, spacing, and motion tokens.
- [ ] Restyle background, navigation, cards, buttons, forms, badges, modals, and empty states.
- [ ] Add keyboard focus and reduced-motion rules.
- [ ] Run `npm run check`.

### Task 2: Content library and training entry

**Files:**
- Modify: `js/content-library.js`
- Modify: `js/app.js`
- Modify: `css/style.css`

- [ ] Add presentation-only classes and richer source/difficulty metadata.
- [ ] Convert library groups into light sections with independent cards.
- [ ] Restyle training material cards as learning workspace entry points.
- [ ] Preserve all button classes, data attributes, and listeners.
- [ ] Run `npm test`.

### Task 3: Listening workstations and word card

**Files:**
- Modify: `js/dictation.js`
- Modify: `js/segmented.js`
- Modify: `js/dictionary.js`
- Modify: `css/style.css`

- [ ] Add workstation wrapper classes to existing training templates.
- [ ] Improve player, textarea, progress, comparison, and timing control hierarchy.
- [ ] Promote Explore as the dictionary card primary action.
- [ ] Keep all existing element IDs and event binding behavior.
- [ ] Run `npm test`.

### Task 4: Explore Mode polish

**Files:**
- Modify: `js/explore-mode.js`
- Modify: `css/style.css`

- [ ] Increase responsive graph footprint without changing graph state.
- [ ] Refine toolbar, search, tooltip, journey panel, and audio card surfaces.
- [ ] Reduce motion when the operating system requests it.
- [ ] Add mobile toolbar and panel adaptations.
- [ ] Run `npm test` and `npm run check`.

### Task 5: Final verification

**Files:**
- Verify: all modified files

- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Inspect `git diff --check`.
- [ ] Review the final diff for accidental logic changes.
