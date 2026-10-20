import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {runPipeline, type PipelineDependencies} from '../../src/pipeline/runner.js';
import {makeRenderResult, makeValidProbe} from '../helpers/factories.js';

describe('dry-run pipeline', () => {
  it('stops after QA and never invokes a provider', async () => {
    const publisher = {publish: vi.fn()};
    const deps = {
      renderer: {render: vi.fn(async () => ({...makeRenderResult(), videoId: 'vid_fixture'}))},
      normalize: vi.fn(async (input) => ({...input.render, outputPath: input.outputPath, audioCodec: 'aac'})),
      probe: vi.fn(async () => makeValidProbe()),
      qualityGate: vi.fn((input) => ({
        schemaVersion: '1.0.0' as const, videoId: input.render.videoId, passed: true,
        checks: [{code: 'TEST_QA', passed: true, evidence: 'ok'}]
      })),
      mediaStore: {} as PipelineDependencies['mediaStore'],
      idempotency: {} as PipelineDependencies['idempotency'],
      publishers: {tiktok: publisher, x: publisher, threads: publisher},
      now: () => new Date('2026-08-20T12:00:00.000Z')
    } satisfies PipelineDependencies;

    const summary = await runPipeline({
      bundleDir: resolve('fixtures/product-test'),
      outputDir: await mkdtemp(join(tmpdir(), 'affiliate-dry-')),
      mode: 'dry-run', publish: false
    }, deps);

    expect(summary.state).toBe('qa_passed');
    expect(summary.buffer).toBe('PULADO');
    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
