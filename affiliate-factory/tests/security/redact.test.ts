import {describe, expect, it} from 'vitest';
import {redactSecrets} from '../../src/security/redact.js';

describe('redactSecrets', () => {
  it('removes repeated configured secrets without changing ordinary text', () => {
    expect(redactSecrets('Bearer secret-token; secret-token; stage render', ['secret-token']))
      .toBe('Bearer [REDACTED]; [REDACTED]; stage render');
  });

  it('ignores empty secret values', () => {
    expect(redactSecrets('ordinary message', ['', '   '])).toBe('ordinary message');
  });
});
