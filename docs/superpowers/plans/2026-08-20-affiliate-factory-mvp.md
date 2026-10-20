# Affiliate Factory MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build an isolated, deterministic pipeline that converts manually supplied Shopee affiliate product bundles into quality-gated vertical videos and safely publishes normal TikTok posts through Buffer.

**Architecture:** A standalone TypeScript package under affiliate-factory owns versioned contracts, deterministic planning, Remotion rendering, FFmpeg validation, R2 storage, publishing, receipts, and reporting. Ports isolate storage and external publishers; the runner persists monotonic state and idempotency records in a private R2 bucket while exposing only approved videos from a separate public bucket.

**Tech Stack:** Node.js 22+, npm, TypeScript 7.0.2, Zod 4.4.3, Vitest 4.1.11, Remotion 4.0.514, React 19.2.8, ffmpeg-static 5.3.0, ffprobe-static 3.1.0, AWS SDK S3 client 3.1115.0, Execa 10.0.1, YAML 2.9.0, tsx 4.23.12.

**Spec:** docs/superpowers/specs/2026-08-20-affiliate-factory-mvp-design.md

## Global Constraints

- All runtime code, tests, fixtures, and package configuration live under affiliate-factory/.
- The only runtime file outside that directory is .github/workflows/affiliate-factory-manual.yml.
- Do not modify the VISIONE HTML, CSS, assets, pages, CNAME, deployment, or existing workflows.
- Input is manual: the operator supplies the affiliate link, verified facts, and media with provenance.
- Do not crawl, scrape, open, or download from Shopee product pages.
- Do not use OpenAI APIs, SDKs, keys, paid generative runtimes, or Codex at runtime.
- Normal TikTok through Buffer is the only enabled publisher.
- TikTok Shop and Shopee publisher adapters remain disabled.
- GitHub Actions remains workflow_dispatch-only; no cron.
- Publication defaults off and is enabled only with publish=true on an explicit production run.
- Private inputs, state, receipts, rejected media, and diagnostics use R2_PRIVATE_BUCKET.
- Only final/publication objects use R2_PUBLIC_BUCKET and R2_PUBLIC_BASE_URL.
- Never print secret values, authorization headers, full environment dumps, or signed request details.
- A confirmed publication key is never submitted again.
- An ambiguous Buffer outcome enters needs_reconciliation and is never retried automatically.
- Use npm.cmd for local Windows commands and npm inside GitHub Actions.

## File Map

- affiliate-factory/package.json: isolated scripts and pinned dependencies.
- affiliate-factory/package-lock.json: reproducible install.
- affiliate-factory/tsconfig.json: strict source/test TypeScript configuration.
- affiliate-factory/tsconfig.build.json: production output configuration.
- affiliate-factory/vitest.config.ts: unit and integration test boundaries.
- affiliate-factory/src/contracts/: versioned Zod schemas and inferred types.
- affiliate-factory/src/config.ts: redacted environment parsing.
- affiliate-factory/src/intake/: manual bundle loader, URL allowlist, and provenance validation.
- affiliate-factory/src/identity/: canonical JSON, hashes, video ID, and publication key.
- affiliate-factory/src/state/: state machine, event log, and idempotency store.
- affiliate-factory/src/creative/: deterministic base plan and TikTok variant.
- affiliate-factory/src/render/remotion/: composition, layout metadata, and root.
- affiliate-factory/src/render/: Remotion renderer and FFmpeg normalizer.
- affiliate-factory/src/quality/: FFprobe parser, safe-zone checks, and quality gate.
- affiliate-factory/src/storage/: MediaStore port and filesystem/R2 adapters.
- affiliate-factory/src/publish/: Publisher port, Buffer implementation, and disabled adapters.
- affiliate-factory/src/reporting/: Telegram report formatting and transport.
- affiliate-factory/src/pipeline/: runner, retry policy, and stage orchestration.
- affiliate-factory/src/cli.ts: validate, render, dry-run, and production commands.
- affiliate-factory/fixtures/product-test/: non-publishable fixture and repository-created SVG assets.
- affiliate-factory/tests/: unit, adapter, render, and end-to-end tests.
- affiliate-factory/docs/operations.md: setup, daily manual input, recovery, and extension guide.
- .github/workflows/affiliate-factory-manual.yml: isolated manual workflow.

---

### Task 1: Isolated package and test harness

**Files:**
- Create: affiliate-factory/package.json
- Create: affiliate-factory/tsconfig.json
- Create: affiliate-factory/tsconfig.build.json
- Create: affiliate-factory/vitest.config.ts
- Create: affiliate-factory/.gitignore
- Create: affiliate-factory/src/index.ts
- Create: affiliate-factory/tests/smoke/package-boundary.test.ts

**Interfaces:**
- Consumes: none.
- Produces: npm scripts test, typecheck, build, render:fixture, dry-run, and start; strict ESM TypeScript package.

- [ ] **Step 1: Create the isolated package metadata**

Write affiliate-factory/package.json:

~~~json
{
  "name": "@visione/affiliate-factory",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "build": "tsc -p tsconfig.build.json",
    "render:fixture": "tsx src/cli.ts render --bundle fixtures/product-test",
    "dry-run": "tsx src/cli.ts run --bundle fixtures/product-test --mode dry-run",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "3.1115.0",
    "@remotion/bundler": "4.0.514",
    "@remotion/renderer": "4.0.514",
    "execa": "10.0.1",
    "ffmpeg-static": "5.3.0",
    "ffprobe-static": "3.1.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "remotion": "4.0.514",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "26.2.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "tsx": "4.23.12",
    "typescript": "7.0.2",
    "vitest": "4.1.11",
    "yaml": "2.9.0"
  }
}
~~~

- [ ] **Step 2: Add strict TypeScript and Vitest configuration**

Set module and moduleResolution to NodeNext, target ES2023, strict to true, noUncheckedIndexedAccess to true, exactOptionalPropertyTypes to true, rootDir to ., and build output to dist. Configure Vitest for tests/**/*.test.ts with a 30-second default timeout and fork isolation.

- [ ] **Step 3: Write the failing package boundary test**

