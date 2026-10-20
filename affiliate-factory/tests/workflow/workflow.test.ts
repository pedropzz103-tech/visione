import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';

describe('Affiliate Factory workflow', () => {
  it('is manual-only, least-privilege, and automatically publishes valid manual input', () => {
    const workflow = parse(readFileSync(
      resolve('..', '.github', 'workflows', 'affiliate-factory-manual.yml'),
      'utf8'
    ));

    expect(workflow.on).toEqual({workflow_dispatch: expect.any(Object)});
    expect(workflow.permissions).toEqual({contents: 'read'});
    expect(workflow.on.workflow_dispatch.inputs.publish.default).toBe(true);
    expect(workflow.on.workflow_dispatch.inputs.mode).toBeUndefined();
    expect(JSON.stringify(workflow)).not.toContain('schedule');
    expect(JSON.stringify(workflow)).not.toContain('git push');
  });

  it('polls Telegram and maps every multichannel secret by name', () => {
    const source = readFileSync(
      resolve('..', '.github', 'workflows', 'affiliate-factory-manual.yml'),
      'utf8'
    );

    expect(source).toContain('telegram-poll');
    expect(source).toContain('telegram-commit');
    expect(source.indexOf('telegram-commit')).toBeGreaterThan(source.indexOf('Run every collected product'));
    expect(source).toContain('BUFFER_TIKTOK_CHANNEL_ID');
    expect(source).toContain('BUFFER_X_CHANNEL_ID');
    expect(source).toContain('BUFFER_THREADS_CHANNEL_ID');
    expect(source).toContain('TELEGRAM_ALLOWED_CHAT_ID');
    expect(source).not.toContain('r2-media-sync');
    expect(source).not.toContain('deploy-pages');
  });
});
