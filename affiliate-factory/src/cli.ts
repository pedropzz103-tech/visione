import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {z} from 'zod';
import {loadConfig, formatConfigError, type ConfigMode} from './config.js';
import {createBaseCreativePlan} from './creative/base-plan.js';
import {createTikTokVariant} from './creative/tiktok-variant.js';
import {createBundleContentHash, createVideoId} from './identity/content-identity.js';
import {loadManualBundle} from './intake/manual-bundle.js';
import {runPipeline, type PipelineDependencies} from './pipeline/runner.js';
import {BufferPublisher} from './publish/buffer-publisher.js';
import {NoopPublisher} from './publish/noop-publisher.js';
import {probeMedia} from './quality/ffprobe.js';
import {runQualityGate} from './quality/quality-gate.js';
import {normalizeMedia} from './render/ffmpeg-normalizer.js';
import {RemotionRenderer} from './render/remotion-renderer.js';
import {InMemoryIdempotencyStore} from './state/idempotency-store.js';
import {R2IdempotencyStore} from './state/r2-idempotency-store.js';
import {FilesystemMediaStore} from './storage/filesystem-media-store.js';
import {privateObjectKey, type MediaStore} from './storage/media-store.js';
import {R2MediaStore} from './storage/r2-media-store.js';
import {TelegramIntake} from './telegram/telegram-intake.js';
import {TelegramReporter} from './telegram/telegram-reporter.js';

export type CliCommand =
  | {command: 'validate'; bundleDir: string}
  | {command: 'render'; bundleDir: string; outputPath: string}
  | {command: 'run'; bundleDir: string; mode: ConfigMode; publish: boolean}
  | {command: 'telegram-poll'; outputDir: string}
  | {command: 'telegram-commit'; offset: number};

function flags(args: string[]): Map<string, string | true> {
  const result = new Map<string, string | true>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag?.startsWith('--')) throw new Error('UNKNOWN_ARGUMENT');
    if (flag === '--publish') {
      result.set(flag, true);
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`VALUE_REQUIRED: ${flag}`);
    result.set(flag, value);
    index += 1;
  }
  return result;
}

function rejectUnknown(values: Map<string, string | true>, allowed: string[]): void {
  for (const key of values.keys()) {
    if (!allowed.includes(key)) throw new Error(`UNKNOWN_FLAG: ${key}`);
  }
}

function stringFlag(values: Map<string, string | true>, name: string, code: string): string {
  const value = values.get(name);
  if (typeof value !== 'string') throw new Error(code);
  return value;
}

export function parseCliArgs(args: string[]): CliCommand {
  const [command, ...rest] = args;
  const allowedByCommand: Record<string, string[]> = {
    validate: ['--bundle'],
    render: ['--bundle', '--output'],
    run: ['--bundle', '--mode', '--publish'],
    'telegram-poll': ['--output'],
    'telegram-commit': ['--offset']
  };
  const allowed = command ? allowedByCommand[command] : undefined;
  if (allowed) {
    const unknown = rest.find((value) => value.startsWith('--') && !allowed.includes(value));
    if (unknown) throw new Error(`UNKNOWN_FLAG: ${unknown}`);
  }
  const values = flags(rest);
  if (command === 'validate') {
    rejectUnknown(values, ['--bundle']);
    return {command, bundleDir: stringFlag(values, '--bundle', 'BUNDLE_REQUIRED')};
  }
  if (command === 'render') {
    rejectUnknown(values, ['--bundle', '--output']);
    return {
      command,
      bundleDir: stringFlag(values, '--bundle', 'BUNDLE_REQUIRED'),
      outputPath: stringFlag(values, '--output', 'OUTPUT_REQUIRED')
    };
  }
  if (command === 'run') {
    rejectUnknown(values, ['--bundle', '--mode', '--publish']);
    const mode = stringFlag(values, '--mode', 'MODE_REQUIRED');
    if (mode !== 'dry-run' && mode !== 'production') throw new Error('MODE_INVALID');
    const publish = values.get('--publish') === true;
    if (publish && mode !== 'production') throw new Error('PUBLISH_REQUIRES_PRODUCTION_MODE');
    return {
      command,
      bundleDir: stringFlag(values, '--bundle', 'BUNDLE_REQUIRED'),
      mode,
      publish
    };
  }
  if (command === 'telegram-poll') {
    rejectUnknown(values, ['--output']);
    return {command, outputDir: stringFlag(values, '--output', 'OUTPUT_REQUIRED')};
  }
  if (command === 'telegram-commit') {
    rejectUnknown(values, ['--offset']);
    const value = Number(stringFlag(values, '--offset', 'OFFSET_REQUIRED'));
    if (!Number.isInteger(value) || value < 0) throw new Error('OFFSET_INVALID');
    return {command, offset: value};
  }
  throw new Error('COMMAND_INVALID');
}

function r2Store(config: ReturnType<typeof loadConfig>): R2MediaStore {
  if (!config.r2) throw new Error('R2_CONFIGURATION_MISSING');
  return new R2MediaStore({
    accountId: config.r2.accountId,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    privateBucket: config.r2.privateBucket,
    publicBucket: config.r2.publicBucket,
    publicBaseUrl: config.r2.publicBaseUrl
  });
}

function makeRenderer(): RemotionRenderer {
  return new RemotionRenderer({entryPoint: resolve('src/render/remotion-entry.tsx')});
}

