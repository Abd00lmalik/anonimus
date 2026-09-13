import {
  CoreWallet as ShieldedCoreWallet,
  Sync as ShieldedSync,
  V1Builder as ShieldedV1Builder,
} from '@midnight-ntwrk/wallet-sdk/shielded/v1';
import {
  CoreWallet as DustCoreWallet,
  SyncService as DustSyncService,
  V1Builder as DustV1Builder,
} from '@midnight-ntwrk/wallet-sdk/dust/v1';

type Updateish<T = unknown> = {
  readonly id: number | bigint | string;
  readonly maxId: number | bigint | string;
  readonly protocolVersion?: number | bigint;
} & T;

type WrappedUpdate<U> = {
  readonly updates: ReadonlyArray<U>;
  readonly [key: string]: unknown;
};

type ApplyUpdateFn<S, U> = (
  state: S,
  wrappedUpdate: WrappedUpdate<U>,
) => readonly [S, { changes: unknown[]; protocolVersion: number }];

interface Capability<S, U> {
  applyUpdate: ApplyUpdateFn<S, U>;
}

function partitionByAppliedIndex<U extends Updateish>(
  updates: ReadonlyArray<U>,
  appliedIndex: bigint,
): { fresh: ReadonlyArray<U>; droppedCount: number } {
  const fresh: U[] = [];
  for (const u of updates) {
    if (BigInt(u.id) > appliedIndex) fresh.push(u);
  }
  return { fresh, droppedCount: updates.length - fresh.length };
}

function makeDedupingApplyUpdate<
  S extends { progress: { appliedIndex: bigint; [k: string]: unknown }; protocolVersion: number | bigint },
  U extends Updateish,
>(
  base: Capability<S, U>,
  updateProgress: (state: S, patch: { highestRelevantWalletIndex: bigint; isConnected: boolean }) => S,
): ApplyUpdateFn<S, U> {
  return (state, wrapped) => {
    if (wrapped.updates.length === 0) {
      return base.applyUpdate(state, wrapped);
    }
    const { fresh, droppedCount } = partitionByAppliedIndex(wrapped.updates, state.progress.appliedIndex);
    if (droppedCount === 0) return base.applyUpdate(state, wrapped);
    if (fresh.length === 0) {
      const tail = wrapped.updates[wrapped.updates.length - 1]!;
      const highestRelevantWalletIndex = BigInt(tail.maxId);
      return [
        updateProgress(state, { highestRelevantWalletIndex, isConnected: true }),
        { changes: [], protocolVersion: Number(state.protocolVersion) },
      ] as const;
    }
    return base.applyUpdate(state, { ...wrapped, updates: fresh });
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function dedupingShieldedBuilder(): unknown {
  return new ShieldedV1Builder().withDefaults().withSync(
    ShieldedSync.makeEventsSyncService as any,
    ((_config: unknown, _getContext: unknown) => {
      const base = ShieldedSync.makeEventsSyncCapability();
      return {
        applyUpdate: makeDedupingApplyUpdate(
          base as any,
          (state: any, patch: any) => ShieldedCoreWallet.updateProgress(state, patch),
        ),
      };
    }) as any,
  );
}

export function dedupingDustBuilder(): unknown {
  return new DustV1Builder().withDefaults().withSync(
    DustSyncService.makeDefaultSyncService as any,
    ((_config: unknown, _getContext: unknown) => {
      const base = (DustSyncService.makeDefaultSyncCapability as () => unknown)();
      return {
        applyUpdate: makeDedupingApplyUpdate(
          base as any,
          (state: any, patch: any) => DustCoreWallet.updateProgress(state, patch),
        ),
      };
    }) as any,
  );
}
