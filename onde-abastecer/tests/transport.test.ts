import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchSource, snapshotCache } from '../api/src/lib/source';

test('source snapshot coalesces concurrent requests, caches success and retries after failure', async () => {
  let calls = 0;
  const snapshot = snapshotCache(async () => { calls++; if (calls === 1) throw Error('down'); return ['recovered']; });
  await assert.rejects(snapshot());
  const values = await Promise.all([snapshot(), snapshot()]);
  assert.deepEqual(values, [['recovered'], ['recovered']]);
  assert.equal(calls, 2);
  assert.deepEqual(await snapshot(), ['recovered']);
  assert.equal(calls, 2);
});
test('source retries transient errors once and does not expose upstream messages', async t => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => { attempts++; return new Response('private upstream details', { status: 503 }); });
  await assert.rejects(fetchSource('https://source.test'), { message: 'source_unavailable' });
  assert.equal(attempts, 2);
});
test('source does not retry a permanent 403', async t => {
  let attempts = 0;
  t.mock.method(globalThis, 'fetch', async () => { attempts++; return new Response('', { status: 403 }); });
  await assert.rejects(fetchSource('https://source.test'));
  assert.equal(attempts, 1);
});
