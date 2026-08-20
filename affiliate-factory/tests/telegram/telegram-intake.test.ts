import {mkdtemp, readFile, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, it, vi} from 'vitest';
import {TelegramIntake} from '../../src/telegram/telegram-intake.js';

const caption = `/produto
nome: Organizador fornecido pelo operador
preco: 129,90
preco_anterior: 159,90
beneficios: Material informado | Tamanho informado
link: https://s.shopee.com.br/operator-link
cta: Confira pelo link de afiliado
legenda: #publicidade Produto fornecido pelo operador`;

describe('TelegramIntake', () => {
  it('accepts only the configured chat and groups a photo album', async () => {
    const fetchFn = vi.fn(async () => Response.json({ok: true, result: [
      {update_id: 200, message: {message_id: 1, chat: {id: 999}, caption, photo: [{file_id: 'bad'}]}},
      {update_id: 201, message: {message_id: 2, chat: {id: 42}, media_group_id: 'album-1', caption,
        photo: [{file_id: 'small-1'}, {file_id: 'large-1'}]}},
      {update_id: 202, message: {message_id: 3, chat: {id: 42}, media_group_id: 'album-1',
        photo: [{file_id: 'large-2'}]}}
    ]})) as typeof fetch;
    const intake = new TelegramIntake({token: 'bot-secret', allowedChatId: '42', fetchFn});

    const result = await intake.poll(100);

    expect(result.nextOffset).toBe(203);
    expect(result.submissions).toHaveLength(1);
    expect(result.submissions[0]).toMatchObject({
      sourceId: 'album-1', chatId: '42', fileIds: ['large-1', 'large-2']
    });
    expect(result.submissions[0]?.manifest).toMatchObject({
      purpose: 'production', currentPriceMinor: 12990, previousPriceMinor: 15990,
      affiliateUrl: 'https://s.shopee.com.br/operator-link'
    });
  });

  it('downloads operator photos and writes a valid manual bundle', async () => {
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      if (target.endsWith('/getFile')) {
        const fileId = JSON.parse(String(init?.body)).file_id as string;
        return Response.json({ok: true, result: {file_path: `photos/${fileId}.jpg`}});
      }
      if (target.includes('/file/bot')) {
        return new Response(Buffer.from('operator-image'), {
          status: 200, headers: {'Content-Type': 'image/jpeg'}
        });
      }
      throw new Error('unexpected request');
    }) as typeof fetch;
    const intake = new TelegramIntake({token: 'bot-secret', allowedChatId: '42', fetchFn});
    const parsed = intake.parseSubmission({
      sourceId: 'message-2', updateIds: [201], chatId: '42', caption,
      fileIds: ['large-1', 'large-2']
    });
    const output = await mkdtemp(join(tmpdir(), 'affiliate-telegram-'));

    const bundleDir = await intake.materialize(parsed, output);

    const manifest = JSON.parse(await readFile(join(bundleDir, 'manifest.json'), 'utf8'));
    expect(manifest.assets).toHaveLength(2);
    expect(manifest.assets[0].provenance).toMatchObject({
      sourceType: 'operator-supplied', source: 'telegram:42:201'
    });
    await expect(stat(join(bundleDir, 'assets', 'telegram-01.jpg')))
      .resolves.toMatchObject({size: 14});
  });
});
