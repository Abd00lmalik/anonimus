import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/wallet-sdk/ledger/v9';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  type UnshieldedKeystore,
  WalletEntrySchema,
  WalletFacade,
} from '@midnight-ntwrk/wallet-sdk';
import { CustomShieldedWallet } from '@midnight-ntwrk/wallet-sdk/shielded';
import { CustomDustWallet } from '@midnight-ntwrk/wallet-sdk/dust';
import { createKeystore, PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk/unshielded';
import { type EnvironmentConfiguration, WalletSeeds } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import type { WalletSecret } from '../wallet.js';
import { dedupingDustBuilder, dedupingShieldedBuilder } from './dedup.js';
import { isSeedable, preSeedNewWallet } from './preseed.js';
import { loadReferenceBundle } from './reference-bundle.js';

export interface FastSyncOptions {
  referenceRoot: string;
  birthday?: number;
}

export interface AssembledWallet {
  facade: WalletFacade;
  zswapSecretKeys: ZswapSecretKeys;
  dustSecretKey: DustSecretKey;
  keystore: UnshieldedKeystore;
  seeded: string[];
  referenceHeight: number | null;
  /** Raw sub-wallet instances for serialization (saveWalletState) */
  subWallets: { shielded: any; dust: any; unshielded: any };
}

const SAVED_STATE_DIR = '/opt/anonimus/wallet-state';
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

  const tmpShielded = join(SAVED_STATE_DIR, 'shielded.tmp');
  const tmpDust = join(SAVED_STATE_DIR, 'dust.tmp');
  const tmpUnshielded = join(SAVED_STATE_DIR, 'unshielded.tmp');

  writeFileSync(tmpShielded, compress(shSerialized));
  writeFileSync(tmpDust, compress(duSerialized));
  writeFileSync(tmpUnshielded, compress(unSerialized));

  const { renameSync } = await import('node:fs');
  renameSync(tmpShielded, join(SAVED_STATE_DIR, 'shielded.gz'));
  renameSync(tmpDust, join(SAVED_STATE_DIR, 'dust.gz'));
  renameSync(tmpUnshielded, join(SAVED_STATE_DIR, 'unshielded.gz'));

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

function loadSubWallet(dir: string, name: string): string | null {
  const path = join(dir, `${name}.gz`);
  if (!existsSync(path)) return null;
  return decompress(readFileSync(path));
}

export function hasSavedState(): boolean {
  return existsSync(SAVED_STATE_MANIFEST);
}

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

// ── Main wallet assembly (mirrors example-hello-world exactly) ─────────

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
  const keystore = createKeystore(seeds.unshielded as any, networkId);
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust);
  const unshieldedPublicKey = PublicKey.fromKeyStore(keystore);

  const config = {
    indexerClientConnection: { indexerHttpUrl: env.indexer, indexerWsUrl: env.indexerWS },
    provingServerUrl: new URL(env.proofServer),
    networkId,
    relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { feeBlocksMargin: 5 },
  };
  const dustConfig = {
    ...config,
    costParameters: {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    },
  };

  // ── Path A: Restore from saved state ─────────────────────────────────
  const saved = loadSavedState(logger);
  if (saved) {
    logger.info('[FastSync] Restoring from saved wallet state...');
    const shieldedBuilder = dedupingShieldedBuilder() as any;
    const dustBuilder = dedupingDustBuilder() as any;

    const shielded = await CustomShieldedWallet(config, shieldedBuilder).restore(saved.shielded);
    const unshielded = await (UnshieldedWallet as any)({
      ...config,
      forks: { v9: 2_000_000n },
      txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    }).restore(saved.unshielded);
    const dust = await CustomDustWallet(dustConfig, dustBuilder).restore(saved.dust);

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
      subWallets: { shielded, dust, unshielded },
    };
  }

  // ── Path B: Preseed from reference bundle ─────────────────────────────
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

  // ── Path C: Build sub-wallets (restore where seeded, start otherwise) ─
  const shieldedBuilder = dedupingShieldedBuilder() as any;
  const shielded = seededSnaps?.shielded
    ? await CustomShieldedWallet(config, shieldedBuilder).restore(seededSnaps.shielded)
    : await CustomShieldedWallet(config, shieldedBuilder).startWithSecretKeys(zswapSecretKeys);

  const unshieldedCfg = {
    ...config,
    forks: { v9: 2_000_000n },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
  } as any;
  const unshielded = seededSnaps?.unshielded
    ? await (UnshieldedWallet as any)(unshieldedCfg).restore(seededSnaps.unshielded)
    : await (UnshieldedWallet as any)(unshieldedCfg).startWithPublicKey(unshieldedPublicKey);

  const dustBuilder = dedupingDustBuilder() as any;
  const dust = seededSnaps?.dust
    ? await CustomDustWallet(dustConfig, dustBuilder).restore(seededSnaps.dust)
    : await CustomDustWallet(dustConfig, dustBuilder).startWithSecretKey(
        dustSecretKey,
        LedgerParameters.initialParameters().dust,
      );

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

  return { facade, zswapSecretKeys, dustSecretKey, keystore, seeded, referenceHeight, subWallets: { shielded, dust, unshielded } };
}
