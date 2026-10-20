import type {PipelineState} from '../contracts/index.js';

export type PipelineEvent =
  | 'VALIDATED'
  | 'PLANNED'
  | 'RENDERED'
  | 'QA_PASSED'
  | 'UPLOADED'
  | 'SUBMIT'
  | 'PUBLISHED'
  | 'REJECT'
  | 'FAIL'
  | 'SUBMISSION_AMBIGUOUS'
  | 'DUPLICATE';

const transitions: Partial<
  Record<PipelineState, Partial<Record<PipelineEvent, PipelineState>>>
> = {
  received: {VALIDATED: 'validated', REJECT: 'rejected', FAIL: 'failed'},
  validated: {PLANNED: 'planned', REJECT: 'rejected', FAIL: 'failed'},
  planned: {RENDERED: 'rendered', REJECT: 'rejected', FAIL: 'failed'},
  rendered: {QA_PASSED: 'qa_passed', REJECT: 'rejected', FAIL: 'failed'},
  qa_passed: {UPLOADED: 'uploaded', REJECT: 'rejected', FAIL: 'failed'},
  uploaded: {
    SUBMIT: 'submitting',
    DUPLICATE: 'skipped_duplicate',
    FAIL: 'failed'
  },
  submitting: {
    PUBLISHED: 'published',
    REJECT: 'rejected',
    SUBMISSION_AMBIGUOUS: 'needs_reconciliation'
  }
};

export function transition(
  current: PipelineState,
  event: PipelineEvent
): PipelineState {
  const next = transitions[current]?.[event];
  if (next === undefined) {
    throw new Error('ILLEGAL_STATE_TRANSITION: ' + current + ' + ' + event);
  }
  return next;
}
