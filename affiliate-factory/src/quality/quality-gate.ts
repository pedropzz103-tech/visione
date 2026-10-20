import {
  QualityGateResultSchema,
  type ChannelCreativeVariant,
  type LayoutEvidence,
  type MediaProbe,
  type ProductManifest,
  type QualityGateResult,
  type RenderResult
} from '../contracts/index.js';
import {findSafeZoneViolations} from './safe-zones.js';

export type QualityGateInput = {
  manifest: ProductManifest;
  variant: ChannelCreativeVariant;
  render: RenderResult;
  probe: MediaProbe;
  layout: LayoutEvidence;
  fatalDiagnostics: string[];
  maxSizeBytes?: number;
};

type Check = QualityGateResult['checks'][number];

const check = (code: string, passed: boolean, evidence: string): Check => ({
  code,
  passed,
  evidence
});

export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const {manifest, variant, render, probe, layout} = input;
  const maxSizeBytes = input.maxSizeBytes ?? 100 * 1024 * 1024;
  const safeZoneViolations = findSafeZoneViolations(layout);
  const expectedAspect = 9 / 16;
  const actualAspect = probe.video.width / probe.video.height;
  const hasHash = /^[0-9a-f]{64}$/i.test(render.contentHash) && !/^0{64}$/.test(render.contentHash);
  const hasPrice = variant.priceText.trim().length > 0 && (
    manifest.purpose === 'fixture' || manifest.currentPriceMinor > 0
  );

  const checks: Check[] = [
    check('FILE_NON_EMPTY', render.sizeBytes > 0 && probe.format.sizeBytes > 0,
      `render=${render.sizeBytes};probe=${probe.format.sizeBytes}`),
    check('FILE_HASH', hasHash, `sha256=${render.contentHash}`),
    check('DECODABLE', Boolean(probe.video.codec && probe.format.durationSeconds > 0),
      `video=${probe.video.codec};duration=${probe.format.durationSeconds}`),
    check('RESOLUTION', probe.video.width === 1080 && probe.video.height === 1920,
      `${probe.video.width}x${probe.video.height}`),
    check('ASPECT_RATIO', Math.abs(actualAspect - expectedAspect) < 0.0001,
      `actual=${actualAspect.toFixed(6)};expected=${expectedAspect.toFixed(6)}`),
    check('VIDEO_CODEC', probe.video.codec === 'h264', `codec=${probe.video.codec}`),
    check('AUDIO_CODEC', probe.audio?.codec === 'aac', `codec=${probe.audio?.codec ?? 'missing'}`),
    check('FPS', Math.abs(probe.video.fps - 30) <= 0.01, `fps=${probe.video.fps}`),
    check('DURATION', probe.format.durationSeconds >= 10 && probe.format.durationSeconds <= 25,
      `seconds=${probe.format.durationSeconds}`),
    check('FILE_SIZE', probe.format.sizeBytes <= maxSizeBytes,
      `bytes=${probe.format.sizeBytes};max=${maxSizeBytes}`),
    check('HEADLINE', variant.headline.trim().length > 0, `headlineLength=${variant.headline.trim().length}`),
    check('CTA', variant.cta.trim().length > 0, `ctaLength=${variant.cta.trim().length}`),
    check('PRICE', hasPrice, `minor=${manifest.currentPriceMinor};text=${variant.priceText}`),
    check('ASSET_PRESENCE', variant.assets.length > 0, `assets=${variant.assets.length}`),
    check('SAFE_ZONES', safeZoneViolations.length === 0,
      `violations=${safeZoneViolations.join(',') || 'none'}`),
    check('TEXT_OVERFLOW', layout.overflows.length === 0,
      `overflows=${layout.overflows.join(',') || 'none'}`),
    check('FATAL_DIAGNOSTICS', input.fatalDiagnostics.length === 0,
      `diagnostics=${input.fatalDiagnostics.join(' | ') || 'none'}`)
  ];

  return QualityGateResultSchema.parse({
    schemaVersion: '1.0.0',
    videoId: render.videoId,
    passed: checks.every((item) => item.passed),
    checks
  });
}