~~~ts
import {describe, expect, it} from 'vitest';
import packageJson from '../../package.json' with {type: 'json'};
import {AFFILIATE_FACTORY_VERSION} from '../../src/index.js';

describe('package boundary', () => {
  it('is private and requires Node 22 without OpenAI dependencies', () => {
    expect(packageJson.private).toBe(true);
    expect(packageJson.engines.node).toBe('>=22');
    expect(Object.keys(packageJson.dependencies)).not.toContain('openai');
    expect(AFFILIATE_FACTORY_VERSION).toBe('0.1.0');
  });
});
~~~

- [ ] **Step 4: Install dependencies and run the failing test**

Run: cd affiliate-factory; npm.cmd install; npm.cmd test -- tests/smoke/package-boundary.test.ts

Expected: FAIL with module-not-found for src/index.js.

- [ ] **Step 5: Add the minimal package entrypoint and finish configuration**

Write affiliate-factory/src/index.ts:

~~~ts
export const AFFILIATE_FACTORY_VERSION = '0.1.0';
~~~

Write affiliate-factory/tsconfig.json with compilerOptions target ES2023, module NodeNext, moduleResolution NodeNext, strict true, noUncheckedIndexedAccess true, exactOptionalPropertyTypes true, resolveJsonModule true, jsx react-jsx, types [node, vitest/globals], and include src, tests, and vitest.config.ts. Write tsconfig.build.json extending it, excluding tests, and emitting declarations plus JavaScript to dist. Configure Vitest with include tests/**/*.test.ts, environment node, testTimeout 30000, hookTimeout 30000, pool forks, and isolate true.

- [ ] **Step 6: Verify package isolation**

Run: cd affiliate-factory; npm.cmd test -- tests/smoke/package-boundary.test.ts; npm.cmd run typecheck; npm.cmd run build

Expected: all commands exit 0 and no file outside affiliate-factory/ changes.

- [ ] **Step 7: Commit**

Run:

~~~powershell
git add -- affiliate-factory/package.json affiliate-factory/package-lock.json affiliate-factory/tsconfig.json affiliate-factory/tsconfig.build.json affiliate-factory/vitest.config.ts affiliate-factory/.gitignore affiliate-factory/src/index.ts affiliate-factory/tests/smoke/package-boundary.test.ts
git commit -m "build: bootstrap isolated Affiliate Factory package"
~~~

### Task 2: Versioned contracts and manual bundle intake

**Files:**
- Create: affiliate-factory/src/contracts/common.ts
- Create: affiliate-factory/src/contracts/product-manifest.ts
- Create: affiliate-factory/src/contracts/creative.ts
- Create: affiliate-factory/src/contracts/render.ts
- Create: affiliate-factory/src/contracts/publish.ts
- Create: affiliate-factory/src/contracts/run-event.ts
- Create: affiliate-factory/src/contracts/index.ts
- Create: affiliate-factory/src/intake/shopee-url.ts
- Create: affiliate-factory/src/intake/manual-bundle.ts
- Create: affiliate-factory/fixtures/product-test/manifest.json
- Create: affiliate-factory/fixtures/product-test/assets/product-card.svg
- Create: affiliate-factory/tests/helpers/factories.ts
- Create: affiliate-factory/tests/contracts/contracts.test.ts
- Create: affiliate-factory/tests/intake/manual-bundle.test.ts

**Interfaces:**
- Consumes: Node filesystem and Zod.
- Produces: ProductManifest, BaseCreativePlan, ChannelCreativeVariant, RenderResult, QualityGateResult, PublishRequest, PublishReceipt, RunEvent; loadManualBundle(bundleDir): Promise<ProductManifest>.

- [ ] **Step 1: Write failing schema tests**

~~~ts
import {describe, expect, it} from 'vitest';
import {ProductManifestSchema} from '../../src/contracts/index.js';

describe('ProductManifestSchema', () => {
  it('accepts a fixture but marks it permanently non-publishable', () => {
    const parsed = ProductManifestSchema.parse({
      schemaVersion: '1.0.0',
      purpose: 'fixture',
      productId: 'fixture-product',
      productName: 'Produto demonstrativo - nao publicar',
      affiliateUrl: 'https://s.shopee.com.br/fixture-link',
      currency: 'BRL',
      currentPriceMinor: 0,
      benefits: ['Fixture interna sem alegacao comercial'],
      assets: [{
        id: 'card',
        kind: 'image',
        file: 'assets/product-card.svg',
        provenance: {sourceType: 'repository-created', source: 'fixtures/product-test'}
      }],
      cta: 'Fixture interna - nao publicar',
      caption: 'TESTE INTERNO - NAO PUBLICAR'
    });
    expect(parsed.purpose).toBe('fixture');
  });

  it('rejects a production item without positive price or provenance', () => {
    expect(() => ProductManifestSchema.parse({
      schemaVersion: '1.0.0',
      purpose: 'production',
      productId: 'bad',
      productName: 'Produto',
      affiliateUrl: 'https://example.com/item',
      currency: 'BRL',
      currentPriceMinor: 0,
      benefits: ['Beneficio'],
      assets: [],
      cta: 'Veja o link',
      caption: 'Produto'
    })).toThrow();
  });
});
~~~

- [ ] **Step 2: Run schema tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/contracts/contracts.test.ts

Expected: FAIL with module-not-found for src/contracts/index.js.

- [ ] **Step 3: Implement the schemas**

Use a discriminated union on purpose. Production manifests require currentPriceMinor greater than zero, at least one asset, an allowed Shopee URL, non-empty provenance, and non-empty CTA/caption. Fixture manifests allow zero price but remain ineligible for PublishRequestSchema.

Implement the shared money and asset schema as:

~~~ts
import {z} from 'zod';

export const SchemaVersion = z.literal('1.0.0');
export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['image', 'video']),
  file: z.string().min(1).refine((value) => !value.includes('..'), 'Asset path cannot traverse'),
  provenance: z.object({
    sourceType: z.enum(['operator-supplied', 'repository-created']),
    source: z.string().min(1),
    originalUrl: z.url().optional()
  })
});
~~~

