import {readFile, stat} from 'node:fs/promises';
import {basename} from 'node:path';
import type {RunSummary} from '../contracts/index.js';
import {formatTelegramReport} from './format-report.js';

export type TelegramReporterOptions = {
  token: string;
  chatId: string;
  fetchFn?: typeof fetch;
};

export class TelegramReporter {
  readonly #fetch: typeof fetch;

  public constructor(private readonly options: TelegramReporterOptions) {
    this.#fetch = options.fetchFn ?? fetch;
  }

  #method(name: string): string {
    return `https://api.telegram.org/bot${this.options.token}/${name}`;
  }

  async #requireOk(response: Response, code: string): Promise<void> {
    let payload: {ok?: boolean};
    try {
      payload = await response.json() as {ok?: boolean};
    } catch {
      throw new Error(code);
    }
    if (!response.ok || payload.ok !== true) {
      throw new Error(code);
    }
  }

  public async sendVideo(path: string, caption: string): Promise<void> {
    const file = await stat(path);
    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      throw new Error('TELEGRAM_VIDEO_SIZE_INVALID');
    }
    const form = new FormData();
    form.set('chat_id', this.options.chatId);
    form.set('caption', caption.slice(0, 1024));
    form.set('supports_streaming', 'true');
    form.set('video', new File([await readFile(path)], basename(path), {type: 'video/mp4'}));
    await this.#requireOk(await this.#fetch(this.#method('sendVideo'), {
      method: 'POST', body: form
    }), 'TELEGRAM_SEND_VIDEO_FAILED');
  }

  public async sendSummary(summary: RunSummary): Promise<void> {
    await this.#requireOk(await this.#fetch(this.#method('sendMessage'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: this.options.chatId,
        text: formatTelegramReport(summary),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    }), 'TELEGRAM_SEND_MESSAGE_FAILED');
  }
}
