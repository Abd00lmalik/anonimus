import {
  type CoinPublicKey,
  DustSecretKey,
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
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';
import type { Logger } from 'pino';
import { assembleWallet, type FastSyncOptions } from './fast-sync/fast-wallet.js';

export type WalletSecret =
  | { kind: 'seed'; value: string }
  | { kind: 'mnemonic'; value: string };

export class MidnightWalletProvider implements MidnightProvider, WalletProvider {
  readonly wallet: WalletFacade;
  readonly unshieldedKeystore: UnshieldedKeystore;

  private constructor(
    private readonly logger: Logger,
    wallet: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
    unshieldedKeystore: UnshieldedKeystore,
    private readonly walletSeeds: { shielded: Uint8Array; dust: Uint8Array },
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
    await (this.wallet as any).start({
      shielded: this.walletSeeds.shielded,
      dust: this.walletSeeds.dust,
    });
  }

  async stop(): Promise<void> {
    return this.wallet.stop();
  }

  static async build(
    logger: Logger,
    env: EnvironmentConfiguration,
    secret: WalletSecret,
    opts?: { fastSync?: FastSyncOptions },
  ): Promise<MidnightWalletProvider> {
    const { facade, zswapSecretKeys, dustSecretKey, keystore, seeded, referenceHeight, walletSeeds } =
      await assembleWallet(logger, env, secret, opts?.fastSync);

    const syncInfo = seeded.length > 0
      ? ` (fast-sync: seeded [${seeded.join(', ')}] from height ${referenceHeight})`
      : '';
    logger.info(`Wallet built from ${secret.kind}${syncInfo}`);

    return new MidnightWalletProvider(
      logger,
      facade,
      zswapSecretKeys,
      dustSecretKey,
      keystore,
      walletSeeds,
    );
  }
}

function isProgressStrictlyComplete(progress: unknown): boolean {
  if (!progress || typeof progress !== 'object') {
    return false;
  }
  const candidate = progress as { isStrictlyComplete?: unknown };
  if (typeof candidate.isStrictlyComplete !== 'function') {
    return false;
  }
  return (candidate.isStrictlyComplete as () => boolean)();
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
      }),
      Rx.filter((state: FacadeState) => {
        const sh = (state as any).shielded?.state?.progress;
        const un = (state as any).unshielded?.progress;
        const dust = (state as any).dust?.state?.progress;
        return (
          isProgressStrictlyComplete(sh) &&
          isProgressStrictlyComplete(dust) &&
          isProgressStrictlyComplete(un)
        );
      }),
      Rx.tap(() => logger.info(`Wallet sync complete after ${emissionCount} emissions`)),
    ),
  );
}
