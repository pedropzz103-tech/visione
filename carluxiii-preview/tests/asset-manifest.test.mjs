import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const files = [
  'a110-front-01.b64','a110-front-02.b64',
  'a110-front-03a.b64','a110-front-03b.b64','a110-front-03c.b64','a110-front-03d.b64',
  'a110-front-04.b64','a110-front-05.b64','a110-front-06.b64','a110-front-07.b64','a110-front-08.b64'
];

test('A110 chunk manifest reconstructs the verified WebP', async () => {
  const parts = await Promise.all(files.map(file => readFile(new URL(`../assets/${file}`, import.meta.url), 'utf8')));
  const bytes = Buffer.from(parts.join(''), 'base64');
  assert.equal(bytes.length, 65576);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '546325ef4825b6567d289352cc6b6322c88700d40ce7f94e9435cc203f0e0ee7');
});

test('entrypoint and stylesheet are cache-busted', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /styles\.css\?v=20260822-001/);
  assert.match(html, /app\.mjs\?v=20260822-001/);
});