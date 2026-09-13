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
  readonly subWallets: { shielded: any; dust: any; unshielded: any };

  private constructor(
    private readonly logger: Logger,
    wallet: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
    unshieldedKeystore: UnshieldedKeystore,
    subWallets: { shielded: any; dust: any; unshielded: any },
  ) {
    this.wallet = wallet;
    this.unshieldedKeystore = unshieldedKeystore;
    this.subWallets = subWallets;
  }

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey as any;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey as any;
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
    // Official pattern from example-hello-world: pass key objects directly.
    // The facade's start() accepts FacadeStartMaterial = WalletSeeds | FacadeKeysByEpoch.
    // At runtime, passing (ZswapSecretKeys, DustSecretKey) works via the WASM layer.
    await (this.wallet as any).start(this.zswapSecretKeys, this.dustSecretKey);
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
    const { facade, zswapSecretKeys, dustSecretKey, keystore, subWallets } = await assembleWallet(
      logger,
      env,
      secret,
      opts?.fastSync,
    );
    logger.info(`Wallet built from ${secret.kind}${opts?.fastSync ? ' (fast-sync enabled)' : ''}.`);
    return new MidnightWalletProvider(logger, facade, zswapSecretKeys as any, dustSecretKey as any, keystore, subWallets);
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
  timeout = 300_000,
): Promise<FacadeState> {
  logger.info('Syncing wallet...');
  let emissionCount = 0;
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state: FacadeState) => {
        emissionCount++;
        logger.info(
          `Wallet sync [${emissionCount}]: shielded=${formatProgress(state.shielded.state.progress)}, ` +
            `unshielded=${formatProgress(state.unshielded.progress)}, dust=${formatProgress(state.dust.state.progress)}`,
        );
      }),
      Rx.filter(
        (state: FacadeState) =>
          isProgressStrictlyComplete(state.shielded.state.progress) &&
          isProgressStrictlyComplete(state.dust.state.progress) &&
          isProgressStrictlyComplete(state.unshielded.progress),
      ),
      Rx.tap(() => logger.info(`Wallet sync complete after ${emissionCount} emissions`)),
      Rx.timeout({
        each: timeout,
        with: () =>
          Rx.throwError(
            () => new Error(`Wallet sync timeout after ${timeout}ms (${emissionCount} emissions received)`),
          ),
      }),
    ),
  );
}
