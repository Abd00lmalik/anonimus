import {
  ecMulGenerator,
  ecMul,
  ecAdd,
  transientHash,
  CompactTypeField,
  CompactTypeVector,
} from '@midnight-ntwrk/compact-runtime';
import { pureCircuits } from '../contracts/managed/poh_core/contract/index.js';
import type { CircuitContext } from '@midnight-ntwrk/compact-runtime';

// ============================================================================
// Jubjub Schnorr helpers — implemented via compact-runtime EC primitives.
// ============================================================================

const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;
const FR = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;

export type JubjubPoint = { x: bigint; y: bigint };

const SchnorrHashInputType = new CompactTypeVector(5, CompactTypeField);

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

export function jubjubSchnorrVerify(
  msg: readonly bigint[],
  vk: JubjubPoint,
  sig: { announcement: JubjubPoint; response: bigint },
): boolean {
  const cFull = transientHash(SchnorrHashInputType, [
    sig.announcement.x, sig.announcement.y, vk.x, vk.y, msg[0]!,
  ]);
  const c = cFull % TWO_248;
  const lhs = ecMulGenerator(sig.response);
  const rhs = ecAdd(sig.announcement, ecMul(vk, c));
  return lhs.x === rhs.x && lhs.y === rhs.y;
}

// ============================================================================
// TEST VERIFIER — clearly labeled ephemeral development trust anchor.
//
// This is NOT a personhood provider. It holds a real Jubjub Schnorr keypair
// and issues real signatures, exercising the exact cryptographic path a
// production personhood service would use. It performs NO biometric checks;
// in production this role is filled by a real verifier that only signs after
// completing its own real-world personhood verification.
// ============================================================================

export type TestVerifier = {
  readonly sk: bigint;
  readonly pk: JubjubPoint;
  readonly label: 'ephemeral-test-verifier';
};

export function createTestVerifier(): TestVerifier {
  const sk = jubjubSampleScalar();
  return {
    sk,
    pk: jubjubSchnorrVerifyingKey(sk),
    label: 'ephemeral-test-verifier',
  };
}

export type Attestation = {
  announcement: { x: bigint; y: bigint };
  response: bigint;
};

// Issue an attestation binding credSecret to this verifier's key.
// Uses deriveCredIdField (transientHash → Field) to match the circuit.
// Signs [credIdField] (1-element). Expiry is a separate disclosed witness.
export function issueAttestation(
  verifier: TestVerifier,
  credSecret: Uint8Array,
  expiresAt: bigint,
): Attestation {
  const credIdField = pureCircuits.deriveCredIdField(credSecret);
  const sig = jubjubSchnorrSign([credIdField], verifier.sk);
  return {
    announcement: { x: sig.announcement.x, y: sig.announcement.y },
    response: sig.response,
  };
}

// Off-chain sanity check mirroring the circuit's verification logic.
export function verifyAttestationOffChain(
  vk: JubjubPoint,
  credSecret: Uint8Array,
  att: Attestation,
): boolean {
  const credIdField = pureCircuits.deriveCredIdField(credSecret);
  return jubjubSchnorrVerify([credIdField], vk, att);
}

// Derive the credential id through the contract's own pure circuit.
export function deriveCredId(credSecret: Uint8Array): Uint8Array {
  const ctx = {} as CircuitContext<null>;
  return pureCircuits.deriveCredId(credSecret);
}

// Bytes<32> <-> Field: little-endian field-aligned encoding.
export function bytes32ToField(b: Uint8Array): bigint {
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
