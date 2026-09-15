import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  type UnshieldedKeystore,
  WalletEntrySchema,
  WalletFacade,
} from '@midnight-ntwrk/wallet-sdk';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk/shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk/dust';
import { createKeystore, PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk/unshielded';
import { type EnvironmentConfiguration, WalletSeeds } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { WalletSecret } from '../wallet.js';
import { isSeedable, preSeedNewWallet } from './preseed.js';
import { loadReferenceBundle } from './reference-bundle.js';

export interface FastSyncOptions {
  referenceRoot: string;
  birthday?: number;
}

export interface AssembledWallet {
  facade: WalletFacade;
  zswapSecretKeys: any;
  dustSecretKey: any;
  keystore: UnshieldedKeystore;
  seeded: string[];
  referenceHeight: number | null;
  walletSeeds: { shielded: Uint8Array; dust: Uint8Array };
  /** Raw sub-wallet instances for serialization (saveWalletState) */
  subWallets: { shielded: any; dust: any; unshielded: any };
}

const SAVED_STATE_DIR = process.env['WALLET_STATE_DIR'] ?? '/opt/anonimus/wallet-state';
const SAVED_STATE_MANIFEST = join(SAVED_STATE_DIR, 'manifest.json');

export interface SavedWalletState {
  shielded: string;
  dust: string;
  unshielded: string;
  height: number;
  savedAt: string;
}

export function getChainTipHeight(indexerHttpUrl: string): Promise<number | undefined> {
  return fetch(indexerHttpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'query { block { height } }' }),
  })
    .then((res) => (res.ok ? res.json() : undefined))
    .then((json: any) => {
      const height = json?.data?.block?.height;
      return typeof height === 'number' && height > 0 ? height : undefined;
    })
    .catch(() => undefined);
}

// ── Save / Load wallet state ───────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function compress(data: string): Buffer {
  return gzipSync(Buffer.from(data, 'utf-8'));
}

function decompress(buf: Buffer): string {
  return gunzipSync(buf).toString('utf-8');
}

function saveSubWallet(dir: string, name: string, serialized: string): void {
  ensureDir(dir);
  const buf = compress(serialized);
  const tmpPath = join(dir, `${name}.tmp`);
  const finalPath = join(dir, `${name}.gz`);
  writeFileSync(tmpPath, buf);
  // Atomic rename
  renameSync(tmpPath, finalPath);
}

/**
 * Save all three sub-wallet serialized states as gzipped files.
 * Called after sync completes so future restarts can use restore() instead of startWithSeed().
 */
