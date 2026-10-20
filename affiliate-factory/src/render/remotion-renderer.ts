import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, stat} from 'node:fs/promises';
import {dirname} from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {
  RenderResultSchema,
  type ChannelCreativeVariant,
  type RenderResult
} from '../contracts/index.js';
import {calculateLayout} from './remotion/layout.js';

export type RemotionRenderInput = {
  variant: ChannelCreativeVariant;
  bundleDir: string;
  outputPath: string;
  videoId: string;
};

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

export class RemotionRenderer {
  public constructor(private readonly options: {entryPoint: string}) {}

  public async render(input: RemotionRenderInput): Promise<RenderResult> {
    await mkdir(dirname(input.outputPath), {recursive: true});
    const serveUrl = await bundle({
      entryPoint: this.options.entryPoint,
      publicDir: input.bundleDir,
      enableCaching: true,
      webpackOverride: (configuration) => ({
        ...configuration,
        resolve: {
          ...configuration.resolve,
          extensionAlias: {
            ...configuration.resolve?.extensionAlias,
            '.js': ['.ts', '.tsx', '.js']
          }
        }
      })
    });
    const inputProps = {variant: input.variant};
    const composition = await selectComposition({
      serveUrl,
      id: 'commercial-vertical',
      inputProps
    });

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: input.outputPath,
      inputProps,
      pixelFormat: 'yuv420p',
      crf: 18,
      imageFormat: 'jpeg',
      overwrite: true
    });

    const file = await stat(input.outputPath);
    return RenderResultSchema.parse({
      schemaVersion: '1.0.0',
      videoId: input.videoId,
      outputPath: input.outputPath,
      contentHash: await hashFile(input.outputPath),
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      frameCount: composition.durationInFrames,
      durationSeconds: composition.durationInFrames / composition.fps,
      videoCodec: 'h264',
      audioCodec: null,
      sizeBytes: file.size,
      layout: calculateLayout(input.variant)
    });
  }
}
