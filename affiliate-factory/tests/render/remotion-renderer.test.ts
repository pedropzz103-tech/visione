import {mkdtemp, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {createBaseCreativePlan} from '../../src/creative/base-plan.js';
import {createTikTokVariant} from '../../src/creative/tiktok-variant.js';
import {loadManualBundle} from '../../src/intake/manual-bundle.js';
import {probeMedia} from '../../src/quality/ffprobe.js';
import {normalizeMedia} from '../../src/render/ffmpeg-normalizer.js';
import {RemotionRenderer} from '../../src/render/remotion-renderer.js';

describe('RemotionRenderer', () => {
  it('renders the manual fixture to a real vertical MP4', async () => {
    const bundleDir = resolve('fixtures/product-test');
    const outputDir = await mkdtemp(join(tmpdir(), 'affiliate-render-'));
    const outputPath = join(outputDir, 'fixture.mp4');
    const normalizedPath = join(outputDir, 'fixture-normalized.mp4');
    const manifest = await loadManualBundle(bundleDir);
    const variant = createTikTokVariant(
      manifest,
      createBaseCreativePlan(manifest)
    );
    const renderer = new RemotionRenderer({
      entryPoint: resolve('src/render/remotion-entry.tsx')
    });

    const result = await renderer.render({
      variant,
      bundleDir,
      outputPath,
      videoId: 'vid_fixture'
    });

    expect(result.schemaVersion).toBe('1.0.0');
    expect(result.width).toBe(1080);
    expect(result.height).toBe(1920);
    expect(result.fps).toBe(30);
    expect(result.frameCount).toBe(360);
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await stat(outputPath)).size).toBeGreaterThan(1000);

    const normalized = await normalizeMedia({
      render: result,
      outputPath: normalizedPath
    });
    const probe = await probeMedia(normalized.outputPath);

    expect(normalized.audioCodec).toBe('aac');
    expect(probe.video).toMatchObject({
      codec: 'h264',
      width: 1080,
      height: 1920,
      fps: 30
    });
    expect(probe.audio?.codec).toBe('aac');
    expect(probe.format.durationSeconds).toBeCloseTo(12, 1);
  }, 180_000);
});
