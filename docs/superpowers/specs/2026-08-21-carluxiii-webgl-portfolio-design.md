# _carluxiii WebGL Portfolio Preview — Design

Date: 2026-08-21
Status: approved direction, implementation pending final spec review

## Goal

Rebuild `carluxiii-preview/` as a premium automotive-photography portfolio whose signature interaction is a genuine semantic 2.5D/WebGL deconstruction, not rectangular image slicing. The preview remains isolated from the public VISIONE homepage, news, RSS, sitemap, and automations.

## Visual direction

- Brand: `_carluxiii`
- Mood: dark European editorial luxury, restrained, cinematic, tactile
- Typography: delicate cursive wordmark paired with high-contrast editorial serif and minimal sans-serif UI
- Photography remains the hero. UI should never overpower the frames.
- New frontal Alpine A110 photograph becomes the main immersive sequence.
- Existing three detail photographs remain portfolio material.

## Recommended technical approach

Use a static GitHub Pages-compatible implementation with no build step:

- HTML/CSS for layout, typography, accessibility, responsive behavior and non-WebGL fallback.
- Three.js for the signature canvas-based 2.5D scene.
- GSAP + ScrollTrigger for pinned sections and scroll-scrubbed timelines.
- Runtime semantic texture extraction: the source photograph is loaded once, meaningful vehicle regions are cut into transparent canvases using hand-authored polygon masks, then uploaded as independent WebGL textures. This preserves the original pixels while avoiding crude rectangular slicing.
- A dimmed/desaturated base photograph stays behind the exploded pieces as a visual ghost plate, preventing visible holes while the selected regions move in depth.
- Reduced-motion and WebGL-failure fallbacks keep the original photograph static and fully usable.

This is preferred over pre-rendered PNG layers because it keeps the preview self-contained, preserves the exact photography, and makes iteration on masks/animation possible in code.

## Signature scene: Alpine A110 frontal frame

The scene begins as the untouched photograph. During a pinned scroll sequence:

1. Camera eases toward the car and the surrounding showroom darkens.
2. The base image becomes subtly desaturated and recedes.
3. Semantic regions separate from the original frame:
   - left headlight assembly
   - right headlight assembly
   - left auxiliary lamp
   - right auxiliary lamp
   - center grille / lower intake
   - A110 plate
   - hood / central body surface
   - mirror / shoulder accents where useful
4. Each region receives an independent `x/y/z` offset and small rotation, with different easing and stagger.
5. Fine callout lines and labels appear only after enough depth separation exists.
6. Pointer movement introduces a small camera parallax on desktop.
7. Reverse scrolling perfectly recomposes the photograph.

The exploded layout must feel like an engineered diagram suspended in space, not a stack of cards.

## Secondary photo interactions

The three original detail photographs will use shorter sequences:

- seat / Sabelt frame: emphasis on tag, stitching field and metallic control
- tricolour exterior frame: badge, intake and trim surfaces
- interior Alpine frame: emblem/control pod and surrounding materials

These scenes can use lighter DOM/CSS perspective or smaller WebGL semantic layers depending on performance. The full Three.js treatment is reserved for the frontal hero sequence.

## Page structure

1. Minimal fixed header with cursive `_carluxiii` wordmark.
2. Full-viewport opening frame using the frontal A110 image.
3. Short editorial statement / photographer positioning.
4. Selected-work gallery with the existing three photographs.
5. Main pinned WebGL deconstruction sequence using the frontal A110 image.
6. Two compact detail studies with controlled depth/parallax.
7. Closing commission/contact section.

## Asset strategy

- Add the new frontal A110 photograph under `carluxiii-preview/assets/` as an optimized WebP while retaining enough resolution for fullscreen use.
- Replace the current split `.b64` storage pattern with normal image assets where connector limits permit. If upload constraints require chunked storage, reconstruction remains an internal loading detail and must not affect render quality.
- Existing source photographs are not modified destructively.

## Performance

- Cap WebGL pixel ratio on high-density screens.
- Lazy-init the Three.js scene shortly before it enters the viewport.
- Dispose textures/materials if the scene is torn down.
- Use requestAnimationFrame only while animation is active or pointer motion requires rendering.
- Mobile gets fewer exploded layers, smaller Z travel, and no unnecessary pointer effects.
- Respect `prefers-reduced-motion`.

## Accessibility and fallback

- All portfolio images retain meaningful alt text in the DOM.
- The WebGL canvas is decorative and `aria-hidden`.
- If Three.js, GSAP, CDN loading, or WebGL fails, the source photograph remains visible with conventional scroll content.
- Keyboard navigation and contact links remain normal HTML.

## Isolation / safety

Files changed should remain limited to:

- `carluxiii-preview/**`
- this design spec under `docs/superpowers/specs/**`

Do not modify:

- root `index.html`
- root `styles.css`
- `news/**`
- RSS/feed files
- VISIONE automations/workflows
- CNAME

## Verification

Before calling the rebuild complete:

- validate that the preview files are present on `main`
- verify no files outside the approved paths changed
- verify JavaScript modules parse
- verify the semantic mask coordinates are normalized/responsive
- verify reduced-motion fallback path
- verify the public preview path resolves once GitHub Pages updates
- manually inspect desktop and mobile renders when a browser-capable preview is available

## Success criteria

The main Alpine scene must visibly preserve complete meaningful car components while they separate in depth. No effect may read as rectangular strips of the original photograph. The interaction should remain reversible by scroll and should preserve the photographer's exact original image as the visual source.