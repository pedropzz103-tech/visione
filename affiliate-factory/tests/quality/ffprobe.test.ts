import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';
import {parseFfprobe} from '../../src/quality/ffprobe.js';

const fixture = (name: string): Promise<string> => readFile(
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
  'utf8'
);

describe('parseFfprobe', () => {
  it('normalizes rational FPS and extracts required codecs', async () => {
    const probe = parseFfprobe(JSON.parse(await fixture('ffprobe-valid.json')));

    expect(probe.video).toMatchObject({
      codec: 'h264',
      width: 1080,
      height: 1920,
      fps: 30,
      durationSeconds: 15
    });
    expect(probe.audio?.codec).toBe('aac');
    expect(probe.format).toEqual({durationSeconds: 15, sizeBytes: 2_048_000});
  });

  it('rejects a zero FPS denominator', async () => {
    const input = JSON.parse(await fixture('ffprobe-invalid.json'));
    expect(() => parseFfprobe(input))
      .toThrow('FFPROBE_INVALID_FRAME_RATE');
  });
});
