// Client-side workaround for an off-by-one in the shielded and dust wallet
// sync pipelines. Ported verbatim from moth-wallet's
// packages/core/src/sync/sdk-dedup.ts (only the package scope changed).
//
// The SDKs' default applyUpdate early-skips only when the LAST event in a batch
// is already applied. When the indexer re-sends a boundary event (subscription
// reconnect, keepalive race) at the head of an otherwise-fresh batch, the
// duplicate slips through to the WASM tree:
//
//   Error: values inserted non-linearly into zswap commitment tree;
//          expected to insert index N+1, but received N.
//
// A restored wallet catching up from a reference cursor streams exactly the
// events most likely to hit this on a reconnect, so the fix matters here even
// more than on a genesis sync. We filter the batch BEFORE replay, dropping any
// event with id <= appliedIndex, and wrap rather than fork via the documented
// V1Builder.withSync extension point.

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

    if (droppedCount === 0) {
      return base.applyUpdate(state, wrapped);
    }

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
  return (new ShieldedV1Builder().withDefaults().withSync(
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
  ) as any).withStartAuxDefaults();
}

export function dedupingDustBuilder(): unknown {
  return (new DustV1Builder().withDefaults().withSync(
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
  ) as any).withStartAuxDefaults();
}
