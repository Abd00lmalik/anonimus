import {
  type CoinPublicKey,
  DustSecretKey,
  LedgerParameters,
  type EncPublicKey,
  type FinalizedTransaction,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  MidnightProvider,
  UnboundTransaction,
  WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import type { WalletFacade, FacadeState, UnshieldedKeystore } from '@midnight-ntwrk/wallet-sdk';
import {
  type DustWalletOptions,
  type EnvironmentConfiguration,
  FluentWalletBuilder,
} from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';
import type { Logger } from 'pino';
import fs from 'node:fs';
import path from 'node:path';

export type WalletSecret =
  | { kind: 'seed'; value: string }
  | { kind: 'mnemonic'; value: string };

const DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

// ── Wallet State Persistence ──

const STATE_DIR = process.env['WALLET_STATE_DIR'] || path.resolve(process.cwd(), 'wallet-state');

function getStateFilePath(kind: string): string {
  return path.join(STATE_DIR, `${kind}.state`);
}

export async function saveWalletState(logger: Logger, wallet: WalletFacade, seeds?: { shielded: Uint8Array; dust: Uint8Array; unshielded: Uint8Array }): Promise<void> {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    const [shieldedState, unshieldedState, dustState] = await Promise.all([
      wallet.shielded.serializeState(),
      wallet.unshielded.serializeState(),
      wallet.dust.serializeState(),
    ]);
    fs.writeFileSync(getStateFilePath('shielded'), shieldedState, 'utf-8');
    fs.writeFileSync(getStateFilePath('unshielded'), unshieldedState, 'utf-8');
    fs.writeFileSync(getStateFilePath('dust'), dustState, 'utf-8');
    if (seeds) {
      fs.writeFileSync(getStateFilePath('seeds'), JSON.stringify({
        shielded: Buffer.from(seeds.shielded).toString('hex'),
        dust: Buffer.from(seeds.dust).toString('hex'),
        unshielded: Buffer.from(seeds.unshielded).toString('hex'),
      }), 'utf-8');
    }
    logger.info('[WalletState] Saved wallet state to disk.');
  } catch (err: unknown) {
    logger.warn(`[WalletState] Failed to save wallet state: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function loadSavedState(logger: Logger): { shielded: string; unshielded: string; dust: string; seeds?: { shielded: string; dust: string; unshielded: string } } | undefined {
  try {
    const files = ['shielded', 'unshielded', 'dust'];
    const missing = files.filter(f => !fs.existsSync(getStateFilePath(f)));
    if (missing.length > 0) {
      logger.info(`[WalletState] No saved state (missing: ${missing.join(', ')}).`);
      return undefined;
    }
    const state = {
      shielded: fs.readFileSync(getStateFilePath('shielded'), 'utf-8'),
      unshielded: fs.readFileSync(getStateFilePath('unshielded'), 'utf-8'),
      dust: fs.readFileSync(getStateFilePath('dust'), 'utf-8'),
    };
    const seedsPath = getStateFilePath('seeds');
    if (fs.existsSync(seedsPath)) {
      (state as any).seeds = JSON.parse(fs.readFileSync(seedsPath, 'utf-8'));
      logger.info('[WalletState] Found saved wallet state with seeds.');
    } else {
      logger.info('[WalletState] Found saved wallet state (no seeds file).');
    }
    return state;
  } catch {
    return undefined;
  }
}

function clearSavedState(logger: Logger): void {
  try {
    for (const f of ['shielded', 'unshielded', 'dust', 'seeds']) {
      const fp = getStateFilePath(f);
      if (fs.existsSync(fp)) fs.rmSync(fp);
    }
    logger.info('[WalletState] Cleared saved state.');
  } catch {
    // ignore
  }
}

export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  readonly wallet: WalletFacade;
  readonly unshieldedKeystore: UnshieldedKeystore;
  _savedSeeds?: { shielded: Uint8Array; dust: Uint8Array; unshielded: Uint8Array };

  private constructor(
    private readonly logger: Logger,
    wallet: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
    unshieldedKeystore: UnshieldedKeystore,
  ) {
    this.wallet = wallet;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(
    tx: UnboundTransaction,
    ttl: Date = ttlOneHour(),
  ): Promise<FinalizedTransaction> {
    const recipe = await (this.wallet as any).balanceUnboundTransaction(
      tx as any,
      {
        shieldedSecretKeys: this.zswapSecretKeys as any,
        dustSecretKey: this.dustSecretKey as any,
      },
      { ttl },
    );
    return await this.wallet.finalizeRecipe(recipe) as any;
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx as any);
  }

  async start(): Promise<void> {
    this.logger.info('Starting wallet...');
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  async stop(): Promise<void> {
    return this.wallet.stop();
  }

  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    secret: WalletSecret,
  ): Promise<MidnightWalletProvider> {
    const savedState = loadSavedState(logger);

    if (savedState) {
      logger.info('[Wallet] Attempting restore from saved state...');

      const { ShieldedWallet } = await import('@midnight-ntwrk/wallet-sdk-shielded');
      const { UnshieldedWallet, createKeystore, PublicKey } = await import('@midnight-ntwrk/wallet-sdk-unshielded-wallet');
      const { DustWallet } = await import('@midnight-ntwrk/wallet-sdk-dust-wallet');
      const { WalletFacade, InMemoryTransactionHistoryStorage, WalletEntrySchema, mergeWalletEntries } = await import('@midnight-ntwrk/wallet-sdk-facade');

      let seed: Uint8Array;
      let dustSeed: Uint8Array;
      let unshieldedSeed: Uint8Array;

      if (savedState.seeds) {
        seed = Uint8Array.from(Buffer.from(savedState.seeds.shielded, 'hex'));
        dustSeed = Uint8Array.from(Buffer.from(savedState.seeds.dust, 'hex'));
        unshieldedSeed = Uint8Array.from(Buffer.from(savedState.seeds.unshielded, 'hex'));
        logger.info('[Wallet] Using saved seeds for restore.');
      } else {
        const testkit = await import('@midnight-ntwrk/testkit-js');
        seed = testkit.getShieldedSeed(secret.value);
        dustSeed = testkit.getDustSeed(secret.value);
        unshieldedSeed = testkit.getUnshieldedSeed(secret.value);
        logger.info('[Wallet] Derived seeds from mnemonic for restore.');
      }

      const shieldedSecretKeys = ZswapSecretKeys.fromSeed(seed);
      const dustSecretKey = DustSecretKey.fromSeed(dustSeed);
      const unshieldedKeystore = createKeystore(unshieldedSeed, env.networkId);

      const shieldedConfig = {
        indexerClientConnection: { indexerHttpUrl: env.indexer },
        networkId: env.networkId,
        txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
      };
      const unshieldedConfig = {
        indexerClientConnection: { indexerWsUrl: env.indexerWS, indexerHttpUrl: env.indexer },
        networkId: env.networkId,
        txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
      };
      const dustConfig = {
        indexerClientConnection: { indexerHttpUrl: env.indexer },
        networkId: env.networkId,
        txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
      };

      const wallet = await WalletFacade.init({
        configuration: {
          networkId: env.networkId,
          nodeClientConnection: { nodeRpcUrl: env.node },
          indexerClientConnection: { indexerHttpUrl: env.indexer },
          txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema, mergeWalletEntries),
        } as any,
        shielded: (config: any) => ShieldedWallet({ ...shieldedConfig, ...config }).restore(savedState.shielded),
        unshielded: (config: any) => UnshieldedWallet({ ...unshieldedConfig, ...config }).restore(savedState.unshielded),
        dust: (config: any) => DustWallet({ ...dustConfig, ...config }).restore(savedState.dust),
      });

      logger.info('[Wallet] Restored from saved state. Starting...');
      await wallet.start(shieldedSecretKeys, dustSecretKey);

      return new MidnightWalletProvider(logger, wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore);
    }

    logger.info('[Wallet] No saved state. Building fresh...');
    const base = FluentWalletBuilder.forEnvironment(env).withDustOptions(DUST_OPTIONS);
    const builder = secret.kind === 'mnemonic'
      ? base.withMnemonic(secret.value)
      : base.withSeed(secret.value);

    const buildResult = await builder.buildWithoutStarting();
    const { wallet, seeds, keystore } = buildResult as {
      wallet: WalletFacade;
      seeds: { masterSeed: string; shielded: Uint8Array; dust: Uint8Array };
      keystore: UnshieldedKeystore;
    };

    const shieldedSecretKeys = ZswapSecretKeys.fromSeed(seeds.shielded);
    const dustSecretKey = DustSecretKey.fromSeed(seeds.dust);

    let unshieldedSeedForSave: Uint8Array | undefined;
    if (secret.kind === 'mnemonic') {
      const testkit = await import('@midnight-ntwrk/testkit-js');
      unshieldedSeedForSave = testkit.getUnshieldedSeed(secret.value);
    }

    logger.info(`Wallet built from ${secret.kind}; master seed: ${seeds.masterSeed.slice(0, 8)}...`);

    const provider = new MidnightWalletProvider(
      logger,
      wallet,
      shieldedSecretKeys,
      dustSecretKey,
      keystore,
    );
    provider._savedSeeds = {
      shielded: seeds.shielded,
      dust: seeds.dust,
      unshielded: unshieldedSeedForSave ?? new Uint8Array(0),
    };
    return provider;
  }
}

function isProgressStrictlyComplete(progress: unknown): boolean {
  if (!progress || typeof progress !== 'object') {
    return false;
  }
  const candidate = progress as { isStrictlyComplete?: unknown };
  if (typeof candidate.isStrictlyComplete === 'function') {
    return (candidate.isStrictlyComplete as () => boolean)();
  }
  const p = progress as {
    appliedIndex?: bigint; highestRelevantWalletIndex?: bigint;
    appliedId?: bigint; highestTransactionId?: bigint;
  };
  const applied = p.appliedIndex ?? p.appliedId;
  const target = p.highestRelevantWalletIndex ?? p.highestTransactionId;
  if (applied !== undefined && target !== undefined) {
    return applied >= target;
  }
  return false;
}

function formatProgress(progress: unknown): string {
  const complete = isProgressStrictlyComplete(progress);
  if (!progress || typeof progress !== 'object') return `${complete}`;
  const p = progress as {
    appliedIndex?: bigint; highestRelevantWalletIndex?: bigint;
    appliedId?: bigint; highestTransactionId?: bigint;
  };
  const applied = p.appliedIndex ?? p.appliedId;
  const target = p.highestRelevantWalletIndex ?? p.highestTransactionId;
  if (applied === undefined || target === undefined) return `${complete}`;
  return `${complete} (${applied}/${target})`;
}

export async function syncWallet(
  logger: Logger,
  wallet: WalletFacade,
  timeout = 600_000,
  seeds?: { shielded: Uint8Array; dust: Uint8Array; unshielded: Uint8Array },
): Promise<FacadeState> {
  logger.info('Syncing wallet (waiting for all sub-wallets to catch up)...');
  let emissionCount = 0;
  let lastProgressTime = Date.now();
  let lastDustApplied = 0n;

  const result = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state: FacadeState) => {
        emissionCount++;
        if (emissionCount % 100 === 0) {
          logger.info(
            `Wallet sync [${emissionCount}]: ` +
              `shielded=${formatProgress((state as any).shielded?.state?.progress)}, ` +
              `unshielded=${formatProgress((state as any).unshielded?.progress)}, ` +
              `dust=${formatProgress((state as any).dust?.state?.progress)}`,
          );
        }
        const dustP = (state as any).dust?.state?.progress;
        const dustApplied = dustP?.appliedIndex ?? dustP?.appliedId ?? 0n;
        if (dustApplied !== lastDustApplied) {
          lastDustApplied = dustApplied;
          lastProgressTime = Date.now();
        }
      }),
      Rx.filter((state: FacadeState) => {
        const sh = (state as any).shielded?.state?.progress;
        const un = (state as any).unshielded?.progress;
        const dust = (state as any).dust?.state?.progress;
        const allComplete =
          isProgressStrictlyComplete(sh) &&
          isProgressStrictlyComplete(dust) &&
          isProgressStrictlyComplete(un);
        if (allComplete) return true;

        const shDone = isProgressStrictlyComplete(sh);
        const unDone = isProgressStrictlyComplete(un);
        const dustDone = isProgressStrictlyComplete(dust);

        if (shDone && unDone) {
          if (dustDone) return true;

          const stallMs = Date.now() - lastProgressTime;
          const STALL_THRESHOLD_MS = 5 * 60 * 1000;
          if (stallMs > STALL_THRESHOLD_MS) {
            logger.warn(`Sync stall detected (${Math.round(stallMs / 1000)}s no dust progress). Proceeding with current state.`);
            return true;
          }

          if (emissionCount > 500) {
            const dustApplied = Number(dust?.appliedIndex ?? 0n);
            const dustTotal = Number(dust?.length ?? 0n);
            logger.warn(`Dust sync slow (${dustApplied}/${dustTotal} after ${emissionCount} emissions). Proceeding — dust will continue in background.`);
            return true;
          }
        }

        return false;
      }),
      Rx.tap(() => logger.info(`Wallet sync complete after ${emissionCount} emissions (shielded + unshielded done; dust may continue in background)`)),
    ),
  );

  await saveWalletState(logger, wallet, seeds);
  return result;
}
