import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

export interface EmptyRefStates {
  shielded: string;
  unshielded: string;
  dust: string;
  height: number;
}

interface BundleManifest {
  network: string;
  height: number;
  parts: Record<string, { bytes: number; gzipBytes: number }>;
}

const PARTS = ['shielded', 'unshielded', 'dust'] as const;

function snapshotOffset(raw: string): bigint {
  try {
    const parsed = JSON.parse(raw) as { offset?: string | number };
    return parsed.offset === undefined ? 0n : BigInt(parsed.offset);
  } catch {
    return 0n;
  }
}

export function loadReferenceBundle(referenceRoot: string, networkId: string): EmptyRefStates | null {
  const dir = join(referenceRoot, networkId);
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  let manifest: BundleManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BundleManifest;
  } catch {
    return null;
  }
  if (manifest.network !== networkId) return null;
  if (!Number.isFinite(manifest.height) || manifest.height <= 0) return null;

  const states: Partial<Record<(typeof PARTS)[number], string>> = {};
  for (const part of PARTS) {
    const file = join(dir, `${part}.dat.gz`);
    if (!existsSync(file)) return null;
    try {
      states[part] = gunzipSync(readFileSync(file)).toString('utf8');
    } catch {
      return null;
    }
  }

  const shielded = states.shielded;
  const unshielded = states.unshielded;
  const dust = states.dust;
  if (!shielded || !unshielded || !dust) return null;

  if (snapshotOffset(dust) <= 0n || snapshotOffset(shielded) <= 0n) return null;

  return { shielded, unshielded, dust, height: manifest.height };
}
