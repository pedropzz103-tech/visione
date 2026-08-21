import {mkdir} from 'node:fs/promises';
import {extname, join, resolve} from 'node:path';
import {
  PublishRequestSchema,
  RenderResultSchema,
  RunEventSchema,
  RunSummarySchema,
  type ChannelCreativeVariant,
  type MediaProbe,
  type PublicationChannel,
  type PublishReceipt,
  type QualityGateResult,
  type RenderResult,
  type RunEvent,
  type RunSummary
} from '../contracts/index.js';
import {createBaseCreativePlan} from '../creative/base-plan.js';
import {createTikTokVariant} from '../creative/tiktok-variant.js';
import {
  createBundleContentHash,
  createPublicationKey,
  createVideoId
} from '../identity/content-identity.js';
import {loadManualBundle} from '../intake/manual-bundle.js';
import type {Publisher} from '../publish/publisher.js';
import type {QualityGateInput} from '../quality/quality-gate.js';
import type {NormalizeMediaInput} from '../render/ffmpeg-normalizer.js';
import type {RemotionRenderInput} from '../render/remotion-renderer.js';
import type {IdempotencyStore} from '../state/idempotency-store.js';
import {
  publicationObjectKey,
  privateObjectKey,
  type MediaStore,
  type PublicationContentType
} from '../storage/media-store.js';

export type PipelineInput = {
  bundleDir: string;
  outputDir: string;
  mode: 'dry-run' | 'production';
  publish: boolean;
};

export type PipelineDependencies = {
  renderer: {render(input: RemotionRenderInput): Promise<RenderResult>};
  normalize(input: NormalizeMediaInput): Promise<RenderResult>;
  probe(path: string): Promise<MediaProbe>;
  qualityGate(input: QualityGateInput): QualityGateResult;
  mediaStore: MediaStore;
  idempotency: IdempotencyStore;
  publishers: Record<PublicationChannel, Publisher>;
  reporter?: {
    sendVideo(path: string, caption: string): Promise<void>;
    sendSummary(summary: RunSummary): Promise<void>;
  };
  recordEvent?: (event: RunEvent) => Promise<void>;
  now: () => Date;
};

function summaryBase(input: {
  runId: string;
  productName: string;
  videoId: string;
}): Pick<RunSummary, 'schemaVersion' | 'runId' | 'productName' | 'videoId'> {
  return {schemaVersion: '1.0.0', ...input};
}

function imageContentType(file: string): PublicationContentType {
  switch (extname(file).toLowerCase()) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    default: throw new Error('UNSUPPORTED_PUBLIC_IMAGE_TYPE');
  }
}

function receiptStatus(receipt: PublishReceipt): string {
  if (receipt.status === 'confirmed') return 'confirmado';
  if (receipt.status === 'skipped_duplicate') return 'duplicado ignorado';
  if (receipt.status === 'ambiguous') return 'reconciliação necessária';
  return receipt.status;
}

