import {access, readFile} from 'node:fs/promises';
import {relative, resolve, sep} from 'node:path';
import {
  ProductManifestSchema,
  type ProductManifest
} from '../contracts/index.js';

export class IntakeError extends Error {
  public constructor(
    public readonly code: 'ASSET_MISSING' | 'ASSET_PATH_ESCAPE',
    public readonly asset: string
  ) {
    super(code + ': ' + asset);
    this.name = 'IntakeError';
  }
}

export async function loadManualBundle(bundleDir: string): Promise<ProductManifest> {
  const root = resolve(bundleDir);
  const raw = await readFile(resolve(root, 'manifest.json'), 'utf8');
  const manifest = ProductManifestSchema.parse(JSON.parse(raw));

  for (const asset of manifest.assets) {
    const absolute = resolve(root, asset.file);
    const pathFromRoot = relative(root, absolute);
    if (
      pathFromRoot === '..' ||
      pathFromRoot.startsWith('..' + sep) ||
      resolve(root, pathFromRoot) !== absolute
    ) {
      throw new IntakeError('ASSET_PATH_ESCAPE', asset.file);
    }
    try {
      await access(absolute);
    } catch {
      throw new IntakeError('ASSET_MISSING', asset.file);
    }
  }

  return manifest;
}
