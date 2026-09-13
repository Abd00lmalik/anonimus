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
import { ShieldedWallet, V9_NATIVE_FORK_VERSION } from '@midnight-ntwrk/wallet-sdk/shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk/dust';
import { createKeystore, PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk/unshielded';
import { type EnvironmentConfiguration, WalletSeeds } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
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
}

export async function getChainTipHeight(indexerHttpUrl: string): Promise<number | undefined> {
  try {
    const res = await fetch(indexerHttpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { block { height } }' }),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { data?: { block?: { height?: number } | null } };
    const height = json.data?.block?.height;
    return typeof height === 'number' && height > 0 ? height : undefined;
  } catch {
    return undefined;
  }
}

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
  const keystore = createKeystore({ kind: 'schnorr', secret: seeds.unshielded } as any, networkId);
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded) as any;
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust) as any;
  const unshieldedPublicKey = PublicKey.fromKeyStore(keystore);

  const config = {
    networkId,
    forks: { v9: V9_NATIVE_FORK_VERSION },
    indexerClientConnection: { indexerHttpUrl: env.indexer, indexerWsUrl: env.indexerWS },
    provingServerUrl: new URL(env.proofServer),
    relayURL: new URL(env.nodeWS),
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
    costParameters: { additionalFeeOverhead: 1_000n, feeBlocksMargin: 5 },
  };

  const dustConfig = {
    ...config,
    costParameters: {
      ledgerParams: LedgerParameters.initialParameters(),
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    },
  };

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

  const Shielded = ShieldedWallet(config);
  const shielded = seededSnaps?.shielded
    ? Shielded.restore(seededSnaps.shielded)
    : Shielded.startWithSeed(seeds.shielded);

  const unshielded = seededSnaps?.unshielded
    ? UnshieldedWallet(config).restore(seededSnaps.unshielded)
    : UnshieldedWallet(config).startWithPublicKey(unshieldedPublicKey);

  const Dust = DustWallet(dustConfig);
  const dust = seededSnaps?.dust
    ? Dust.restore(seededSnaps.dust)
    : Dust.startWithSeed(seeds.dust, LedgerParameters.initialParameters().dust);

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
  };
}
