import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, stat} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execa} from 'execa';
import {RenderResultSchema, type RenderResult} from '../contracts/index.js';
import {resolveFfmpegPath} from './media-binaries.js';

export type NormalizeMediaInput = {
  render: RenderResult;
  outputPath: string;
  licensedAudioPath?: string;
};

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

export async function normalizeMedia(input: NormalizeMediaInput): Promise<RenderResult> {
  await mkdir(dirname(input.outputPath), {recursive: true});
  const audioInput = input.licensedAudioPath
    ? ['-i', input.licensedAudioPath]
    : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'];

  await execa(resolveFfmpegPath(), [
    '-n',
    '-i', input.render.outputPath,
    ...audioInput,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-r', '30',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-t', String(input.render.durationSeconds),
    '-shortest',
    '-movflags', '+faststart',
    input.outputPath
  ]);

  const file = await stat(input.outputPath);
  return RenderResultSchema.parse({
    ...input.render,
    outputPath: input.outputPath,
    contentHash: await hashFile(input.outputPath),
    videoCodec: 'h264',
    audioCodec: 'aac',
    sizeBytes: file.size
  });
}
