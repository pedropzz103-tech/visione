import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import type {PublishReceipt, PublishRequest} from '../../src/contracts/index.js';
import {runPipeline, type PipelineDependencies} from '../../src/pipeline/runner.js';
import {
  makeProductionManifest,
  makeRenderResult,
  makeValidProbe
} from '../helpers/factories.js';

async function productionBundle(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'affiliate-runner-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'assets', 'operator-image.jpg'), Buffer.from('image'));
  await writeFile(join(root, 'manifest.json'), JSON.stringify(makeProductionManifest()), 'utf8');
  return root;
}

function dependencies(qaPassed: boolean, existingReceipt: PublishReceipt | null = null) {
  const publisher = {publish: vi.fn(async (request: PublishRequest) => ({
    schemaVersion: '1.0.0' as const,
    publicationKey: request.publicationKey,
    provider: 'buffer' as const,
    channel: request.channel,
    status: 'confirmed' as const,
    providerPostId: `${request.channel}-post`,
    message: 'created',
    createdAt: '2026-08-20T12:00:00.000Z',
    mediaUrls: request.assets.map((asset) => asset.url)
  }))};
  const mediaStore = {
    putPrivateJson: vi.fn(), putPrivateJsonIfAbsent: vi.fn(), getPrivateJson: vi.fn(),
    putPrivateFile: vi.fn(), headPublic: vi.fn(async () => null),
    putPublicFile: vi.fn(async (key, _file, _type) => ({
      key, sizeBytes: 100, etag: 'etag', publicUrl: `https://media.example.test/${key}`
    }))
  };
  const idempotency = {
    find: vi.fn(async () => existingReceipt),
    findSubmission: vi.fn(async () => null),
    markSubmitting: vi.fn(async () => undefined),
    saveReceipt: vi.fn(async () => undefined)
  };
  const deps: PipelineDependencies = {
    renderer: {render: vi.fn(async () => makeRenderResult())},
    normalize: vi.fn(async (input) => ({...input.render, outputPath: input.outputPath, audioCodec: 'aac'})),
    probe: vi.fn(async () => makeValidProbe()),
    qualityGate: vi.fn(() => ({
      schemaVersion: '1.0.0' as const, videoId: 'vid_operator', passed: qaPassed,
      checks: [{code: 'TEST_QA', passed: qaPassed, evidence: qaPassed ? 'ok' : 'blocked'}]
    })),
    mediaStore,
    idempotency,
    publishers: {tiktok: publisher, x: publisher, threads: publisher},
    now: () => new Date('2026-08-20T12:00:00.000Z')
  };
  return {deps, publisher, mediaStore, idempotency};
}

describe('runPipeline', () => {
  it('does not upload or publish when QA fails', async () => {
    const bundleDir = await productionBundle();
    const {deps, publisher, mediaStore} = dependencies(false);

    const summary = await runPipeline({
      bundleDir, outputDir: join(bundleDir, 'output'), mode: 'production', publish: true
    }, deps);

    expect(summary.state).toBe('rejected');
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(mediaStore.putPublicFile).not.toHaveBeenCalled();
  });

  it('skips confirmed duplicates for all channels before Buffer', async () => {
    const bundleDir = await productionBundle();
    const receipt: PublishReceipt = {
      schemaVersion: '1.0.0', publicationKey: 'b'.repeat(64), provider: 'buffer',
      channel: 'tiktok', status: 'confirmed', providerPostId: 'existing',
      message: 'existing', createdAt: '2026-08-20T12:00:00.000Z'
    };
    const {deps, publisher, idempotency} = dependencies(true, receipt);

    const summary = await runPipeline({
      bundleDir, outputDir: join(bundleDir, 'output'), mode: 'production', publish: true
    }, deps);

    expect(summary.state).toBe('skipped_duplicate');
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(idempotency.markSubmitting).not.toHaveBeenCalled();
  });

  it('publishes one channel request per Buffer connection with the right media', async () => {
    const bundleDir = await productionBundle();
    const {deps, publisher} = dependencies(true);

    const summary = await runPipeline({
      bundleDir, outputDir: join(bundleDir, 'output'), mode: 'production', publish: true
    }, deps);

    expect(summary.state).toBe('published');
    expect(publisher.publish).toHaveBeenCalledTimes(3);
    const requests = publisher.publish.mock.calls.map((call) => call[0]);
    expect(requests.find((request) => request.channel === 'tiktok')?.assets[0]?.kind).toBe('video');
    expect(requests.find((request) => request.channel === 'x')?.assets[0]?.kind).toBe('image');
    expect(requests.find((request) => request.channel === 'threads')?.assets[0]?.kind).toBe('image');
  });
});
