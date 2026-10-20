import {describe, expect, it} from 'vitest';
import {ProductManifestSchema} from '../../src/contracts/index.js';
import {runQualityGate} from '../../src/quality/quality-gate.js';
import {
  makeLayoutEvidence,
  makeProductionManifest,
  makeRenderResult,
  makeTikTokVariant,
  makeValidProbe
} from '../helpers/factories.js';

describe('runQualityGate', () => {
  it('allows the explicitly non-publishable fixture to use its zero demonstration price', () => {
    const production = makeProductionManifest();
    const manifest = ProductManifestSchema.parse({
      ...production,
      purpose: 'fixture',
      currentPriceMinor: 0,
      previousPriceMinor: undefined,
      assets: [{
        id: 'fixture-card', kind: 'image', file: 'assets/card.svg',
        provenance: {sourceType: 'repository-created', source: 'test fixture'}
      }]
    });
    const variant = {...makeTikTokVariant(), priceText: 'R$ 0,00'};

    const result = runQualityGate({
      manifest, variant, render: makeRenderResult(), probe: makeValidProbe(),
      layout: makeLayoutEvidence(), fatalDiagnostics: []
    });

    expect(result.checks.find((check) => check.code === 'PRICE')?.passed).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('returns evidence for every mandatory publication check', () => {
    const result = runQualityGate({
      manifest: makeProductionManifest(),
      variant: makeTikTokVariant(),
      render: makeRenderResult(),
      probe: makeValidProbe(),
      layout: makeLayoutEvidence(),
      fatalDiagnostics: []
    });

    expect(result.passed).toBe(true);
    expect(result.checks.map((check) => check.code)).toEqual([
      'FILE_NON_EMPTY', 'FILE_HASH', 'DECODABLE', 'RESOLUTION', 'ASPECT_RATIO',
      'VIDEO_CODEC', 'AUDIO_CODEC', 'FPS', 'DURATION', 'FILE_SIZE', 'HEADLINE',
      'CTA', 'PRICE', 'ASSET_PRESENCE', 'SAFE_ZONES', 'TEXT_OVERFLOW',
      'FATAL_DIAGNOSTICS'
    ]);
    expect(result.checks.every((check) => check.evidence.length > 0)).toBe(true);
  });

  it('blocks publication when audio is missing or text overflows', () => {
    const result = runQualityGate({
      manifest: makeProductionManifest(),
      variant: makeTikTokVariant(),
      render: makeRenderResult(),
      probe: {...makeValidProbe(), audio: null},
      layout: {...makeLayoutEvidence(), overflows: ['headline']},
      fatalDiagnostics: []
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.code === 'AUDIO_CODEC')?.passed).toBe(false);
    expect(result.checks.find((check) => check.code === 'TEXT_OVERFLOW')?.passed).toBe(false);
  });

  it('blocks every incompatible TikTok media property and diagnostic', () => {
    const variant = makeTikTokVariant();
    const probe = makeValidProbe();
    const result = runQualityGate({
      manifest: makeProductionManifest(),
      variant: {...variant, headline: '', cta: '', assets: []},
      render: {...makeRenderResult(), sizeBytes: 0, contentHash: '0'.repeat(64)},
      probe: {
        video: {...probe.video, codec: 'vp9', width: 720, height: 720, fps: 29.9, durationSeconds: 26},
        audio: {codec: 'opus'},
        format: {durationSeconds: 26, sizeBytes: 101 * 1024 * 1024}
      },
      layout: {...makeLayoutEvidence(), textBoxes: [{...makeLayoutEvidence().textBoxes[0]!, x: 0}]},
      fatalDiagnostics: ['renderer warning promoted to fatal']
    });

    expect(result.passed).toBe(false);
    const failed = result.checks.filter((check) => !check.passed).map((check) => check.code);
    expect(failed).toEqual(expect.arrayContaining([
      'FILE_NON_EMPTY', 'RESOLUTION', 'ASPECT_RATIO', 'VIDEO_CODEC', 'AUDIO_CODEC',
      'FPS', 'DURATION', 'FILE_SIZE', 'HEADLINE', 'CTA', 'ASSET_PRESENCE',
      'SAFE_ZONES', 'FATAL_DIAGNOSTICS'
    ]));
  });
});
