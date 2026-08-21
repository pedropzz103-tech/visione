import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {
  ProductManifestSchema,
  type ProductionManifest
} from '../contracts/index.js';

type TelegramPhoto = {file_id?: string};
type TelegramMessage = {
  message_id?: number;
  chat?: {id?: number | string};
  media_group_id?: string;
  caption?: string;
  text?: string;
  photo?: TelegramPhoto[];
};
type TelegramUpdate = {update_id?: number; message?: TelegramMessage};

export type TelegramRawSubmission = {
  sourceId: string;
  updateIds: number[];
  chatId: string;
  caption: string;
  fileIds: string[];
};

export type TelegramSubmission = TelegramRawSubmission & {
  manifest: ProductionManifest;
};

export type TelegramPollResult = {
  nextOffset: number;
  submissions: TelegramSubmission[];
};

export type TelegramIntakeOptions = {
  token: string;
  allowedChatId: string;
  fetchFn?: typeof fetch;
};

function parseMoney(value: string, field: string): number {
  const normalized = value.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`TELEGRAM_INVALID_${field.toUpperCase()}`);
  }
  return Math.round(amount * 100);
}

function captionFields(caption: string): Map<string, string> {
  const fields = new Map<string, string>();
  const aliases = new Map([
    ['produto', 'nome'],
    ['nome', 'nome'],
    ['valor', 'preco'],
    ['preco', 'preco'],
    ['preço', 'preco'],
    ['de', 'preco_anterior'],
    ['preco_anterior', 'preco_anterior'],
    ['preço_anterior', 'preco_anterior'],
    ['beneficios', 'beneficios'],
    ['benefícios', 'beneficios'],
    ['vantagens', 'beneficios'],
    ['link', 'link'],
    ['url', 'link'],
    ['headline', 'headline'],
    ['chamada', 'headline'],
    ['cta', 'cta'],
    ['botao', 'cta'],
    ['botão', 'cta'],
    ['legenda', 'legenda'],
    ['texto', 'legenda']
  ]);
  for (const line of caption.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = /^([a-z_çãõéíóú]+)\s*:?\s+(.+)$/i.exec(trimmed);
    if (match?.[1] && match[2]) {
      const key = aliases.get(match[1].toLowerCase());
      if (key) fields.set(key, match[2].trim());
    }
  }
  return fields;
}

function isProductText(value: string | undefined): value is string {
  return Boolean(value?.trim().startsWith('/produto'));
}

