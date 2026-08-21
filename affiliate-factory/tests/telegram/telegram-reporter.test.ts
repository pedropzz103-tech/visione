import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {formatTelegramReport} from '../../src/telegram/format-report.js';
import {TelegramReporter} from '../../src/telegram/telegram-reporter.js';
import {makeRunSummary} from '../helpers/factories.js';

describe('Telegram reporting', () => {
  it('formats the Portuguese multichannel result', () => {
    const text = formatTelegramReport(makeRunSummary());

    expect(text).toContain('Affiliate Factory');
    expect(text).toContain('Render: OK');
    expect(text).toContain('QA: OK');
    expect(text).toContain('TikTok: confirmado');
    expect(text).toContain('X: confirmado');
    expect(text).toContain('Threads: confirmado');
    expect(text).toContain('Video ID: vid_operator');
  });

  it('sends the final MP4 as multipart video and the result as JSON', async () => {
    const calls: Array<{url: string; init: RequestInit}> = [];
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({url: String(url), init: init ?? {}});
      return Response.json({ok: true, result: {message_id: 1}});
    }) as typeof fetch;
    const reporter = new TelegramReporter({token: 'bot-secret', chatId: '42', fetchFn});
    const video = join(await mkdtemp(join(tmpdir(), 'affiliate-video-')), 'final.mp4');
    await writeFile(video, Buffer.from('mp4'));

    await reporter.sendVideo(video, 'Affiliate Factory — MP4 final aprovado');
    await reporter.sendSummary(makeRunSummary());

    expect(calls[0]?.url).toMatch(/\/sendVideo$/);
    const form = calls[0]?.init.body as FormData;
    expect(form.get('chat_id')).toBe('42');
    expect((form.get('video') as File).name).toBe('final.mp4');
    expect(calls[1]?.url).toMatch(/\/sendMessage$/);
    expect(JSON.parse(String(calls[1]?.init.body))).toMatchObject({chat_id: '42'});
  });
});
