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

export type WalletSecret =
  | { kind: 'seed'; value: string }
  | { kind: 'mnemonic'; value: string };

const DUST_OPTIONS: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  readonly wallet: WalletFacade;
  readonly unshieldedKeystore: UnshieldedKeystore;

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

    logger.info(`Wallet built from ${secret.kind}; master seed: ${seeds.masterSeed.slice(0, 8)}...`);

    return new MidnightWalletProvider(
      logger,
      wallet,
      shieldedSecretKeys,
      dustSecretKey,
      keystore,
    );
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
): Promise<FacadeState> {
  logger.info('Syncing wallet (waiting for all sub-wallets to catch up)...');
  let emissionCount = 0;
  let lastProgressTime = Date.now();
  let lastDustApplied = 0n;

  return Rx.firstValueFrom(
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
}
