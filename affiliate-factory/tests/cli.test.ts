import {describe, expect, it} from 'vitest';
import {parseCliArgs} from '../src/cli.js';

describe('parseCliArgs', () => {
  it('parses validate, render, run, and telegram-poll commands', () => {
    expect(parseCliArgs(['validate', '--bundle', 'bundle'])).toEqual({
      command: 'validate', bundleDir: 'bundle'
    });
    expect(parseCliArgs(['render', '--bundle', 'bundle', '--output', 'video.mp4'])).toEqual({
      command: 'render', bundleDir: 'bundle', outputPath: 'video.mp4'
    });
    expect(parseCliArgs(['run', '--bundle', 'bundle', '--mode', 'production', '--publish']))
      .toEqual({command: 'run', bundleDir: 'bundle', mode: 'production', publish: true});
    expect(parseCliArgs(['telegram-poll', '--output', 'inbox'])).toEqual({
      command: 'telegram-poll', outputDir: 'inbox'
    });
  });

  it('rejects unsafe or unknown combinations', () => {
    expect(() => parseCliArgs(['run', '--bundle', 'bundle', '--mode', 'dry-run', '--publish']))
      .toThrow('PUBLISH_REQUIRES_PRODUCTION_MODE');
    expect(() => parseCliArgs(['run', '--bundle', 'bundle', '--wat']))
      .toThrow('UNKNOWN_FLAG');
    expect(() => parseCliArgs(['validate']))
      .toThrow('BUNDLE_REQUIRED');
  });
});
