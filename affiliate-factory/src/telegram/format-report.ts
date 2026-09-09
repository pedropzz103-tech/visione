import type {RunSummary} from '../contracts/index.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatTelegramReport(summary: RunSummary): string {
  const lines = [
    '<b>Affiliate Factory</b>',
    `Produto: ${escapeHtml(summary.productName)}`,
    `Render: ${summary.render}`,
    `QA: ${summary.qa}`,
    `R2: ${summary.r2}`,
    `Buffer: ${summary.buffer}`,
    `TikTok: ${escapeHtml(summary.tiktokStatus)}`,
    `X: ${escapeHtml(summary.xStatus)}`,
    `Threads: ${escapeHtml(summary.threadsStatus)}`,
    `Video ID: ${escapeHtml(summary.videoId ?? 'indisponível')}`
  ];
  if (summary.publicUrl) {
    lines.push(`MP4: ${escapeHtml(summary.publicUrl)}`);
  }
  if (summary.errorCode) {
    lines.push(`Erro: ${escapeHtml(summary.errorCode)}`);
  }
  return lines.join('\n').slice(0, 4096);
}
