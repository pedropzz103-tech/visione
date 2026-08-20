import {createHash} from 'node:crypto';
import type {ProductManifest} from '../contracts/index.js';
import {canonicalJson} from './canonical-json.js';

export {canonicalJson} from './canonical-json.js';

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createContentHash(manifest: ProductManifest): string {
  return sha256Hex(canonicalJson(manifest));
}

export function createVideoId(input: {
  productId: string;
  contentHash: string;
  templateVersion: string;
  rendererVersion: string;
}): string {
  return 'vid_' + sha256Hex(canonicalJson(input)).slice(0, 20);
}

export function createPublicationKey(input: {
  channel: string;
  videoId: string;
  contentHash: string;
}): string {
  return sha256Hex(
    input.channel + ':' + input.videoId + ':' + input.contentHash
  );
}
