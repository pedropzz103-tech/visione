import {describe, expect, it} from 'vitest';
import {classifyRetry} from '../../src/pipeline/retry-policy.js';

describe('classifyRetry', () => {
  it.each([429, 500, 503])('retries HTTP %s only before submission is claimed', (status) => {
    expect(classifyRetry({phase: 'before_submission', httpStatus: status})).toEqual({
      retry: true, needsReconciliation: false
    });
    expect(classifyRetry({phase: 'after_submission', httpStatus: status})).toEqual({
      retry: false, needsReconciliation: true
    });
  });

  it.each([400, 401, 403, 422])('never retries definitive HTTP %s failures', (status) => {
    expect(classifyRetry({phase: 'before_submission', httpStatus: status})).toEqual({
      retry: false, needsReconciliation: false
    });
  });

  it('treats a network loss after transmission as reconciliation', () => {
    expect(classifyRetry({phase: 'after_submission', networkError: true})).toEqual({
      retry: false, needsReconciliation: true
    });
  });
});
