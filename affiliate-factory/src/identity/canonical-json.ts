function nonCanonical(): never {
  throw new TypeError('NON_CANONICAL_VALUE');
}

function serialize(value: unknown, seen: WeakSet<object>): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : nonCanonical();
  }
  if (typeof value !== 'object') {
    return nonCanonical();
  }
  if (seen.has(value)) {
    return nonCanonical();
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return '[' + value.map((item) => serialize(item, seen)).join(',') + ']';
    }
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      return nonCanonical();
    }
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + serialize(record[key], seen));
    return '{' + entries.join(',') + '}';
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return serialize(value, new WeakSet<object>());
}