export async function saveWalletState(
  shielded: any,
  dust: any,
  unshielded: any,
  height: number,
  logger?: Logger,
): Promise<void> {
  ensureDir(SAVED_STATE_DIR);

  logger?.info(`[FastSync] Serializing wallet state at height ${height}...`);
  const [shSerialized, duSerialized, unSerialized] = await Promise.all([
    shielded.serializeState(),
    dust.serializeState(),
    unshielded.serializeState(),
  ]);

  saveSubWallet(SAVED_STATE_DIR, 'shielded', shSerialized);
  saveSubWallet(SAVED_STATE_DIR, 'dust', duSerialized);
  saveSubWallet(SAVED_STATE_DIR, 'unshielded', unSerialized);

  const manifest: SavedWalletState = {
    shielded: `${shSerialized.length} chars`,
    dust: `${duSerialized.length} chars`,
    unshielded: `${unSerialized.length} chars`,
    height,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(SAVED_STATE_MANIFEST, JSON.stringify(manifest, null, 2));

  logger?.info(`[FastSync] Wallet state saved at height ${height} to ${SAVED_STATE_DIR}`);
}

/**
 * Load a previously saved sub-wallet state from gzipped file.
 * Returns null if file doesn't exist.
 */
function loadSubWallet(dir: string, name: string): string | null {
  const path = join(dir, `${name}.gz`);
  if (!existsSync(path)) return null;
  return decompress(readFileSync(path));
}

export function hasSavedState(): boolean {
  return existsSync(SAVED_STATE_MANIFEST);
}

/**
 * Load all three saved sub-wallet states.
 * Returns null if any file is missing.
 */
export function loadSavedState(logger?: Logger): SavedWalletState | null {
  if (!existsSync(SAVED_STATE_MANIFEST)) return null;

  const shielded = loadSubWallet(SAVED_STATE_DIR, 'shielded');
  const dust = loadSubWallet(SAVED_STATE_DIR, 'dust');
  const unshielded = loadSubWallet(SAVED_STATE_DIR, 'unshielded');

  if (!shielded || !dust || !unshielded) {
    logger?.warn('[FastSync] Incomplete saved state — missing files');
    return null;
  }

  const manifest: SavedWalletState = JSON.parse(readFileSync(SAVED_STATE_MANIFEST, 'utf-8'));
  manifest.shielded = shielded;
  manifest.dust = dust;
  manifest.unshielded = unshielded;

  logger?.info(`[FastSync] Loaded saved state from height ${manifest.height}`);
  return manifest;
}

// ── Main wallet assembly ───────────────────────────────────────────────

export async function assembleWallet(
  logger: Logger,
  env: EnvironmentConfiguration,
  secret: WalletSecret,
  fastSync?: FastSyncOptions,
): Promise<AssembledWallet> {
  const networkId = env.walletNetworkId;
  setNetworkId(networkId);

  const seeds = secret.kind === 'mnemonic'
    ? WalletSeeds.fromMnemonic(secret.value)
    : WalletSeeds.fromMasterSeed(secret.value);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const keystore = createKeystore({ kind: 'schnorr' as const, secret: new Uint8Array(seeds.unshielded) }, networkId);
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded) as any;
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust) as any;
  const unshieldedPublicKey = PublicKey.fromKeyStore(keystore);

  const config = {
    networkId,
    forks: { v9: 0n as bigint },
    indexerClientConnection: { indexerHttpUrl: env.indexer, indexerWsUrl: env.indexerWS },
    provingServerUrl: new URL(env.proofServer),
    relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { additionalFeeOverhead: 1_000n, feeBlocksMargin: 5 },
  };

  const dustConfig = {
    ...config,
    costParameters: {
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    },
  };

  // ── Path A: Restore from saved state (fast, ~2 min catch-up) ────────
  const saved = loadSavedState(logger);
  if (saved) {
    logger.info('[FastSync] Restoring from saved wallet state...');
    const shielded = await ShieldedWallet(config).restore(saved.shielded);
    const unshielded = await UnshieldedWallet(config).restore(saved.unshielded);
    const dust = await DustWallet(dustConfig).restore(saved.dust);

    const facade = await WalletFacade.init({
      configuration: config,
      shielded: () => shielded,
      unshielded: () => unshielded,
      dust: () => dust,
    });

    logger.info(`[FastSync] Restored from saved state at height ${saved.height} — sub-wallets will catch up from there.`);
    return {
      facade,
      zswapSecretKeys,
      dustSecretKey,
      keystore,
      seeded: ['shielded', 'dust', 'unshielded'],
      referenceHeight: saved.height,
      walletSeeds: { shielded: seeds.shielded, dust: seeds.dust },
      subWallets: { shielded, dust, unshielded },
    };
  }

  // ── Path B: Preseed from reference bundle (medium, ~2 min) ──────────
  let seededSnaps: ReturnType<typeof preSeedNewWallet> = null;
  let referenceHeight: number | null = null;

  if (fastSync) {
    const reference = loadReferenceBundle(fastSync.referenceRoot, networkId);
    const birthday = fastSync.birthday ?? (await getChainTipHeight(env.indexer));
    if (reference && isSeedable(reference, birthday)) {
      seededSnaps = preSeedNewWallet(
        { shieldedSecretKeys: zswapSecretKeys, unshieldedPublicKey, dustSecretKey },
        networkId,
        reference,
      );
      if (seededSnaps) referenceHeight = reference.height;
    } else if (reference) {
      logger.info(
        birthday === undefined
          ? 'Fast-sync: no chain tip to compare against — syncing from genesis'
          : `Fast-sync: reference (height ${reference.height}) is newer than birthday ${birthday} — syncing from genesis`,
      );
    } else {
      logger.info(`Fast-sync: no reference bundle for '${networkId}' — syncing from genesis`);
    }
  }

  // ── Path C: Start from genesis (slow, ~2-3 hrs) ─────────────────────
  const Shielded = ShieldedWallet(config);
  const shielded = seededSnaps?.shielded
    ? await Shielded.restore(seededSnaps.shielded)
    : await Shielded.startWithSeed(seeds.shielded);

  const unshielded = seededSnaps?.unshielded
    ? await UnshieldedWallet(config).restore(seededSnaps.unshielded)
    : await UnshieldedWallet(config).startWithPublicKey(unshieldedPublicKey);

  const Dust = DustWallet(dustConfig);
  const dust = seededSnaps?.dust
    ? await Dust.restore(seededSnaps.dust)
    : await Dust.startWithSeed(seeds.dust, LedgerParameters.initialParameters().dust);

  const facade = await WalletFacade.init({
    configuration: config,
    shielded: () => shielded,
    unshielded: () => unshielded,
    dust: () => dust,
  });

  const seeded: string[] = [];
  if (seededSnaps?.shielded) seeded.push('shielded');
  if (seededSnaps?.unshielded) seeded.push('unshielded');
  if (seededSnaps?.dust) seeded.push('dust');
  if (seeded.length > 0) {
    logger.info(`Fast-sync: seeded [${seeded.join(', ')}] from reference at height ${referenceHeight} — sub-wallets start near tip.`);
  }

  return {
    facade,
    zswapSecretKeys,
    dustSecretKey,
    keystore,
    seeded,
    referenceHeight,
    walletSeeds: { shielded: seeds.shielded, dust: seeds.dust },
    subWallets: { shielded, dust, unshielded },
  };
}
