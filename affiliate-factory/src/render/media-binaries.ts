import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

function requireBinary(value: string | null | undefined, code: string): string {
  if (!value) {
    throw new Error(code);
  }
  return value;
}

export function resolveFfmpegPath(environment: NodeJS.ProcessEnv = process.env): string {
  const bundledPath = typeof ffmpegStatic === 'string'
    ? ffmpegStatic
    : (ffmpegStatic as unknown as {default?: string | null}).default;
  return requireBinary(environment.FFMPEG_PATH ?? bundledPath, 'FFMPEG_BINARY_NOT_FOUND');
}

export function resolveFfprobePath(environment: NodeJS.ProcessEnv = process.env): string {
  return requireBinary(environment.FFPROBE_PATH ?? ffprobeStatic.path, 'FFPROBE_BINARY_NOT_FOUND');
}