async function renderCommand(bundleDir: string, outputPath: string): Promise<void> {
  const manifest = await loadManualBundle(bundleDir);
  const contentHash = await createBundleContentHash(manifest, bundleDir);
  const videoId = createVideoId({
    productId: manifest.productId, contentHash,
    templateVersion: 'commercial-vertical@1', rendererVersion: 'remotion@4.0.514'
  });
  const variant = createTikTokVariant(manifest, createBaseCreativePlan(manifest));
  const rawPath = join(dirname(resolve(outputPath)), `${videoId}-raw.mp4`);
  const raw = await makeRenderer().render({
    variant, bundleDir: resolve(bundleDir), outputPath: rawPath, videoId
  });
  const final = await normalizeMedia({render: raw, outputPath: resolve(outputPath)});
  const probe = await probeMedia(final.outputPath);
  const qa = runQualityGate({
    manifest, variant, render: final, probe, layout: final.layout, fatalDiagnostics: []
  });
  if (!qa.passed) throw new Error('QUALITY_GATE_FAILED');
  process.stdout.write(`${JSON.stringify({videoId, outputPath: final.outputPath, probe, qa}, null, 2)}\n`);
}

async function runCommand(command: Extract<CliCommand, {command: 'run'}>): Promise<void> {
  const config = loadConfig(process.env, {mode: command.mode, publish: command.publish});
  let mediaStore: MediaStore;
  let idempotency: PipelineDependencies['idempotency'];
  if (command.mode === 'production') {
    mediaStore = r2Store(config);
    idempotency = new R2IdempotencyStore(mediaStore);
  } else {
    mediaStore = new FilesystemMediaStore({
      root: resolve('.tmp', 'media-store'),
      publicBaseUrl: 'https://dry-run.invalid'
    });
    idempotency = new InMemoryIdempotencyStore();
  }
  const noop = new NoopPublisher();
  const publishers: PipelineDependencies['publishers'] = {
    tiktok: noop, x: noop, threads: noop
  };
  if (config.buffer) {
    const shared = {
      apiKey: config.buffer.apiKey,
      organizationId: config.buffer.organizationId
    };
    const tiktokPublisher = new BufferPublisher({
      ...shared, channel: 'tiktok', expectedService: 'tiktok',
      channelId: config.buffer.tiktokChannelId
    });
    const xPublisher = new BufferPublisher({
      ...shared, channel: 'x', expectedService: 'twitter',
      channelId: config.buffer.xChannelId
    });
    const threadsPublisher = new BufferPublisher({
      ...shared, channel: 'threads', expectedService: 'threads',
      channelId: config.buffer.threadsChannelId
    });
    if (command.publish) {
      await Promise.all([
        tiktokPublisher.validateConnection(),
        xPublisher.validateConnection(),
        threadsPublisher.validateConnection()
      ]);
    }
    publishers.tiktok = tiktokPublisher;
    publishers.x = xPublisher;
    publishers.threads = threadsPublisher;
  }
  const reporter = config.telegram
    ? new TelegramReporter({token: config.telegram.token, chatId: config.telegram.chatId})
    : undefined;
  let eventSequence = 0;
  const recordEvent: NonNullable<PipelineDependencies['recordEvent']> = async (event) => {
    eventSequence += 1;
    await mediaStore.putPrivateJson(
      privateObjectKey(
        `runs/${event.runId}/events/${String(eventSequence).padStart(4, '0')}-${event.stage}.json`
      ),
      event
    );
  };
  const summary = await runPipeline({
    bundleDir: resolve(command.bundleDir),
    outputDir: resolve('artifacts'),
    mode: command.mode,
    publish: command.publish
  }, {
    renderer: makeRenderer(), normalize: normalizeMedia, probe: probeMedia,
    qualityGate: runQualityGate, mediaStore, idempotency, publishers,
    ...(reporter ? {reporter} : {}),
    recordEvent,
    now: () => new Date()
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function telegramPoll(outputDir: string): Promise<void> {
  const config = loadConfig(process.env, {mode: 'production', publish: false});
  if (!config.telegram) throw new Error('TELEGRAM_CONFIGURATION_MISSING');
  const store = r2Store(config);
  const offsetKey = privateObjectKey('state/telegram/update-offset.json');
  const saved = await store.getPrivateJson(offsetKey, z.object({offset: z.number().int().nonnegative()}));
  const intake = new TelegramIntake({
    token: config.telegram.token,
    allowedChatId: config.telegram.chatId
  });
  const result = await intake.poll(saved?.offset ?? 0);
  const bundles: string[] = [];
  for (const submission of result.submissions) {
    bundles.push(await intake.materialize(submission, resolve(outputDir)));
  }
  process.stdout.write(`${JSON.stringify({bundles, nextOffset: result.nextOffset}, null, 2)}\n`);
}

async function telegramCommit(offset: number): Promise<void> {
  const config = loadConfig(process.env, {mode: 'production', publish: false});
  if (!config.telegram) throw new Error('TELEGRAM_CONFIGURATION_MISSING');
  const store = r2Store(config);
  await store.putPrivateJson(
    privateObjectKey('state/telegram/update-offset.json'),
    {offset}
  );
  process.stdout.write(`${JSON.stringify({committedOffset: offset})}\n`);
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const command = parseCliArgs(args);
  if (command.command === 'validate') {
    const manifest = await loadManualBundle(command.bundleDir);
    process.stdout.write(`${JSON.stringify({valid: true, productId: manifest.productId})}\n`);
  } else if (command.command === 'render') {
    await renderCommand(command.bundleDir, command.outputPath);
  } else if (command.command === 'run') {
    await runCommand(command);
  } else if (command.command === 'telegram-poll') {
    await telegramPoll(command.outputDir);
  } else {
    await telegramCommit(command.offset);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const configMessage = formatConfigError(error);
    const message = configMessage === 'CONFIGURATION_INVALID'
      ? (error instanceof Error ? error.message : 'AFFILIATE_FACTORY_FAILED')
      : configMessage;
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
