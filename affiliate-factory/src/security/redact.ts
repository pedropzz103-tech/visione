export function redactSecrets(value: string, secrets: readonly string[]): string {
  return secrets
    .map((secret) => secret.trim())
    .filter((secret) => secret.length > 0)
    .sort((left, right) => right.length - left.length)
    .reduce((redacted, secret) => redacted.replaceAll(secret, '[REDACTED]'), value);
}
