# VISIONE Institutional Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the VISIONE coming-soon page with a complete light-theme institutional website.

**Architecture:** Preserve the repository's dependency-free static architecture. `index.html` owns semantic content and navigation; `styles.css` owns brand tokens, responsive layout, motion, and states; a Node built-in test validates the public contract.

**Tech Stack:** HTML5, CSS3, Node.js built-in test runner

**Spec:** `docs/superpowers/specs/2026-09-02-visione-institutional-redesign-design.md`

## Global Constraints

- Preserve `assets/visione-logo.webp` and `CNAME`.
- Theme is light, elegant, and based on VISIONE blue/cyan/violet.
- Do not use yellow.
- Keep GitHub Pages compatibility and add no runtime dependencies.
- Direct editorial traffic to `https://wire.visione.one`.

---

### Task 1: Institutional content contract

**Files:**
- Create: `tests/site.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing logo at `assets/visione-logo.webp`
- Produces: semantic sections with IDs `services`, `approach`, `about`, and `contact`

- [ ] Write tests asserting the brand, sections, Wire URL, mail contact, logo path, and removal of coming-soon copy.
- [ ] Run `node --test tests/site.test.mjs` and confirm it fails because the institutional sections are missing.
- [ ] Replace the temporary HTML with the complete semantic institutional page.
- [ ] Run `node --test tests/site.test.mjs` and confirm it passes.

### Task 2: Light visual system and responsive layout

**Files:**
- Modify: `tests/site.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: class names and section IDs in `index.html`
- Produces: responsive light-theme presentation with reduced-motion behavior

- [ ] Add tests asserting light theme metadata, required responsive CSS, reduced-motion support, and no yellow color tokens.
- [ ] Run `node --test tests/site.test.mjs` and confirm the new assertions fail.
- [ ] Implement the full visual system, layouts, component states, and responsive rules.
- [ ] Run `node --test tests/site.test.mjs` and confirm all tests pass.
- [ ] Validate the final HTML using a production-focused static check and review the diff.

