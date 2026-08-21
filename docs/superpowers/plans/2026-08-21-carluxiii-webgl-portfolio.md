# _carluxiii WebGL Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current sliced-image `_carluxiii` preview with a premium static portfolio whose Alpine A110 sequence separates complete semantic car components in a reversible 2.5D/WebGL scroll interaction.

**Architecture:** Keep the site static and GitHub Pages-compatible. HTML/CSS remains responsible for layout, accessibility and fallback content; a small pure-JavaScript scene model owns normalized semantic masks and motion targets; Three.js renders the source photograph and semantic layers; GSAP ScrollTrigger pins the hero scene and maps scroll progress to camera/layer transforms. Binary WebP assets are stored normally in `carluxiii-preview/assets/` using Git blobs instead of the current chunked base64 pattern.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Three.js 0.185.1, GSAP 3.15.0 + ScrollTrigger, Node.js built-in test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-21-carluxiii-webgl-portfolio-design.md`

## Global Constraints

- Brand name remains `_carluxiii`.
- The main frontal Alpine A110 photograph is the signature WebGL scene.
- No rectangular strip slicing may be used for the signature scene.
- Semantic masks use normalized `0..1` coordinates so they remain responsive.
- Reverse scroll must restore the exact original composition at progress `0`.
- WebGL canvas is decorative and `aria-hidden`.
- `prefers-reduced-motion` and WebGL failure must leave a usable static photograph.
- Cap WebGL device pixel ratio at `2` on desktop and `1.5` on mobile.
- Mobile uses fewer semantic layers and smaller Z travel.
- Changes are limited to `carluxiii-preview/**` plus this implementation plan.
- Do not modify root `index.html`, root `styles.css`, `news/**`, feeds, CNAME or VISIONE workflows/automations.
- No build step is required for deployment.

---

## File Structure

- `carluxiii-preview/index.html` — semantic page structure, CDN script/module entry points, static fallback image and accessible portfolio content.
- `carluxiii-preview/styles.css` — editorial layout, canvas stacking, callouts, responsive states, fallback and reduced-motion styling.
- `carluxiii-preview/app.mjs` — page bootstrap, image hydration, lazy scene initialization and non-WebGL interactions.
- `carluxiii-preview/scene-config.mjs` — normalized semantic mask definitions, labels and target exploded transforms.
- `carluxiii-preview/scene-model.mjs` — pure interpolation/validation helpers that are testable without a browser.
- `carluxiii-preview/webgl-scene.mjs` — Three.js renderer, source-texture extraction into semantic canvas textures, camera/parallax and render lifecycle.
- `carluxiii-preview/scroll-scene.mjs` — GSAP/ScrollTrigger pinning and timeline synchronization with the WebGL scene.
- `carluxiii-preview/tests/scene-model.test.mjs` — node:test coverage for mask validity, reversibility and responsive layer selection.
- `carluxiii-preview/assets/a110-front.webp` — optimized frontal source image.
- `carluxiii-preview/assets/work-01.webp`, `work-02.webp`, `work-03.webp` — normal WebP versions of the existing detail photographs.

---

### Task 1: Normal image assets and loader cleanup

**Files:**
- Create: `carluxiii-preview/assets/a110-front.webp`
- Create: `carluxiii-preview/assets/work-01.webp`
- Create: `carluxiii-preview/assets/work-02.webp`
- Create: `carluxiii-preview/assets/work-03.webp`
- Modify: `carluxiii-preview/app.mjs`

**Interfaces:**
- Consumes: original uploaded source photographs and the existing reconstructed `work-01`, `work-02`, `work-03` image bytes.
- Produces: stable relative asset paths `./assets/a110-front.webp`, `./assets/work-01.webp`, `./assets/work-02.webp`, `./assets/work-03.webp`.

- [ ] **Step 1: Reconstruct and optimize the four source photographs locally**

Use Pillow to convert each source to WebP at a maximum long edge of 1920 px, `quality=88`, `method=6`, preserving aspect ratio and no sharpening beyond the source.

- [ ] **Step 2: Verify the binary assets locally**

Run a Pillow probe that opens every generated WebP, prints dimensions and mode, and fails if any image cannot be decoded.

Expected: four decodable RGB/RGBA WebP files with non-zero dimensions.

- [ ] **Step 3: Upload each WebP as a Git blob with `encoding=base64` and attach it under the exact asset path**

Expected: Git tree entries use mode `100644`, type `blob`, and the four exact paths above.

- [ ] **Step 4: Replace the chunked base64 loader in `app.mjs`**

Use direct relative image URLs and remove `IMAGE_PARTS`, `loadImageData()` and the `.b64` fetch/reassembly path.

- [ ] **Step 5: Verify asset references**

Search `carluxiii-preview/` for `.b64`; production HTML/JS must no longer reference chunk files.

- [ ] **Step 6: Commit**

Commit message: `refactor: use normal carluxiii image assets`

---

### Task 2: Pure semantic scene model with tests

**Files:**
- Create: `carluxiii-preview/scene-config.mjs`
- Create: `carluxiii-preview/scene-model.mjs`
- Create: `carluxiii-preview/tests/scene-model.test.mjs`

**Interfaces:**
- Produces: `A110_LAYERS`, `getActiveLayers(viewportWidth)`, `validateNormalizedPolygon(points)`, `interpolateLayer(layer, progress)`, `easeInOutCubic(t)`.
- Consumers: `webgl-scene.mjs` and `scroll-scene.mjs`.

- [ ] **Step 1: Write the failing tests**

Tests must assert:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { A110_LAYERS, getActiveLayers } from '../scene-config.mjs';
import { validateNormalizedPolygon, interpolateLayer } from '../scene-model.mjs';

test('every semantic polygon is normalized and non-rectangular', () => {
  for (const layer of A110_LAYERS) {
    assert.equal(validateNormalizedPolygon(layer.mask), true, layer.id);
    assert.ok(layer.mask.length >= 6, `${layer.id} needs a semantic contour`);
  }
});

test('progress zero perfectly recomposes every layer', () => {
  for (const layer of A110_LAYERS) {
    assert.deepEqual(interpolateLayer(layer, 0), { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, opacity: 1 });
  }
});

test('mobile layer set is smaller than desktop layer set', () => {
  assert.ok(getActiveLayers(390).length < getActiveLayers(1440).length);
});
```

- [ ] **Step 2: Run tests and verify they fail because the modules do not exist**

Run: `node --test carluxiii-preview/tests/scene-model.test.mjs`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement `scene-config.mjs`**

Define semantic regions with normalized polygons for: left outer headlight, left auxiliary lamp, right auxiliary lamp, right outer headlight, A110 plate, center grille/lower intake, hood/central body surface, and optional left/right shoulder accents. Each layer includes desktop target `{x,y,z,rx,ry,rz}` and a `mobile` boolean.

- [ ] **Step 4: Implement `scene-model.mjs`**

`validateNormalizedPolygon(points)` returns false for fewer than 3 points, coordinates outside `0..1`, duplicate-only contours, or axis-aligned four-corner rectangles. `interpolateLayer(layer, progress)` clamps progress and returns zero transforms at `0`, eased target transforms at `1`.

- [ ] **Step 5: Run tests and verify they pass**

Run: `node --test carluxiii-preview/tests/scene-model.test.mjs`

Expected: all tests PASS, zero failures.

- [ ] **Step 6: Commit**

Commit message: `test: define semantic A110 scene model`

---

### Task 3: Three.js semantic texture scene

**Files:**
- Create: `carluxiii-preview/webgl-scene.mjs`
- Modify: `carluxiii-preview/index.html`
- Modify: `carluxiii-preview/styles.css`

**Interfaces:**
- Consumes: `A110_LAYERS`, `getActiveLayers()`, source image element `#a110-source`.
- Produces: `createA110Scene({ host, sourceImage })` returning `{ setProgress(progress), setPointer(nx, ny), resize(), render(), dispose(), isReady }`.

- [ ] **Step 1: Add a static fallback source image and decorative canvas host to `index.html`**

The source photograph remains in normal HTML with meaningful alt text. Add an empty `.a110-webgl-host` overlay with `aria-hidden="true"`.

- [ ] **Step 2: Add canvas/fallback stacking CSS**

The fallback image and WebGL canvas occupy identical aspect-fit geometry. Before `html.webgl-ready`, the source image is fully visible. After ready, the source can fade under the canvas but must remain present in the DOM.

- [ ] **Step 3: Implement Three.js bootstrap**

Import Three.js 0.185.1 from `https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js`. Create `WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })`, transparent scene, perspective camera and responsive resize handling.

- [ ] **Step 4: Implement source photograph plane**

Create a base `PlaneGeometry` carrying the complete exact source image texture. Keep it at `z=0`; progress darkens/desaturates it via material color/opacity rather than destroying pixels.

- [ ] **Step 5: Implement semantic texture extraction**

For each normalized polygon: create an offscreen canvas at the source image's natural size, clip the polygon path, draw the exact source image, convert the canvas to a `CanvasTexture`, and map it onto a plane whose UVs align with the original photograph. Transparent pixels outside the contour ensure the detached piece is irregular rather than rectangular.

- [ ] **Step 6: Implement depth and camera transforms**

`setProgress(progress)` uses `interpolateLayer()` to update independent X/Y/Z offsets and rotations. Base image recedes slightly while the camera eases forward. `setPointer()` applies no more than ~1.2 degrees equivalent camera parallax on fine-pointer desktop devices.

- [ ] **Step 7: Implement render lifecycle**

Cap DPR to `2` desktop / `1.5` mobile, render on progress/pointer/resize changes, dispose geometries/materials/textures, and expose `isReady` only after the source image and all semantic textures are available.

- [ ] **Step 8: Verify module syntax**

Run: `node --check carluxiii-preview/webgl-scene.mjs`

Expected: exit 0.

- [ ] **Step 9: Commit**

Commit message: `feat: add semantic A110 WebGL scene`

---

### Task 4: ScrollTrigger choreography and callouts

**Files:**
- Create: `carluxiii-preview/scroll-scene.mjs`
- Modify: `carluxiii-preview/index.html`
- Modify: `carluxiii-preview/styles.css`
- Modify: `carluxiii-preview/app.mjs`

**Interfaces:**
- Consumes: `createA110Scene()` scene API and DOM nodes in `#a110-deconstruct`.
- Produces: `mountA110ScrollScene({ section, scene })` returning a cleanup function.

- [ ] **Step 1: Load GSAP 3.15.0 and ScrollTrigger 3.15.0 in `index.html`**

Use pinned version URLs from jsDelivr `dist/gsap.min.js` and `dist/ScrollTrigger.min.js`, then register `ScrollTrigger` before mounting the timeline.

- [ ] **Step 2: Replace the old sliced-image markup**

Delete `.slice-stack` and all seven rectangular `.slice` nodes. The deconstruction section contains the canvas host, static fallback photo, progress indicator and semantic callout overlays only.

- [ ] **Step 3: Implement the pinned scrub timeline**

Use `ScrollTrigger.create()` with `trigger: section`, `pin: true`, `start: 'top top'`, `end: '+=220%'`, `scrub: 0.8`. In `onUpdate`, map `self.progress` into staged phases: 0-.18 approach; .18-.62 separation; .62-.82 callout reveal; .82-1 held exploded view.

- [ ] **Step 4: Implement callout choreography**

Show labels only after semantic components have enough separation. Callouts target at least headlight assembly, auxiliary lamp, A110 plate and center intake using thin SVG/DOM leader lines.

- [ ] **Step 5: Implement lazy initialization**

Use IntersectionObserver with a generous root margin so Three.js initializes shortly before the section enters view. On failure, add `webgl-fallback` and leave the static image untouched.

- [ ] **Step 6: Implement reduced-motion path**

If `prefers-reduced-motion: reduce`, do not create ScrollTrigger pinning or pointer parallax. Present the static A110 image and conventional editorial text/callouts.

- [ ] **Step 7: Verify module syntax and pure model tests**

Run:
`node --check carluxiii-preview/app.mjs`
`node --check carluxiii-preview/scroll-scene.mjs`
`node --test carluxiii-preview/tests/scene-model.test.mjs`

Expected: all commands exit 0.

- [ ] **Step 8: Commit**

Commit message: `feat: choreograph A110 scroll deconstruction`

---

### Task 5: Rebuild the surrounding portfolio presentation

**Files:**
- Modify: `carluxiii-preview/index.html`
- Modify: `carluxiii-preview/styles.css`
- Modify: `carluxiii-preview/app.mjs`

**Interfaces:**
- Consumes: normal WebP asset paths and the WebGL section from Tasks 1-4.
- Produces: complete single-page portfolio around the signature interaction.

- [ ] **Step 1: Make the frontal A110 image the opening full-viewport frame**

Keep the `_carluxiii` wordmark refined and cursive; place minimal navigation above photography without oversized UI chrome.

- [ ] **Step 2: Rework the editorial introduction**

Use short positioning copy focused on automotive form, light, material and detail. Keep text widths restrained and avoid fake statistics or invented clients.

- [ ] **Step 3: Rebuild selected work using the three detail photos**

Use asymmetric editorial framing, modest parallax/scale, and no card-like borders that compete with the images.

- [ ] **Step 4: Add two secondary semantic detail interactions**

Use lightweight DOM masks/clip-paths for the Sabelt tag/stitching and tricolour badge/intake. These are shorter than the A110 scene and never use rectangular strip separation.

- [ ] **Step 5: Keep contact data honest**

Do not invent email, social handles, years of experience, client counts or location. Use a neutral commission CTA until real details are provided.

- [ ] **Step 6: Verify responsive CSS manually by static inspection**

Check breakpoints at approximately 390, 768, 1024 and 1440 CSS pixels for overflow-prone absolute elements, canvas sizing and callout collisions.

- [ ] **Step 7: Commit**

Commit message: `feat: refine carluxiii editorial portfolio`

---

### Task 6: Verification, isolation and deployment

**Files:**
- No new production files unless verification reveals a defect.

**Interfaces:**
- Consumes: complete preview.
- Produces: verified commit on `main` and public preview path.

- [ ] **Step 1: Run all local static checks**

Run:
`node --test carluxiii-preview/tests/*.test.mjs`
`node --check carluxiii-preview/app.mjs`
`node --check carluxiii-preview/scene-config.mjs`
`node --check carluxiii-preview/scene-model.mjs`
`node --check carluxiii-preview/webgl-scene.mjs`
`node --check carluxiii-preview/scroll-scene.mjs`

Expected: zero failures and all syntax checks exit 0.

- [ ] **Step 2: Verify no production references to the old slicing effect remain**

Search for `data-slice`, `slice-stack`, `--clip-l`, and `--clip-r` under `carluxiii-preview/`.

Expected: no production matches.

- [ ] **Step 3: Compare repository range against the pre-rebuild commit**

Expected changed production files are limited to `carluxiii-preview/**`; documentation changes are limited to `docs/superpowers/plans/**` and the already-approved spec path.

- [ ] **Step 4: Verify GitHub contents**

Fetch `carluxiii-preview/` from `main` and confirm the expected new modules and four normal WebP assets exist.

- [ ] **Step 5: Verify public path when Pages has propagated**

Check `https://visione.one/carluxiii-preview/`. If the execution environment cannot render WebGL, report that limitation explicitly instead of claiming visual verification.

- [ ] **Step 6: Manually inspect on a real desktop/mobile browser when available**

Acceptance: complete semantic components separate in depth; reverse scroll recomposes; there are no rectangular image strips; fallback remains readable; mobile does not jank or overflow.

- [ ] **Step 7: Final commit if verification fixes were needed**

Commit message: `fix: polish carluxiii WebGL preview`