function splitBenefits(value: string): string[] {
  return value
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function required(fields: Map<string, string>, name: string): string {
  const value = fields.get(name);
  if (!value) {
    throw new Error(`TELEGRAM_MISSING_${name.toUpperCase()}`);
  }
  return value;
}

export class TelegramIntake {
  readonly #fetch: typeof fetch;

  public constructor(private readonly options: TelegramIntakeOptions) {
    this.#fetch = options.fetchFn ?? fetch;
  }

  #method(name: string): string {
    return `https://api.telegram.org/bot${this.options.token}/${name}`;
  }

  public parseSubmission(raw: TelegramRawSubmission): TelegramSubmission {
    const fields = captionFields(raw.caption);
    const benefits = splitBenefits(required(fields, 'beneficios'));
    const previousPrice = fields.get('preco_anterior');
    const productId = `telegram-${raw.sourceId}`
      .replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100);
    const manifest = ProductManifestSchema.parse({
      schemaVersion: '1.0.0',
      purpose: 'production',
      productId,
      productName: required(fields, 'nome'),
      affiliateUrl: required(fields, 'link'),
      currency: 'BRL',
      currentPriceMinor: parseMoney(required(fields, 'preco'), 'preco'),
      ...(previousPrice ? {previousPriceMinor: parseMoney(previousPrice, 'preco_anterior')} : {}),
      benefits,
      assets: raw.fileIds.map((_fileId, index) => ({
        id: `telegram-${String(index + 1).padStart(2, '0')}`,
        kind: 'image',
        file: `assets/telegram-${String(index + 1).padStart(2, '0')}.jpg`,
        provenance: {
          sourceType: 'operator-supplied',
          source: `telegram:${raw.chatId}:${raw.updateIds.join(',')}`
        }
      })),
      ...(fields.get('headline') ? {headline: fields.get('headline')} : {}),
      cta: required(fields, 'cta'),
      caption: required(fields, 'legenda'),
      durationSeconds: 15
    }) as ProductionManifest;
    return {...raw, manifest};
  }

  public async poll(offset: number): Promise<TelegramPollResult> {
    const response = await this.#fetch(this.#method('getUpdates'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({offset, limit: 100, timeout: 0, allowed_updates: ['message']})
    });
    if (!response.ok) {
      throw new Error('TELEGRAM_GET_UPDATES_FAILED');
    }
    const payload = await response.json() as {ok?: boolean; result?: TelegramUpdate[]};
    if (!payload.ok || !Array.isArray(payload.result)) {
      throw new Error('TELEGRAM_GET_UPDATES_INVALID');
    }
    const highest = payload.result.reduce(
      (value, update) => Math.max(value, update.update_id ?? value),
      offset - 1
    );
    const groups = new Map<string, TelegramRawSubmission>();
    let pendingText: {caption: string; updateId: number} | undefined;
    let latestCaptionlessSourceId: string | undefined;
    for (const update of payload.result) {
      const message = update.message;
      const updateId = update.update_id;
      const chatId = message?.chat?.id === undefined ? '' : String(message.chat.id);
      if (!message || chatId !== this.options.allowedChatId || updateId === undefined) {
        continue;
      }
      if (isProductText(message.text)) {
        if (latestCaptionlessSourceId) {
          const current = groups.get(latestCaptionlessSourceId);
          if (current && !current.caption) {
            current.caption = message.text;
            current.updateIds.unshift(updateId);
            pendingText = undefined;
            continue;
          }
        }
        pendingText = {caption: message.text, updateId};
        continue;
      }
      const photos = message?.photo;
      const fileId = photos?.[photos.length - 1]?.file_id;
      if (!fileId) {
        continue;
      }
      const sourceId = message.media_group_id ?? `message-${message.message_id ?? updateId}`;
      const current = groups.get(sourceId) ?? {
        sourceId, updateIds: [], chatId, caption: '', fileIds: []
      };
      if (!current.caption && pendingText) {
        current.caption = pendingText.caption;
        current.updateIds.push(pendingText.updateId);
        pendingText = undefined;
      }
      current.updateIds.push(updateId);
      current.fileIds.push(fileId);
      if (message.caption) {
        current.caption = message.caption;
      }
      groups.set(sourceId, current);
      if (!current.caption) latestCaptionlessSourceId = sourceId;
    }
    return {
      nextOffset: highest + 1,
      submissions: [...groups.values()]
        .filter((raw) => raw.caption)
        .sort((left, right) => left.updateIds[0]! - right.updateIds[0]!)
        .map((raw) => this.parseSubmission(raw))
    };
  }

  async #download(fileId: string): Promise<Uint8Array> {
    const metadataResponse = await this.#fetch(this.#method('getFile'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({file_id: fileId})
    });
    const metadata = await metadataResponse.json() as {
      ok?: boolean; result?: {file_path?: string}
    };
    const path = metadata.result?.file_path;
    if (!metadataResponse.ok || !metadata.ok || !path) {
      throw new Error('TELEGRAM_GET_FILE_FAILED');
    }
    const fileResponse = await this.#fetch(
      `https://api.telegram.org/file/bot${this.options.token}/${path}`
    );
    if (!fileResponse.ok) {
      throw new Error('TELEGRAM_DOWNLOAD_FILE_FAILED');
    }
    const bytes = new Uint8Array(await fileResponse.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > 20 * 1024 * 1024) {
      throw new Error('TELEGRAM_FILE_SIZE_INVALID');
    }
    return bytes;
  }

  public async materialize(submission: TelegramSubmission, outputRoot: string): Promise<string> {
    const bundleDir = join(outputRoot, submission.manifest.productId);
    const assetsDir = join(bundleDir, 'assets');
    await mkdir(assetsDir, {recursive: true});
    for (const [index, fileId] of submission.fileIds.entries()) {
      const target = join(assetsDir, `telegram-${String(index + 1).padStart(2, '0')}.jpg`);
      await writeFile(target, await this.#download(fileId));
    }
    await writeFile(
      join(bundleDir, 'manifest.json'),
      `${JSON.stringify(submission.manifest, null, 2)}\n`,
      'utf8'
    );
    return bundleDir;
  }
}
