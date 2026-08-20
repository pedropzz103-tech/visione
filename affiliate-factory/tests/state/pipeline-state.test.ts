import {describe, expect, it} from 'vitest';
import {transition} from '../../src/state/pipeline-state.js';

describe('pipeline state machine', () => {
  it('allows the complete happy path', () => {
    expect(transition('received', 'VALIDATED')).toBe('validated');
    expect(transition('validated', 'PLANNED')).toBe('planned');
    expect(transition('planned', 'RENDERED')).toBe('rendered');
    expect(transition('rendered', 'QA_PASSED')).toBe('qa_passed');
    expect(transition('qa_passed', 'UPLOADED')).toBe('uploaded');
    expect(transition('uploaded', 'SUBMIT')).toBe('submitting');
    expect(transition('submitting', 'PUBLISHED')).toBe('published');
  });

  it('rejects backward movement', () => {
    expect(() => transition('qa_passed', 'RENDERED')).toThrow(
      'ILLEGAL_STATE_TRANSITION'
    );
  });

  it('makes ambiguous submission terminal for automation', () => {
    expect(transition('submitting', 'SUBMISSION_AMBIGUOUS'))
      .toBe('needs_reconciliation');
    expect(() => transition('needs_reconciliation', 'SUBMIT')).toThrow(
      'ILLEGAL_STATE_TRANSITION'
    );
  });
});
