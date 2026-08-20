import {execa} from 'execa';
import {z} from 'zod';
import {MediaProbeSchema, type MediaProbe} from '../contracts/index.js';
import {resolveFfprobePath} from '../render/media-binaries.js';

const NumberLike = z.union([z.number(), z.string()]);
const StreamSchema = z.object({
  codec_type: z.string(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  avg_frame_rate: z.string().optional(),
  duration: NumberLike.optional()
});

const FfprobeOutputSchema = z.object({
  streams: z.array(StreamSchema),
  format: z.object({
    duration: NumberLike,
    size: NumberLike
  })
});

function positiveNumber(value: string | number | undefined, code: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(code);
  }
  return parsed;
}

function parseFrameRate(value: string | undefined): number {
  if (!value) {
    throw new Error('FFPROBE_INVALID_FRAME_RATE');
  }
  const match = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(value);
  if (!match) {
    throw new Error('FFPROBE_INVALID_FRAME_RATE');
  }
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    throw new Error('FFPROBE_INVALID_FRAME_RATE');
  }
  const fps = numerator / denominator;
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('FFPROBE_INVALID_FRAME_RATE');
  }
  return fps;
}

export function parseFfprobe(input: unknown): MediaProbe {
  const parsed = FfprobeOutputSchema.parse(input);
  const video = parsed.streams.find((stream) => stream.codec_type === 'video');
  const audio = parsed.streams.find((stream) => stream.codec_type === 'audio');
  if (!video?.codec_name || !video.width || !video.height) {
    throw new Error('FFPROBE_VIDEO_STREAM_MISSING');
  }
  const videoFps = parseFrameRate(video.avg_frame_rate);
  if (!audio?.codec_name) {
    throw new Error('FFPROBE_AUDIO_STREAM_MISSING');
  }

  const formatDuration = positiveNumber(parsed.format.duration, 'FFPROBE_INVALID_DURATION');
  return MediaProbeSchema.parse({
    video: {
      codec: video.codec_name,
      width: video.width,
      height: video.height,
      fps: videoFps,
      durationSeconds: positiveNumber(video.duration ?? formatDuration, 'FFPROBE_INVALID_VIDEO_DURATION')
    },
    audio: {codec: audio.codec_name},
    format: {
      durationSeconds: formatDuration,
      sizeBytes: positiveNumber(parsed.format.size, 'FFPROBE_INVALID_FILE_SIZE')
    }
  });
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  const result = await execa(resolveFfprobePath(), [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    path
  ]);
  return parseFfprobe(JSON.parse(result.stdout));
}
