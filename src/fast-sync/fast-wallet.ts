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
import { type DustWalletOptions, type EnvironmentConfiguration, WalletSeeds } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
import type { WalletSecret } from '../wallet.js';
import { dedupingDustBuilder, dedupingShieldedBuilder } from './dedup.js';
import { isSeedable, preSeedNewWallet } from './preseed.js';
import { loadReferenceBundle } from './reference-bundle.js';

const DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

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
  const keystore = createKeystore(seeds.unshielded as any, networkId);
  const zswapSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded) as any;
  const dustSecretKey = DustSecretKey.fromSeed(seeds.dust) as any;
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
      ledgerParams: DUST_OPTIONS.ledgerParams,
      additionalFeeOverhead: DUST_OPTIONS.additionalFeeOverhead,
      feeBlocksMargin: DUST_OPTIONS.feeBlocksMargin,
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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const shieldedBuilder = dedupingShieldedBuilder() as any;
  const shielded = seededSnaps?.shielded
    ? CustomShieldedWallet(config, shieldedBuilder).restore(seededSnaps.shielded)
    : CustomShieldedWallet(config, shieldedBuilder).startWithSecretKeys(zswapSecretKeys);

  const unshieldedCfg = {
    ...config,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
  } as any;
  const unshielded = seededSnaps?.unshielded
    ? UnshieldedWallet(unshieldedCfg).restore(seededSnaps.unshielded)
    : UnshieldedWallet(unshieldedCfg).startWithPublicKey(unshieldedPublicKey);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const dustBuilder = dedupingDustBuilder() as any;
  const dust = seededSnaps?.dust
    ? CustomDustWallet(dustConfig, dustBuilder).restore(seededSnaps.dust)
    : CustomDustWallet(dustConfig, dustBuilder).startWithSecretKey(
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

  return { facade, zswapSecretKeys, dustSecretKey, keystore, seeded, referenceHeight };
}
