// Deduping builders for the shielded and dust wallets.
//
// Originally a client-side workaround for an off-by-one in the V1-era (ledger-v8)
// sync pipelines, ported from moth-wallet's packages/core/src/sync/sdk-dedup.ts.
// The V1 SDK's default applyUpdate early-skips only when the LAST event in a batch
// is already applied, so a re-sent boundary event (subscription reconnect / keepalive
// race) could slip through to the WASM zswap tree and fail a restore catch-up with:
//
//   Error: values inserted non-linearly into zswap commitment tree;
//          expected to insert index N+1, but received N.
//
// The canary (V2 / ledger-v9) SDK handles boundary-event dedup natively — its
// sync capability filters `u.id > appliedIndex` before replay (see Sync.js
// applyUpdate) — so the V1 wrapper is intentionally NOT applied here. These
// builders return the plain V2 defaults, and exist to keep the wall-sdk
// construction sites version-agnostic.

import { V2Builder as ShieldedV2Builder } from '@midnight-ntwrk/wallet-sdk/shielded/v2';
import { V2Builder as DustV2Builder } from '@midnight-ntwrk/wallet-sdk/dust/v2';

export function dedupingShieldedBuilder(): unknown {
  return new ShieldedV2Builder().withDefaults();
}

export function dedupingDustBuilder(): unknown {
  return new DustV2Builder().withDefaults();
}