Export all inferred types from contracts/index.ts. Add explicit literal versions to every required contract. Define RunSummarySchema beside RunEventSchema as the aggregate status input used by reporting. In tests/helpers/factories.ts, define makeProductionManifest(), makeFixtureManifest(), makeTikTokVariant(), makeRenderResult(), makeValidProbe(), makeLayoutEvidence(), makePublishRequest(), and makeRunSummary(). Each returns a complete schema-valid object with fixed IDs and timestamps. Tests import these factories instead of relying on ambient variables.

- [ ] **Step 4: Write failing manual bundle tests**

~~~ts
import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {loadManualBundle} from '../../src/intake/manual-bundle.js';

describe('loadManualBundle', () => {
  it('loads the checked-in fixture and verifies every asset exists', async () => {
    const manifest = await loadManualBundle(resolve('fixtures/product-test'));
    expect(manifest.productId).toBe('fixture-product');
    expect(manifest.assets).toHaveLength(1);
  });

  it('does not make network requests or follow affiliate redirects', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error('network access is forbidden during intake');
    };
    try {
      await expect(loadManualBundle(resolve('fixtures/product-test'))).resolves.toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
~~~

- [ ] **Step 5: Run intake tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/intake/manual-bundle.test.ts

Expected: FAIL with module-not-found for manual-bundle.js.

- [ ] **Step 6: Implement manual-only intake**

Implement isAllowedShopeeAffiliateUrl(url): boolean using URL parsing and an exact lowercase allowlist containing shopee.com.br, www.shopee.com.br, and s.shopee.com.br. Do not fetch or resolve the URL.

Implement loadManualBundle:

~~~ts
export async function loadManualBundle(bundleDir: string): Promise<ProductManifest> {
  const raw = await readFile(join(bundleDir, 'manifest.json'), 'utf8');
  const manifest = ProductManifestSchema.parse(JSON.parse(raw));
  for (const asset of manifest.assets) {
    const absolute = resolve(bundleDir, asset.file);
    if (!absolute.startsWith(resolve(bundleDir) + sep)) {
      throw new IntakeError('ASSET_PATH_ESCAPE', asset.file);
    }
    await access(absolute);
  }
  return manifest;
}
~~~

- [ ] **Step 7: Create the non-publishable fixture**

Create a repository-authored SVG product card with a 1080 x 1350 gradient background, a geometric box illustration, and only the text PRODUTO DEMONSTRATIVO and NAO PUBLICAR. Set manifest purpose to fixture and provenance to repository-created. Do not use a real product, price, brand, or commercial claim.

- [ ] **Step 8: Verify contracts and intake**

Run: cd affiliate-factory; npm.cmd test -- tests/contracts tests/intake; npm.cmd run typecheck

Expected: PASS.

- [ ] **Step 9: Commit**

Stage only the files listed in Task 2 and commit:

~~~powershell
git commit -m "feat: add versioned contracts and manual intake"
~~~

### Task 3: Stable identity, state machine, and idempotency

**Files:**
- Create: affiliate-factory/src/identity/canonical-json.ts
- Create: affiliate-factory/src/identity/content-identity.ts
- Create: affiliate-factory/src/state/pipeline-state.ts
- Create: affiliate-factory/src/state/idempotency-store.ts
- Create: affiliate-factory/tests/identity/content-identity.test.ts
- Create: affiliate-factory/tests/state/pipeline-state.test.ts
- Create: affiliate-factory/tests/state/idempotency-store.test.ts

**Interfaces:**
- Consumes: ProductManifest and MediaStore JSON operations.
- Produces: canonicalJson(value): string; createContentHash(manifest): string; createVideoId(input): string; createPublicationKey(input): string; transition(current, event): PipelineState; IdempotencyStore.

- [ ] **Step 1: Write failing identity tests**

~~~ts
it('creates the same content hash regardless of object key order', () => {
  expect(sha256Hex(canonicalJson({b: 2, a: 1})))
    .toBe(sha256Hex(canonicalJson({a: 1, b: 2})));
});

it('separates publication keys by channel', () => {
  const base = {videoId: 'vid_123', contentHash: 'abc'};
  expect(createPublicationKey({...base, channel: 'tiktok'}))
    .not.toBe(createPublicationKey({...base, channel: 'tiktok-shop'}));
});
~~~

- [ ] **Step 2: Run identity tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/identity/content-identity.test.ts

Expected: FAIL because the identity functions do not exist.

- [ ] **Step 3: Implement canonical identity**

Canonicalize null, booleans, strings, finite numbers, arrays in order, and objects with sorted keys. Reject undefined, functions, symbols, non-finite numbers, and cyclic structures. Use node:crypto SHA-256 hex output.

Create video IDs as vid_ plus the first 20 hexadecimal characters of SHA-256 over productId, contentHash, templateVersion, and rendererVersion. Create publication keys from channel, videoId, and contentHash exactly as specified.

- [ ] **Step 4: Write failing state transition tests**

~~~ts
it('allows the happy path and rejects backward movement', () => {
  expect(transition('received', 'VALIDATED')).toBe('validated');
  expect(() => transition('qa_passed', 'RENDERED')).toThrow('ILLEGAL_STATE_TRANSITION');
});

it('never retries an ambiguous submission automatically', () => {
  expect(transition('submitting', 'SUBMISSION_AMBIGUOUS')).toBe('needs_reconciliation');
  expect(() => transition('needs_reconciliation', 'SUBMIT')).toThrow('ILLEGAL_STATE_TRANSITION');
});
~~~

- [ ] **Step 5: Implement the pure state machine and IdempotencyStore**

Define the exact states and events from the spec. IdempotencyStore exposes:

~~~ts
export interface IdempotencyStore {
  find(publicationKey: string): Promise<PublishReceipt | null>;
  markSubmitting(publicationKey: string, request: PublishRequest): Promise<void>;
  saveReceipt(publicationKey: string, receipt: PublishReceipt): Promise<void>;
}
~~~

The in-memory implementation must reject a second markSubmitting for the same key. The persistent implementation is added with R2 in Task 7.

- [ ] **Step 6: Verify identity and state**

Run: cd affiliate-factory; npm.cmd test -- tests/identity tests/state; npm.cmd run typecheck

Expected: PASS.

- [ ] **Step 7: Commit**

Stage only Task 3 files and commit:

~~~powershell
git commit -m "feat: add content identity and pipeline state machine"
~~~

### Task 4: Deterministic creative plan and TikTok variant

**Files:**
- Create: affiliate-factory/src/creative/base-plan.ts
- Create: affiliate-factory/src/creative/tiktok-variant.ts
- Create: affiliate-factory/src/intake/product-hunter.ts
- Create: affiliate-factory/tests/creative/base-plan.test.ts
- Create: affiliate-factory/tests/creative/tiktok-variant.test.ts
- Create: affiliate-factory/tests/intake/product-hunter.test.ts

**Interfaces:**
- Consumes: ProductManifest.
- Produces: createBaseCreativePlan(manifest): BaseCreativePlan; createTikTokVariant(manifest, base): ChannelCreativeVariant; disabled ProductHunter port.

- [ ] **Step 1: Write failing creative tests**

~~~ts
it('uses only supplied facts and places CTA before render', () => {
  const productionManifest = makeProductionManifest();
  const plan = createBaseCreativePlan(productionManifest);
  const serialized = JSON.stringify(plan);
  expect(serialized).toContain(productionManifest.productName);
  expect(serialized).toContain(productionManifest.benefits[0]);
  expect(serialized).not.toContain('melhor do mercado');

  const variant = createTikTokVariant(productionManifest, plan);
  expect(variant.channel).toBe('tiktok');
  expect(variant.cta).toBe(productionManifest.cta);
  expect(variant.width).toBe(1080);
  expect(variant.height).toBe(1920);
  expect(variant.fps).toBe(30);
});
~~~

- [ ] **Step 2: Run creative tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/creative

Expected: FAIL because the planner functions do not exist.

- [ ] **Step 3: Implement the deterministic planners**

Build five timed sections: hook, product, benefits, price, CTA. Derive section duration from requested duration constrained to 10-25 seconds. Limit headline to 70 characters, at most three supplied benefits, and caption to 2,200 characters. Never synthesize facts; truncate with a visible-safe word boundary.

Define safe zones in pixels as top 180, right 150, bottom 300, and left 90. Put all text boxes inside these boundaries.

- [ ] **Step 4: Implement the disabled ProductHunter boundary**

~~~ts
export interface ProductHunter {
  discover(): Promise<never>;
}

export class DisabledShopeeProductHunter implements ProductHunter {
  async discover(): Promise<never> {
    throw new ProductHunterDisabledError(
      'SHOPEE_AUTOMATED_DISCOVERY_NOT_AUTHORIZED'
    );
  }
}
~~~

Test that it performs no fetch and returns the stable error code.

- [ ] **Step 5: Verify creative planning**

Run: cd affiliate-factory; npm.cmd test -- tests/creative tests/intake/product-hunter.test.ts; npm.cmd run typecheck

Expected: PASS.

- [ ] **Step 6: Commit**

Stage only Task 4 files and commit:

~~~powershell
git commit -m "feat: add deterministic TikTok creative planning"
~~~

### Task 5: Remotion composition and fixture renderer

**Files:**
- Create: affiliate-factory/src/render/remotion/Root.tsx
- Create: affiliate-factory/src/render/remotion/CommercialVertical.tsx
- Create: affiliate-factory/src/render/remotion/layout.ts
- Create: affiliate-factory/src/render/remotion/index.ts
- Create: affiliate-factory/src/render/remotion-entry.tsx
- Create: affiliate-factory/src/render/remotion-renderer.ts
- Create: affiliate-factory/tests/render/layout.test.ts
- Create: affiliate-factory/tests/render/remotion-renderer.test.ts

**Interfaces:**
- Consumes: ChannelCreativeVariant and resolved local asset paths.
- Produces: LayoutEvidence and RemotionRenderer.render(input): Promise<RenderResult>.

- [ ] **Step 1: Write failing layout tests**

~~~ts
it('keeps every text box inside the TikTok safe zone', () => {
  const fixtureVariant = makeTikTokVariant();
  const evidence = calculateLayout(fixtureVariant);
  for (const box of evidence.textBoxes) {
    expect(box.x).toBeGreaterThanOrEqual(90);
    expect(box.y).toBeGreaterThanOrEqual(180);
    expect(box.x + box.width).toBeLessThanOrEqual(930);
    expect(box.y + box.height).toBeLessThanOrEqual(1620);
  }
});
~~~

- [ ] **Step 2: Run layout tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/render/layout.test.ts

Expected: FAIL because calculateLayout does not exist.

- [ ] **Step 3: Implement layout evidence**

Return explicit boxes for headline, product name, price, benefits, CTA, and disclosure. Include maxLines, fontSize, lineHeight, measuredCharacterLimit, and section frame boundaries. Reject plans that exceed template capacity before Remotion starts.

- [ ] **Step 4: Build the single commercial template**

Use AbsoluteFill, Img, Sequence, interpolate, spring, and Easing from Remotion. Implement slow image push-in, restrained card transitions, price emphasis, benefit chips, and a final CTA. Keep backgrounds, typography, and branding data-driven. Do not add network-loaded fonts or remote media.

- [ ] **Step 5: Write failing renderer test**

~~~ts
it('renders the fixture to an MP4 and returns its SHA-256 hash', async () => {
  const fixtureVariant = makeTikTokVariant();
  const result = await renderer.render({
    variant: fixtureVariant,
    bundleDir: fixtureDir,
    outputPath
  });
  expect(result.schemaVersion).toBe('1.0.0');
  expect(result.outputPath).toBe(outputPath);
  expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  expect((await stat(outputPath)).size).toBeGreaterThan(1000);
}, 120_000);
~~~

- [ ] **Step 6: Implement RemotionRenderer**

Bundle remotion-entry.tsx with @remotion/bundler, select the commercial-vertical composition, and call renderMedia with codec h264, pixelFormat yuv420p, crf 18, imageFormat jpeg, and the exact input props. Write output under a caller-provided temporary directory and return RenderResult with width, height, FPS, frame count, duration, and SHA-256.

- [ ] **Step 7: Verify fixture render**

Run: cd affiliate-factory; npm.cmd test -- tests/render; npm.cmd run typecheck

Expected: PASS and a test MP4 exists only in the ignored temporary test directory.

- [ ] **Step 8: Commit**

Stage only Task 5 files and commit:

~~~powershell
git commit -m "feat: add commercial vertical Remotion renderer"
~~~

### Task 6: FFmpeg normalization, FFprobe, and quality gate

**Files:**
- Create: affiliate-factory/src/render/ffmpeg-normalizer.ts
- Create: affiliate-factory/src/render/media-binaries.ts
- Create: affiliate-factory/src/quality/ffprobe.ts
- Create: affiliate-factory/src/quality/safe-zones.ts
- Create: affiliate-factory/src/quality/quality-gate.ts
- Create: affiliate-factory/tests/quality/ffprobe.test.ts
- Create: affiliate-factory/tests/quality/safe-zones.test.ts
- Create: affiliate-factory/tests/quality/quality-gate.test.ts
- Create: affiliate-factory/tests/quality/fixtures/ffprobe-valid.json
- Create: affiliate-factory/tests/quality/fixtures/ffprobe-invalid.json

**Interfaces:**
- Consumes: raw RenderResult, ChannelCreativeVariant, LayoutEvidence, and ffprobe JSON.
- Produces: normalizeMedia(input): Promise<RenderResult>; probeMedia(path): Promise<MediaProbe>; runQualityGate(input): QualityGateResult.

- [ ] **Step 1: Write failing FFprobe parser tests**

~~~ts
it('normalizes rational FPS and extracts required codecs', () => {
  const probe = parseFfprobe(validFixture);
  expect(probe.video.codec).toBe('h264');
  expect(probe.audio.codec).toBe('aac');
  expect(probe.video.fps).toBe(30);
  expect(probe.video.width).toBe(1080);
  expect(probe.video.height).toBe(1920);
});
~~~

- [ ] **Step 2: Implement FFprobe execution and parsing**

Resolve binaries from FFMPEG_PATH and FFPROBE_PATH when set, otherwise use ffmpeg-static and ffprobe-static. Call ffprobe with -v error -show_streams -show_format -of json. Parse output with Zod. Require one video stream and one audio stream. Convert avg_frame_rate safely and reject a zero denominator.

- [ ] **Step 3: Write failing quality-gate tests**

~~~ts
it('blocks publication when audio is missing or text overflows', () => {
  const productionManifest = makeProductionManifest();
  const fixtureVariant = makeTikTokVariant();
  const renderResult = makeRenderResult();
  const validProbe = makeValidProbe();
  const validLayout = makeLayoutEvidence();
  const result = runQualityGate({
    manifest: productionManifest,
    variant: fixtureVariant,
    render: renderResult,
    probe: {...validProbe, audio: null},
    layout: {...validLayout, overflows: ['headline']}
  });
  expect(result.passed).toBe(false);
  expect(result.checks.map((check) => check.code)).toContain('AUDIO_CODEC');
  expect(result.checks.map((check) => check.code)).toContain('TEXT_OVERFLOW');
});
~~~

- [ ] **Step 4: Implement FFmpeg normalization**

Run FFmpeg with overwrite disabled, map the rendered video, add a deterministic silent stereo source when no licensed audio is supplied, use -c:v libx264 -profile:v high -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -movflags +faststart, and stop at the variant duration. Do not shell-concatenate user data; pass an argument array through Execa.

- [ ] **Step 5: Implement every mandatory quality check**

Return one evidence-bearing check per resolution, aspect ratio, video codec, audio codec, FPS tolerance of 0.01, 10-25 second duration, configurable 100 MB maximum, non-empty file, decodability, hash, headline, CTA, price, asset presence, safe zones, text overflow, and fatal diagnostics.

- [ ] **Step 6: Run unit and real-media verification**

Run: cd affiliate-factory; npm.cmd test -- tests/quality tests/render; npm.cmd run typecheck

Expected: PASS. The real render probe reports 1080x1920, h264, aac, 30 FPS, and duration within 10-25 seconds.

- [ ] **Step 7: Commit**

Stage only Task 6 files and commit:

~~~powershell
git commit -m "feat: add FFmpeg normalization and quality gate"
~~~

### Task 7: Private/public R2 storage and persistent idempotency

**Files:**
- Create: affiliate-factory/src/storage/media-store.ts
- Create: affiliate-factory/src/storage/filesystem-media-store.ts
- Create: affiliate-factory/src/storage/r2-media-store.ts
- Create: affiliate-factory/src/state/r2-idempotency-store.ts
- Create: affiliate-factory/tests/storage/filesystem-media-store.test.ts
- Create: affiliate-factory/tests/storage/r2-media-store.test.ts
- Create: affiliate-factory/tests/state/r2-idempotency-store.test.ts

**Interfaces:**
- Consumes: two S3-compatible bucket names and R2 credentials.
- Produces: MediaStore; R2MediaStore; R2IdempotencyStore.

- [ ] **Step 1: Write failing storage contract tests**

~~~ts
it('never maps private objects to a public URL', async () => {
  const stored = await store.putPrivateJson('state/runs/run-1.json', {ok: true});
  expect(stored.publicUrl).toBeNull();
});

it('maps only final/publication objects to the public base URL', async () => {
  const stored = await store.putPublicFile(
    'final/publication/abc/video.mp4',
    videoPath,
    'video/mp4'
  );
  expect(stored.publicUrl).toBe(
    'https://media.visione.one/final/publication/abc/video.mp4'
  );
});
~~~

- [ ] **Step 2: Define the MediaStore port**

~~~ts
export interface MediaStore {
  putPrivateJson(key: PrivateObjectKey, value: unknown): Promise<StoredObject>;
  getPrivateJson<T>(key: PrivateObjectKey, schema: ZodType<T>): Promise<T | null>;
  putPrivateFile(key: PrivateObjectKey, file: string, contentType: string): Promise<StoredObject>;
  putPublicFile(key: PublicationObjectKey, file: string, contentType: 'video/mp4'): Promise<StoredObject>;
  headPublic(key: PublicationObjectKey): Promise<StoredObject | null>;
}
~~~

Use branded key schemas so a private prefix cannot be passed to putPublicFile.

- [ ] **Step 3: Implement filesystem and R2 adapters**

R2MediaStore creates one S3Client and explicitly selects R2_PRIVATE_BUCKET or R2_PUBLIC_BUCKET per method. Use PutObjectCommand, GetObjectCommand, and HeadObjectCommand. Stream files rather than buffering videos in memory. Normalize R2_PUBLIC_BASE_URL without a trailing slash. Creating a submitting record uses IfNoneMatch "*" so a second writer receives PreconditionFailed instead of overwriting the first record.

- [ ] **Step 4: Test the R2 command boundary with a fake client**

Inject an object exposing send(command). Assert the command input bucket and key, and assert that no credential or Authorization value appears in thrown/logged errors.

- [ ] **Step 5: Implement persistent idempotency**

Store submitting records at state/idempotency/{publicationKey}.json in the private bucket and receipts at state/receipts/{publicationKey}.json. Treat an existing confirmed receipt as skipped_duplicate. Treat an existing submitting record without a receipt as needs_reconciliation, never as safe to resubmit.

- [ ] **Step 6: Verify storage and idempotency**

Run: cd affiliate-factory; npm.cmd test -- tests/storage tests/state; npm.cmd run typecheck

Expected: PASS.

- [ ] **Step 7: Commit**

Stage only Task 7 files and commit:

~~~powershell
git commit -m "feat: add private and public R2 storage"
~~~

### Task 8: Official Buffer multichannel publisher and safe retry classification

**Approved amendment:** implement `BufferPublisher` for TikTok, X (`twitter` in
Buffer), and Threads. TikTok maps the final MP4 to a video asset; X and Threads
map operator images to ordered image assets. Append the Shopee affiliate URL to
every post. The amended filenames are `buffer-publisher.ts` and
`buffer-publisher.test.ts`; these replace the TikTok-only names below.

**Files:**
- Create: affiliate-factory/src/publish/publisher.ts
- Create: affiliate-factory/src/publish/buffer-tiktok-publisher.ts
- Create: affiliate-factory/src/publish/disabled-publishers.ts
- Create: affiliate-factory/src/pipeline/retry-policy.ts
- Create: affiliate-factory/tests/publish/buffer-tiktok-publisher.test.ts
- Create: affiliate-factory/tests/publish/disabled-publishers.test.ts
- Create: affiliate-factory/tests/pipeline/retry-policy.test.ts

**Interfaces:**
- Consumes: PublishRequest with public non-expiring MP4 URL and injected fetch.
- Produces: Publisher.publish(request): Promise<PublishReceipt>; BufferTikTokPublisher.validateConnection(): Promise<BufferChannel>; retry classification.

- [ ] **Step 1: Write the failing Buffer request test**

~~~ts
it('uses the official createPost mutation for automatic TikTok video', async () => {
  const publishRequest = makePublishRequest();
  const calls: Array<{url: string; init: RequestInit}> = [];
  const fetchFn: typeof fetch = async (url, init) => {
    calls.push({url: String(url), init: init ?? {}});
    return Response.json({
      data: {createPost: {post: {id: 'buffer-post-1', status: 'buffer'}}}
    });
  };

  const publisher = new BufferTikTokPublisher({
    apiKey: 'secret',
    channelId: 'channel-1',
    fetchFn
  });
  const receipt = await publisher.publish(publishRequest);

  expect(calls[0]?.url).toBe('https://api.buffer.com');
  const body = JSON.parse(String(calls[0]?.init.body));
  expect(body.variables.input.schedulingType).toBe('automatic');
  expect(body.variables.input.mode).toBe('addToQueue');
  expect(body.variables.input.assets[0].video.url).toBe(publishRequest.mediaUrl);
  expect(receipt.status).toBe('confirmed');
});
~~~

- [ ] **Step 2: Run Buffer tests and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/publish/buffer-tiktok-publisher.test.ts

Expected: FAIL because BufferTikTokPublisher does not exist.

- [ ] **Step 3: Implement the official GraphQL request**

Use POST https://api.buffer.com with Bearer authentication. Send operation:

~~~graphql
mutation CreateAffiliateVideoPost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess {
      post {
        id
        status
        dueAt
        assets {
          source
        }
      }
    }
    ... on MutationError {
      message
    }
  }
}
~~~

Variables input contains text, channelId, schedulingType automatic, mode addToQueue, needsApproval false, aiAssisted false, and one video asset with the stable public URL and thumbnailOffset 2000. Do not send TikTok Shop metadata.

- [ ] **Step 4: Classify outcomes without duplicate risk**

Confirmed GraphQL PostActionSuccess returns a confirmed receipt. Typed MutationError and 4xx validation failures return rejected. 401/403 are non-retryable credential errors. 429 and 5xx before any response body are retryable only before markSubmitting. Timeout, connection reset, or invalid response after request transmission returns ambiguous and moves the run to needs_reconciliation.

- [ ] **Step 5: Add read-only channel validation**

Implement validateConnection() with this official query and verify the configured channel ID exists, service equals tiktok, and isQueuePaused is false:

~~~graphql
query ValidateTikTokChannel($organizationId: OrganizationId!) {
  channels(input: {organizationId: $organizationId}) {
    id
    name
    service
    isQueuePaused
  }
}
~~~

- [ ] **Step 6: Add disabled adapters**

TikTokShopPublisher and ShopeeAffiliateAdapter return typed disabled receipts with status not_configured and never call fetch.

- [ ] **Step 7: Verify publisher and retries**

Run: cd affiliate-factory; npm.cmd test -- tests/publish tests/pipeline/retry-policy.test.ts; npm.cmd run typecheck

Expected: PASS, including confirmed, rejected, rate-limited, unauthorized, duplicate, and ambiguous cases.

- [ ] **Step 8: Commit**

Stage only Task 8 files and commit:

~~~powershell
git commit -m "feat: add official Buffer TikTok publisher"
~~~

### Task 9: Telegram manual intake, MP4 delivery, and secret-safe reporting

**Approved amendment:** also create `telegram-intake.ts` and tests. Poll
`getUpdates`, accept only `TELEGRAM_ALLOWED_CHAT_ID`, parse a structured product
caption, group albums by `media_group_id`, download photos through `getFile`,
and persist the offset privately. Add `sendVideo` multipart delivery for the
quality-gated MP4 before sending the final TikTok/X/Threads result summary.

**Files:**
- Create: affiliate-factory/src/reporting/telegram-reporter.ts
- Create: affiliate-factory/src/reporting/format-report.ts
- Create: affiliate-factory/src/security/redact.ts
- Create: affiliate-factory/tests/reporting/telegram-reporter.test.ts
- Create: affiliate-factory/tests/security/redact.test.ts

**Interfaces:**
- Consumes: completed run summary, bot token, chat ID, injected fetch.
- Produces: formatTelegramReport(summary): string; TelegramReporter.send(summary): Promise<void>; redact(value): string.

- [ ] **Step 1: Write failing report tests**

~~~ts
it('formats the required Portuguese summary', () => {
  const successSummary = makeRunSummary();
  const text = formatTelegramReport(successSummary);
  expect(text).toContain('Affiliate Factory');
  expect(text).toContain('Produto:');
  expect(text).toContain('Render: OK');
  expect(text).toContain('QA: OK');
  expect(text).toContain('Buffer: OK');
  expect(text).toContain('TikTok:');
  expect(text).toContain('Video ID:');
});

it('redacts configured secrets from errors', () => {
  expect(redactSecrets('Bearer secret-token', ['secret-token']))
    .toBe('Bearer [REDACTED]');
});
~~~

- [ ] **Step 2: Implement deterministic formatting and redaction**

Keep reports below Telegram limits, escape HTML, omit private object keys, and include a public URL only after upload. Important alerts are limited to ambiguous publication, duplicate conflict, invalid credentials, corrupt media, and exhausted infrastructure retries.

- [ ] **Step 3: Implement Telegram transport**

POST JSON to https://api.telegram.org/bot{token}/sendMessage with chat_id, text, parse_mode HTML, and disable_web_page_preview true. Never include the full endpoint in logs because it contains the token.

- [ ] **Step 4: Verify reporting**

Run: cd affiliate-factory; npm.cmd test -- tests/reporting tests/security; npm.cmd run typecheck

Expected: PASS.

- [ ] **Step 5: Commit**

Stage only Task 9 files and commit:

~~~powershell
git commit -m "feat: add Telegram run reporting"
~~~

### Task 10: Configuration and end-to-end pipeline runner

**Files:**
- Create: affiliate-factory/src/config.ts
- Create: affiliate-factory/src/pipeline/run-context.ts
- Create: affiliate-factory/src/pipeline/runner.ts
- Create: affiliate-factory/src/pipeline/stages.ts
- Create: affiliate-factory/src/cli.ts
- Create: affiliate-factory/tests/config.test.ts
- Create: affiliate-factory/tests/pipeline/runner.test.ts
- Create: affiliate-factory/tests/pipeline/dry-run.e2e.test.ts

**Interfaces:**
- Consumes: manual bundle path or private R2 input key, PipelineDependencies, mode, publish flag.
- Produces: runPipeline(input, dependencies): Promise<RunSummary>; CLI commands validate, render, and run.

- [ ] **Step 1: Write failing configuration tests**

~~~ts
it('reports missing secret names without values', () => {
  const result = ProductionConfigSchema.safeParse({});
  if (result.success) {
    throw new Error('Expected production configuration to fail');
  }
  const message = formatConfigError(result.error);
  expect(message).toContain('BUFFER_API_KEY');
  expect(message).not.toContain('undefined=');
});
~~~

- [ ] **Step 2: Implement mode-aware configuration**

Dry-run requires only local paths and FFmpeg binaries. Production upload requires CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET, and R2_PUBLIC_BASE_URL. Publishing additionally requires BUFFER_API_KEY, BUFFER_ORGANIZATION_ID, and BUFFER_TIKTOK_CHANNEL_ID. Telegram is enabled only when both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID exist.

- [ ] **Step 3: Write the failing runner tests**

~~~ts
it('does not call publisher when QA fails', async () => {
  const dependencies = createFakeDependencies({qaPassed: false});
  const summary = await runPipeline(productionInput, dependencies);
  expect(dependencies.publisher.publish).not.toHaveBeenCalled();
  expect(summary.state).toBe('rejected');
});

it('skips a confirmed duplicate before Buffer', async () => {
  const dependencies = createFakeDependencies({existingReceipt: confirmedReceipt});
  const summary = await runPipeline(productionInput, dependencies);
  expect(dependencies.publisher.publish).not.toHaveBeenCalled();
  expect(summary.state).toBe('skipped_duplicate');
});
~~~

- [ ] **Step 4: Implement stage orchestration**

Run stages in this exact order: intake, identity, plan, variant, render lookup, render, normalize, probe, quality gate, public upload, duplicate lookup, mark submitting, publish, receipt, report. Persist a RunEvent before and after every state transition. Reuse approved render and uploaded media when their hash-addressed objects already exist.

Dry-run executes through QA with filesystem storage, uses a NoopPublisher, writes a local receipt with status skipped, and cannot be upgraded to publish by fixture input.

- [ ] **Step 5: Implement CLI argument validation**

Support:

~~~text
affiliate-factory validate --bundle PATH
affiliate-factory render --bundle PATH --output PATH
affiliate-factory run --bundle PATH --mode dry-run
affiliate-factory run --input-bundle-key KEY --mode production --publish
~~~

Reject unknown flags, reject --publish outside production, reject fixture publication, and require exactly one input source.

- [ ] **Step 6: Run the complete mock end-to-end suite**

Run: cd affiliate-factory; npm.cmd test -- tests/pipeline tests/config.test.ts; npm.cmd run typecheck; npm.cmd run build

Expected: PASS. No network call occurs in dry-run.

- [ ] **Step 7: Commit**

Stage only Task 10 files and commit:

~~~powershell
git commit -m "feat: orchestrate safe Affiliate Factory pipeline"
~~~

### Task 11: Manual workflow and operator documentation

**Files:**
- Create: .github/workflows/affiliate-factory-manual.yml
- Create: affiliate-factory/docs/operations.md
- Create: affiliate-factory/README.md
- Create: affiliate-factory/tests/workflow/workflow.test.ts
- Modify: affiliate-factory/package.json

**Interfaces:**
- Consumes: private R2 bundle key and named GitHub Secrets.
- Produces: manual, non-deploying workflow and complete operating instructions.

- [ ] **Step 1: Write the failing workflow structure test**

~~~ts
it('is manual-only, least-privilege, and defaults publication off', () => {
  const workflow = parse(readFileSync(workflowPath, 'utf8'));
  expect(workflow.on).toEqual({workflow_dispatch: expect.any(Object)});
  expect(workflow.permissions).toEqual({contents: 'read'});
  expect(workflow.on.workflow_dispatch.inputs.publish.default).toBe(false);
  expect(JSON.stringify(workflow)).not.toContain('schedule');
  expect(JSON.stringify(workflow)).not.toContain('git push');
});
~~~

- [ ] **Step 2: Run workflow test and confirm RED**

Run: cd affiliate-factory; npm.cmd test -- tests/workflow/workflow.test.ts

Expected: FAIL because the workflow does not exist.

- [ ] **Step 3: Implement the workflow**

Use workflow_dispatch inputs input_bundle_key, mode with dry-run/production choice, publish boolean default false, and force_render boolean default false. Set contents: read, a global concurrency group affiliate-factory-publication, cancel-in-progress false, ubuntu-latest, timeout 30 minutes, actions/checkout@v4, actions/setup-node@v4 with Node 22 and npm cache pointing to affiliate-factory/package-lock.json.

Run npm ci, npm test, npm run typecheck, npm run build, verify ffmpeg and ffprobe, then execute dist/cli.js. Map only named secrets into the environment. Upload diagnostics with actions/upload-artifact@v4 and a seven-day retention. Do not invoke or modify the VISIONE deployment.

- [ ] **Step 4: Write operations documentation**

Document the daily manual bundle fields, image provenance, private R2 upload, dry-run, real render, secret names, manual dispatch, publish-off switch, duplicate behavior, ambiguous reconciliation, retries, adding publishers, TikTok Shop future activation, Shopee future official data source, and disaster recovery.

Include a prominent statement: sending links alone is insufficient; the operator also supplies factual fields and media files.

- [ ] **Step 5: Verify workflow and documentation**

Run: cd affiliate-factory; npm.cmd test -- tests/workflow; npm.cmd run typecheck; npm.cmd run build

Expected: PASS. Run from repository root: git diff --name-only main...HEAD and confirm no existing VISIONE site or workflow file is modified.

- [ ] **Step 6: Commit**

Stage only Task 11 files and commit:

~~~powershell
git commit -m "ci: add manual Affiliate Factory workflow"
~~~

### Task 12: Full verification, artifact evidence, and controlled integration readiness

**Files:**
- Create: affiliate-factory/docs/mvp-result.md
- Modify only if verification reveals a tested defect: files owned by Tasks 1-11.

**Interfaces:**
- Consumes: completed implementation, optional named integration secrets, and one operator-supplied production bundle.
- Produces: fixture MP4, FFprobe/QA evidence, integration results, and MVP AFFILIATE FACTORY — RESULTADO.

- [ ] **Step 1: Run clean install and full local verification**

Run:

~~~powershell
Set-Location affiliate-factory
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run render:fixture
npm.cmd run dry-run
~~~

Expected: every command exits 0. Record exact test counts and durations.

- [ ] **Step 2: Capture fixture media evidence**

Run ffprobe with JSON output against the generated fixture MP4. Record file size, SHA-256, 1080x1920 resolution, 30 FPS, H.264, AAC, and duration. Run the quality gate against the same file and retain its JSON result under diagnostics, not as committed operational state.

- [ ] **Step 3: Visually inspect representative frames**

Extract frames at 10%, 50%, and 90% of duration with FFmpeg. Verify modern commercial composition, readable hierarchy, product visibility, price/CTA placement, safe zones, and no clipping. If a defect is visible, first add a failing layout/render test, then fix and rerun all Task 12 Step 1 commands.

- [ ] **Step 4: Validate R2 only when secrets are present**

Check presence by name without printing values. Upload a disposable test object to the private bucket and verify it has no public URL. Upload the approved fixture to final/publication/ in the public bucket and verify an unauthenticated HTTPS GET returns video/mp4. Remove only the disposable private test object after its exact key is verified; retain publication media according to policy.

- [ ] **Step 5: Validate Buffer without accidental publication**

Use the official API to confirm the configured TikTok channel is accessible. If the official API supports draft creation for the connected channel, create and delete one draft using saveToDraft true; otherwise stop at read-only channel validation. Do not set publish=true in this step.

- [ ] **Step 6: Validate Telegram**

Send one clearly labeled Affiliate Factory integration-test message and verify the Telegram API returns ok true. Do not include secrets or private R2 keys.

- [ ] **Step 7: Run one controlled TikTok pilot only when all gates pass**

Require one operator-supplied production bundle, a confirmed Buffer TikTok channel, public media retrieval, Telegram success, passing tests/build/render/QA, and publish=true. Dispatch exactly one product. Capture the Buffer post ID, Buffer status, public R2 URL, publication key, immutable receipt, Telegram result, and verified TikTok status.

If any prerequisite is missing, document that specific integration as blocked and continue reporting all independent successful evidence. Never claim the TikTok post succeeded from a 2xx HTTP response alone.

- [ ] **Step 8: Write the final result report**

Title the document MVP AFFILIATE FACTORY — RESULTADO. Include created/modified files, commands, test results, video path, codecs/resolution/duration/hash, R2 objects and public URL, Buffer result, TikTok result, receipt, Telegram result, secret names only, problems, limitations, and next steps.

- [ ] **Step 9: Final regression and isolation check**

Run:

~~~powershell
Set-Location affiliate-factory
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
Set-Location ..
git diff --check main...HEAD
git status --short
~~~

Expected: all verification commands exit 0; the worktree contains no untracked render, secret, temporary, or diagnostic files.

- [ ] **Step 10: Commit**

Stage only the verified report and any tested fixes, inspect the staged diff, and commit:

~~~powershell
git commit -m "docs: report Affiliate Factory MVP verification"
~~~
