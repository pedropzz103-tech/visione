import {describe, expect, it} from 'vitest';
import packageJson from '../../package.json' with {type: 'json'};
import {AFFILIATE_FACTORY_VERSION} from '../../src/index.js';

describe('package boundary', () => {
  it('stays private, requires Node 22, and has no OpenAI dependency', () => {
    expect(packageJson.private).toBe(true);
    expect(packageJson.engines.node).toBe('>=22');
    expect(Object.keys(packageJson.dependencies)).not.toContain('openai');
    expect(AFFILIATE_FACTORY_VERSION).toBe('0.1.0');
  });
});
