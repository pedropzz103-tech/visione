import assert from 'node:assert/strict';
import { test } from 'node:test';
const config = await import('../mobile/src/lib/apiUrl').catch(() => ({}));
const bridge = await import('../mobile/src/lib/mapBridge').catch(() => ({}));
test('APK API configuration permits HTTPS and private-LAN development without embedded credentials', () => {
  assert.equal(typeof config.normalizeApiUrl, 'function');
  assert.equal(config.normalizeApiUrl(' https://api.example.test/base/ '), 'https://api.example.test/base');
  assert.equal(config.normalizeApiUrl('http://192.168.1.20:8788'), 'http://192.168.1.20:8788');
  for (const value of ['', 'file:///tmp/api', 'javascript:alert(1)', 'https://user:secret@example.test', 'https://example.test/?token=secret', 'http://example.test', 'http://172.40.0.1']) assert.equal(config.normalizeApiUrl(value), undefined);
});
test('Android map bridge rejects malformed selection and coordinate messages', () => {
  assert.equal(typeof bridge.parseMapMessage, 'function');
  assert.deepEqual(bridge.parseMapMessage('{"type":"select","key":"ES:1"}'), { type: 'select', key: 'ES:1' });
  assert.deepEqual(bridge.parseMapMessage('{"type":"ready"}'), { type: 'ready' });
  for (const raw of ['not json', '{}', '{"type":"select","key":{}}', '{"type":"region","latitude":999,"longitude":1,"latitudeDelta":1,"longitudeDelta":1}', '{"type":"region","latitude":1,"longitude":1,"latitudeDelta":-1,"longitudeDelta":1}']) assert.equal(bridge.parseMapMessage(raw), undefined);
});
