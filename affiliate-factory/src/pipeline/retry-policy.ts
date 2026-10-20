export type RetryInput = {
  phase: 'before_submission' | 'after_submission';
  httpStatus?: number;
  networkError?: boolean;
};

export type RetryDecision = {retry: boolean; needsReconciliation: boolean};

export function classifyRetry(input: RetryInput): RetryDecision {
  const transientStatus = input.httpStatus === 429 || (input.httpStatus !== undefined && input.httpStatus >= 500);
  const transient = transientStatus || input.networkError === true;
  if (!transient) {
    return {retry: false, needsReconciliation: false};
  }
  if (input.phase === 'after_submission') {
    return {retry: false, needsReconciliation: true};
  }
  return {retry: true, needsReconciliation: false};
}