export async function runPipeline(
  input: PipelineInput,
  dependencies: PipelineDependencies
): Promise<RunSummary> {
  if (input.publish && input.mode !== 'production') {
    throw new Error('PUBLISH_REQUIRES_PRODUCTION_MODE');
  }
  const manifest = await loadManualBundle(input.bundleDir);
  if (input.publish && manifest.purpose !== 'production') {
    throw new Error('FIXTURE_PUBLICATION_FORBIDDEN');
  }
  const contentHash = await createBundleContentHash(manifest, input.bundleDir);
  const videoId = createVideoId({
    productId: manifest.productId,
    contentHash,
    templateVersion: 'commercial-vertical@1',
    rendererVersion: 'remotion@4.0.514'
  });
  const runId = `run-${videoId}-${dependencies.now().toISOString().replace(/[^0-9]/g, '')}`;
  const base = summaryBase({runId, productName: manifest.productName, videoId});
  const emit = async (
    state: RunSummary['state'],
    stage: string,
    event: string,
    details: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!dependencies.recordEvent) return;
    await dependencies.recordEvent(RunEventSchema.parse({
      schemaVersion: '1.0.0', runId, videoId, state, stage, event,
      occurredAt: dependencies.now().toISOString(), details
    }));
  };
  await emit('received', 'intake', 'MANUAL_BUNDLE_RECEIVED', {
    productId: manifest.productId,
    purpose: manifest.purpose
  });
  await emit('validated', 'validation', 'BUNDLE_VALIDATED', {contentHash});
  const plan = createBaseCreativePlan(manifest);
  const variant: ChannelCreativeVariant = createTikTokVariant(manifest, plan);
  await emit('planned', 'planning', 'CREATIVE_PLANNED', {
    durationSeconds: variant.durationSeconds,
    channel: variant.channel
  });
  const runOutputDir = join(input.outputDir, runId);
  await mkdir(runOutputDir, {recursive: true});
  const rawPath = join(runOutputDir, `${videoId}-raw.mp4`);
  const finalPath = join(runOutputDir, `${videoId}.mp4`);
  if (input.mode === 'production') {
    await dependencies.mediaStore.putPrivateJson(
      privateObjectKey(`input/original/${contentHash}/manifest.json`),
      manifest
    );
    for (const asset of manifest.assets) {
      await dependencies.mediaStore.putPrivateFile(
        privateObjectKey(`input/original/${contentHash}/${asset.file}`),
        resolve(input.bundleDir, asset.file),
        asset.kind === 'image' ? imageContentType(asset.file) : 'application/octet-stream'
      );
    }
  }
  const renderMetadataKey = privateObjectKey(`state/renders/${videoId}.json`);
  const renderMediaKey = privateObjectKey(`temporary/renders/${videoId}.mp4`);
  let normalized: RenderResult | null = null;
  let reusedRender = false;
  if (input.mode === 'production') {
    const cached = await dependencies.mediaStore.getPrivateJson(
      renderMetadataKey,
      RenderResultSchema
    );
    if (cached) {
      const restored = await dependencies.mediaStore.getPrivateFile(renderMediaKey, finalPath);
      if (restored) {
        normalized = RenderResultSchema.parse({
          ...cached,
          outputPath: finalPath,
          sizeBytes: restored.sizeBytes
        });
        reusedRender = true;
      }
    }
  }
  if (!normalized) {
    const raw = await dependencies.renderer.render({
      variant,
      bundleDir: resolve(input.bundleDir),
      outputPath: rawPath,
      videoId
    });
    normalized = await dependencies.normalize({render: raw, outputPath: finalPath});
  }
  await emit('rendered', 'render', 'VIDEO_READY', {
    reused: reusedRender,
    sizeBytes: normalized.sizeBytes
  });
  const probe = await dependencies.probe(normalized.outputPath);
  const qa = dependencies.qualityGate({
    manifest,
    variant,
    render: normalized,
    probe,
    layout: normalized.layout,
    fatalDiagnostics: []
  });
  if (!qa.passed) {
    await emit('rejected', 'quality', 'QUALITY_GATE_REJECTED', {
      failedChecks: qa.checks.filter((item) => !item.passed).map((item) => item.code)
    });
    if (input.mode === 'production') {
      await dependencies.mediaStore.putPrivateFile(
        privateObjectKey(`rejected/${runId}/${videoId}.mp4`),
        normalized.outputPath,
        'video/mp4'
      );
      await dependencies.mediaStore.putPrivateJson(
        privateObjectKey(`diagnostics/${runId}/quality-gate.json`),
        qa
      );
    }
    return RunSummarySchema.parse({
      ...base, state: 'rejected', render: 'OK', qa: 'ERRO', r2: 'PULADO',
      buffer: 'PULADO', tiktokStatus: 'não publicado', xStatus: 'não publicado',
      threadsStatus: 'não publicado', errorCode: 'QUALITY_GATE_FAILED'
    });
  }

  await emit('qa_passed', 'quality', 'QUALITY_GATE_PASSED', {
    checks: qa.checks.length
  });

  if (input.mode === 'production') {
    await dependencies.mediaStore.putPrivateFile(
      renderMediaKey,
      normalized.outputPath,
      'video/mp4'
    );
    await dependencies.mediaStore.putPrivateJson(renderMetadataKey, normalized);
    await dependencies.mediaStore.putPrivateJson(
      privateObjectKey(`diagnostics/${runId}/quality-gate.json`),
      qa
    );
  }

  if (manifest.purpose === 'production' && dependencies.reporter) {
    await dependencies.reporter.sendVideo(
      normalized.outputPath,
      `Affiliate Factory — ${manifest.productName} — MP4 final aprovado`
    );
  }
  if (input.mode === 'dry-run') {
    const result = RunSummarySchema.parse({
      ...base, state: 'qa_passed', render: 'OK', qa: 'OK', r2: 'PULADO',
      buffer: 'PULADO', tiktokStatus: 'dry-run', xStatus: 'dry-run',
      threadsStatus: 'dry-run'
    });
    if (dependencies.reporter && manifest.purpose === 'production') {
      await dependencies.reporter.sendSummary(result);
    }
    await emit('qa_passed', 'complete', 'DRY_RUN_COMPLETED');
    return result;
  }

  const videoStored = await dependencies.mediaStore.putPublicFile(
    publicationObjectKey(`final/publication/${videoId}/video.mp4`),
    normalized.outputPath,
    'video/mp4'
  );
  if (!videoStored.publicUrl) {
    throw new Error('PUBLIC_VIDEO_URL_MISSING');
  }
  const imageUrls: string[] = [];
  for (const [index, asset] of manifest.assets.entries()) {
    if (asset.kind !== 'image') continue;
    const extension = extname(asset.file).toLowerCase();
    const stored = await dependencies.mediaStore.putPublicFile(
      publicationObjectKey(
        `final/publication/${videoId}/image-${String(index + 1).padStart(2, '0')}${extension}`
      ),
      resolve(input.bundleDir, asset.file),
      imageContentType(asset.file)
    );
    if (!stored.publicUrl) throw new Error('PUBLIC_IMAGE_URL_MISSING');
    imageUrls.push(stored.publicUrl);
  }
  if (imageUrls.length === 0) {
    throw new Error('PUBLICATION_IMAGE_MISSING');
  }
  await emit('uploaded', 'upload', 'PUBLIC_MEDIA_UPLOADED', {
    imageCount: imageUrls.length
  });

  if (!input.publish) {
    const result = RunSummarySchema.parse({
      ...base, state: 'uploaded', render: 'OK', qa: 'OK', r2: 'OK', buffer: 'PULADO',
      tiktokStatus: 'não solicitado', xStatus: 'não solicitado',
      threadsStatus: 'não solicitado', publicUrl: videoStored.publicUrl
    });
    if (dependencies.reporter) await dependencies.reporter.sendSummary(result);
    await emit('uploaded', 'complete', 'UPLOAD_ONLY_COMPLETED');
    return result;
  }

  const assetsByChannel = {
    tiktok: [{kind: 'video' as const, url: videoStored.publicUrl}],
    x: imageUrls.slice(0, 4).map((url) => ({kind: 'image' as const, url})),
    threads: imageUrls.slice(0, 10).map((url) => ({kind: 'image' as const, url}))
  };
  const receipts = new Map<PublicationChannel, PublishReceipt | 'duplicate' | 'reconciliation'>();
  for (const channel of ['tiktok', 'x', 'threads'] as const) {
    const publicationKey = createPublicationKey({channel, videoId, contentHash});
    const request = PublishRequestSchema.parse({
      schemaVersion: '1.0.0', purpose: 'production', channel,
      productId: manifest.productId, videoId, contentHash, publicationKey,
      assets: assetsByChannel[channel], caption: variant.caption,
      affiliateUrl: manifest.affiliateUrl, thumbnailOffsetMs: 2000
    });
    const existing = await dependencies.idempotency.find(publicationKey);
    if (existing) {
      receipts.set(channel, 'duplicate');
      continue;
    }
    if (await dependencies.idempotency.findSubmission(publicationKey)) {
      receipts.set(channel, 'reconciliation');
      continue;
    }
    await dependencies.idempotency.markSubmitting(publicationKey, request);
    await emit('submitting', 'publish', 'BUFFER_SUBMISSION_STARTED', {channel});
    const receipt = await dependencies.publishers[channel].publish(request);
    await dependencies.idempotency.saveReceipt(publicationKey, receipt);
    await emit(
      receipt.status === 'confirmed' ? 'published'
        : receipt.status === 'ambiguous' ? 'needs_reconciliation' : 'rejected',
      'publish',
      'BUFFER_SUBMISSION_RECEIPT',
      {channel, status: receipt.status, publicationKey}
    );
    receipts.set(channel, receipt);
  }

  const statuses = [...receipts.values()];
  const hasAmbiguous = statuses.some((value) =>
    value === 'reconciliation' || (typeof value === 'object' && value.status === 'ambiguous'));
  const hasRejected = statuses.some((value) =>
    typeof value === 'object' && value.status === 'rejected');
  const allDuplicates = statuses.every((value) => value === 'duplicate');
  const state = hasAmbiguous ? 'needs_reconciliation'
    : hasRejected ? 'rejected'
      : allDuplicates ? 'skipped_duplicate' : 'published';
  const channelText = (channel: PublicationChannel): string => {
    const value = receipts.get(channel);
    if (value === 'duplicate') return 'duplicado ignorado';
    if (value === 'reconciliation' || !value) return 'reconciliação necessária';
    return receiptStatus(value);
  };
  const result = RunSummarySchema.parse({
    ...base,
    state,
    render: 'OK', qa: 'OK', r2: 'OK',
    buffer: hasAmbiguous || hasRejected ? 'ERRO' : 'OK',
    tiktokStatus: channelText('tiktok'),
    xStatus: channelText('x'),
    threadsStatus: channelText('threads'),
    publicUrl: videoStored.publicUrl,
    ...(hasAmbiguous ? {errorCode: 'PUBLICATION_NEEDS_RECONCILIATION'} : {})
  });
  if (dependencies.reporter) await dependencies.reporter.sendSummary(result);
  await emit(result.state, 'complete', 'PIPELINE_COMPLETED', {
    tiktok: result.tiktokStatus,
    x: result.xStatus,
    threads: result.threadsStatus
  });
  return result;
}
