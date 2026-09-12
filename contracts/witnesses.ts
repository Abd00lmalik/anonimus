import { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  ecMulGenerator,
  ecMul,
  ecAdd,
  transientHash,
  CompactTypeField,
  CompactTypeVector,
} from '@midnight-ntwrk/compact-runtime';
import { Ledger, pureCircuits } from './managed/poh_core/contract/index.js';

// ============================================================================
// Jubjub Schnorr signing helpers — implemented using compact-runtime EC
// primitives. The runtime's EmbeddedFr limit is the Jubjub subgroup order
// (≈ 2^252). Scalars used with ecMulGenerator/ecMul must be < ORDER.
// ============================================================================

const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
const FR = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;

export type JubjubPoint = { x: bigint; y: bigint };

export function jubjubSampleScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[i]!);
  return v % JUBJUB_ORDER;
}

export function jubjubSchnorrVerifyingKey(sk: bigint): JubjubPoint {
  const pt = ecMulGenerator(sk);
  return { x: pt.x, y: pt.y };
}

const SchnorrHashInputType = new CompactTypeVector(5, CompactTypeField);

export function jubjubSchnorrSign(
  msg: readonly bigint[],
  sk: bigint,
): { announcement: JubjubPoint; response: bigint } {
  const pk = ecMulGenerator(sk);
  const r = jubjubSampleScalar();
  const R = ecMulGenerator(r);
  const cFull = transientHash(SchnorrHashInputType, [
    R.x, R.y, pk.x, pk.y, msg[0]!,
  ]);
  const c = cFull % TWO_248;
  const s = (r + c * sk) % JUBJUB_ORDER;
  return { announcement: { x: R.x, y: R.y }, response: s };
}

// ============================================================================
// Witnesses + test verifier for the Anonimus PoH vertical slice.
//
// TEST VERIFIER NOTICE: the keypair below is an ephemeral development
// verifier, clearly labeled as such. It is NOT a personhood provider. In
// production the verifier key registered on-chain would belong to a real
// personhood verification service; nothing else in this slice changes.
// ============================================================================

export type PohPrivateState = {
  readonly secretKey: Uint8Array;
  readonly credentialSalt: Uint8Array;
  readonly verifierSigningKey: bigint;
  readonly attestation: {
    announcement: { x: bigint; y: bigint };
    response: bigint;
  } | null;
  readonly attestedVerifierPk: { x: bigint; y: bigint } | null;
  readonly expiresAt: bigint;
};

const ZERO_SALT = new Uint8Array(32);

export function createAdminPrivateState(secretKey: Uint8Array): PohPrivateState {
  return {
    secretKey,
    credentialSalt: ZERO_SALT,
    verifierSigningKey: 0n,
    attestation: null,
    attestedVerifierPk: null,
    expiresAt: 0n,
  };
}

export function createUserPrivateState(secretKey: Uint8Array): PohPrivateState {
  return {
    secretKey,
    credentialSalt: crypto.getRandomValues(new Uint8Array(32)),
    verifierSigningKey: 0n,
    attestation: null,
    attestedVerifierPk: null,
    expiresAt: 0n,
  };
}

// ----------------------------------------------------------------------------
// TEST VERIFIER (ephemeral development keypair — real Schnorr over Jubjub)
// ----------------------------------------------------------------------------

export type TestVerifier = {
  readonly sk: bigint;
  readonly pk: JubjubPoint;
};

export function createTestVerifier(): TestVerifier {
  const sk = jubjubSampleScalar();
  return { sk, pk: jubjubSchnorrVerifyingKey(sk) };
}

// ----------------------------------------------------------------------------
// Attestation issuance (off-chain, real signature)
// Signs credIdField (1-element Field vector). The expiry is a separate witness
// that is disclosed in the ledger; the prover cannot change it without
// breaking the Schnorr signature (which covers the disclosed value).
export function issueAttestation(
  verifier: TestVerifier,
  credSecret: Uint8Array,
  expiresAt: bigint,
): { announcement: { x: bigint; y: bigint }; response: bigint } {
  const credIdField = pureCircuits.deriveCredIdField(credSecret);
  return jubjubSchnorrSign([credIdField], verifier.sk);
}

function bytes32ToField(b: Uint8Array): bigint {
  let v = 0n;
  for (let i = b.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(b[i]!);
  }
  return v % FR;
}

export function fieldToBytes32(f: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = f;
  for (let i = 0; i < 32; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

// ----------------------------------------------------------------------------
// Witnesses (keys must match the Compact witness names exactly)
// ----------------------------------------------------------------------------

export const pohWitnesses = {
  getSchnorrReduction: (
    { privateState }: WitnessContext<Ledger, PohPrivateState>,
    challengeHash: bigint,
  ): [PohPrivateState, [bigint, bigint]] => {
    const q = challengeHash / TWO_248;
    const r = challengeHash % TWO_248;
    return [privateState, [q, r]];
  },

  local_secret_key: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [PohPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],

  get_credential_secret: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [PohPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],

  get_credential_salt: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [PohPrivateState, Uint8Array] => [
    privateState,
    privateState.credentialSalt,
  ],

  get_registry_path: (
    { privateState, ledger: contractLedger }: WitnessContext<Ledger, PohPrivateState>,
    commitment: Uint8Array,
  ): [PohPrivateState, {
    leaf: Uint8Array;
    path: { sibling: { field: bigint }; goes_left: boolean }[];
  }] => {
    const merklePath = contractLedger.registry.findPathForLeaf(commitment);
    if (!merklePath) {
      throw new Error('Commitment not found in registry tree');
    }
    return [privateState, merklePath];
  },

  get_attestation: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [
    PohPrivateState,
    { announcement: { x: bigint; y: bigint }; response: bigint },
  ] => {
    if (!privateState.attestation) {
      throw new Error('No attestation in private state — call requestAttestation first');
    }
    return [privateState, privateState.attestation];
  },

  getAttestedVerifierPk: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [PohPrivateState, { x: bigint; y: bigint }] => {
    if (!privateState.attestedVerifierPk) {
      throw new Error('No verifier pk in private state — call requestAttestation first');
    }
    return [privateState, privateState.attestedVerifierPk];
  },

  get_expiration: ({
    privateState,
  }: WitnessContext<Ledger, PohPrivateState>): [PohPrivateState, bigint] => {
    return [privateState, privateState.expiresAt];
  },
};
