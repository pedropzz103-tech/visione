import {describe, expect, it} from 'vitest';
import {formatConfigError, loadConfig} from '../src/config.js';

describe('configuration', () => {
  it('needs no provider secrets for dry-run', () => {
    expect(loadConfig({}, {mode: 'dry-run', publish: false})).toEqual({
      mode: 'dry-run', publish: false, telegram: null
    });
  });

  it('reports every missing production secret name without values', () => {
    let message = '';
    try {
      loadConfig({}, {mode: 'production', publish: true});
    } catch (error) {
      message = formatConfigError(error);
    }

    expect(message).toContain('R2_PRIVATE_BUCKET');
    expect(message).toContain('BUFFER_TIKTOK_CHANNEL_ID');
    expect(message).toContain('BUFFER_X_CHANNEL_ID');
    expect(message).toContain('BUFFER_THREADS_CHANNEL_ID');
    expect(message).toContain('TELEGRAM_BOT_TOKEN');
    expect(message).not.toContain('undefined=');
  });

  it('rejects a half-configured Telegram bot', () => {
    expect(() => loadConfig({TELEGRAM_BOT_TOKEN: 'secret'}, {
      mode: 'dry-run', publish: false
    })).toThrow('TELEGRAM_CONFIGURATION_INCOMPLETE');
  });
});
