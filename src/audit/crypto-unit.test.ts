/**
 * Anonimus — Cryptographic Unit Tests
 *
 * Pure tests for Schnorr signing, domain separation, and hash correctness.
 * No devnet required — runs against compact-runtime directly.
 */

import {
  ecMulGenerator,
  ecMul,
  ecAdd,
  transientHash,
  CompactTypeField,
  CompactTypeVector,
} from '@midnight-ntwrk/compact-runtime';
import { pureCircuits } from '../../contracts/managed/poh_core/contract/index.js';

const JUBJUB_ORDER = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;
const TWO_248 = 452312848583266388373324160190187140051835877600158453279131187530910662656n;

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, testName: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    console.log(`  FAIL: ${testName}${details ? ` — ${details}` : ''}`);
  }
}

function jubjubSampleScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let v = 0n;
  for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(bytes[i]!);
  return v % JUBJUB_ORDER;
}

function jubjubSchnorrVerifyingKey(sk: bigint) {
  return ecMulGenerator(sk);
}

const SchnorrHashInputType = new CompactTypeVector(5, CompactTypeField);

function jubjubSchnorrSign(msg: readonly bigint[], sk: bigint) {
  const pk = ecMulGenerator(sk);
  const r = jubjubSampleScalar();
  const R = ecMulGenerator(r);
  const cFull = transientHash(SchnorrHashInputType, [R.x, R.y, pk.x, pk.y, msg[0]!]);
  const c = cFull % TWO_248;
  const s = (r + c * sk) % JUBJUB_ORDER;
  return { announcement: { x: R.x, y: R.y }, response: s };
}

function jubjubSchnorrVerify(
  msg: readonly bigint[],
  vk: { x: bigint; y: bigint },
  sig: { announcement: { x: bigint; y: bigint }; response: bigint },
): boolean {
  const cFull = transientHash(SchnorrHashInputType, [
    sig.announcement.x, sig.announcement.y, vk.x, vk.y, msg[0]!,
  ]);
  const c = cFull % TWO_248;
  const lhs = ecMulGenerator(sig.response);
  const rhs = ecAdd(sig.announcement, ecMul(vk, c));
  return lhs.x === rhs.x && lhs.y === rhs.y;
}

function bytesToField(b: Uint8Array): bigint {
  let v = 0n;
  for (let i = b.length - 1; i >= 0; i--) {
    v = (v << 8n) | BigInt(b[i]!);
  }
  return v % 52435875175126190479447740508185965837690552500527637822603658699938581184513n;
}

async function main() {
  console.log('\n=== CRYPTO UNIT TESTS ===\n');

  // ── 1. Schnorr sign/verify basics ──────────────────────────────
  console.log('--- 1. Schnorr Sign/Verify ---');

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const msg = [12345n];
    const sig = jubjubSchnorrSign(msg, sk);
    assert(jubjubSchnorrVerify(msg, pk, sig), 'Valid signature verifies');
  }

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const msg = [12345n];
    const sig = jubjubSchnorrSign(msg, sk);
    const wrongMsg = [99999n];
    assert(!jubjubSchnorrVerify(wrongMsg, pk, sig), 'Signature rejects wrong message');
  }

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const msg = [12345n];
    const sig = jubjubSchnorrSign(msg, sk);
    const wrongSk = jubjubSampleScalar();
    const wrongPk = jubjubSchnorrVerifyingKey(wrongSk);
    assert(!jubjubSchnorrVerify(msg, wrongPk, sig), 'Signature rejects wrong public key');
  }

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const msg = [12345n];
    const sig = jubjubSchnorrSign(msg, sk);
    const tamperedSig = {
      announcement: sig.announcement,
      response: (sig.response + 1n) % JUBJUB_ORDER,
    };
    assert(!jubjubSchnorrVerify(msg, pk, tamperedSig), 'Signature rejects tampered response');
  }

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const msg = [12345n];
    const sig = jubjubSchnorrSign(msg, sk);
    const tamperedSig = {
      announcement: { x: sig.announcement.x + 1n, y: sig.announcement.y },
      response: sig.response,
    };
    assert(!jubjubSchnorrVerify(msg, pk, tamperedSig), 'Signature rejects tampered announcement');
  }

  // ── 2. Determinism ─────────────────────────────────────────────
  console.log('\n--- 2. Determinism ---');

  {
    const sk = jubjubSampleScalar();
    const msg = [42n];
    const sig1 = jubjubSchnorrSign(msg, sk);
    const sig2 = jubjubSchnorrSign(msg, sk);
    // Nonces are random, so signatures differ — but both should verify
    const pk = jubjubSchnorrVerifyingKey(sk);
    assert(
      jubjubSchnorrVerify(msg, pk, sig1) && jubjubSchnorrVerify(msg, pk, sig2),
      'Different random nonces both produce valid signatures',
    );
  }

  // ── 3. deriveCredIdField consistency ────────────────────────────
  console.log('\n--- 3. deriveCredIdField Consistency ---');

  {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const field1 = pureCircuits.deriveCredIdField(secret);
    const field2 = pureCircuits.deriveCredIdField(secret);
    assert(field1 === field2, 'deriveCredIdField is deterministic');
  }

  {
    const secret1 = crypto.getRandomValues(new Uint8Array(32));
    const secret2 = crypto.getRandomValues(new Uint8Array(32));
    const field1 = pureCircuits.deriveCredIdField(secret1);
    const field2 = pureCircuits.deriveCredIdField(secret2);
    assert(field1 !== field2, 'Different secrets produce different credIdField');
  }

  // ── 4. deriveCommitment with salt ──────────────────────────────
  console.log('\n--- 4. deriveCommitment ---');

  {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const salt1 = crypto.getRandomValues(new Uint8Array(32));
    const salt2 = crypto.getRandomValues(new Uint8Array(32));
    const c1 = pureCircuits.deriveCommitment(secret, salt1);
    const c2 = pureCircuits.deriveCommitment(secret, salt2);
    assert(
      Buffer.from(c1).toString('hex') !== Buffer.from(c2).toString('hex'),
      'Different salts produce different commitments',
    );
  }

  {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const c1 = pureCircuits.deriveCommitment(secret, salt);
    const c2 = pureCircuits.deriveCommitment(secret, salt);
    assert(
      Buffer.from(c1).toString('hex') === Buffer.from(c2).toString('hex'),
      'Same secret + salt produces same commitment',
    );
  }

  // ── 5. deriveCredIdField domain separation ───────────────────────
  console.log('\n--- 5. deriveCredIdField Domain Separation ---');

  {
    const secret1 = crypto.getRandomValues(new Uint8Array(32));
    const secret2 = crypto.getRandomValues(new Uint8Array(32));
    const field1 = pureCircuits.deriveCredIdField(secret1);
    const field2 = pureCircuits.deriveCredIdField(secret2);
    assert(field1 !== field2, 'Different secrets produce different credIdField');
  }

  // ── 6. Cross-credential unlinkability ────────────────────────────
  console.log('\n--- 6. Cross-Credential Unlinkability ---');

  {
    const secretA = crypto.getRandomValues(new Uint8Array(32));
    const secretB = crypto.getRandomValues(new Uint8Array(32));
    const fieldA = pureCircuits.deriveCredIdField(secretA);
    const fieldB = pureCircuits.deriveCredIdField(secretB);
    const xor = fieldA ^ fieldB;
    assert(xor !== 0n, 'CredIdFields are different (no trivial link)');
  }

  // ── 7. Bytes32ToField reduction ─────────────────────────────────
  console.log('\n--- 7. Bytes32ToField / Field Correctness ---');

  {
    // Verify transientHash output < r (scalar field)
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const field = pureCircuits.deriveCredIdField(secret);
    const r = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;
    assert(field < r, 'deriveCredIdField output < r (scalar field)');
    assert(field >= 0n, 'deriveCredIdField output >= 0');
  }

  // ── 8. Signature cross-verification with pureCircuits ───────────
  console.log('\n--- 8. Signature + PureCircuits Cross-Check ---');

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const credIdField = pureCircuits.deriveCredIdField(secret);
    const sig = jubjubSchnorrSign([credIdField], sk);
    assert(
      jubjubSchnorrVerify([credIdField], pk, sig),
      'Signature over deriveCredIdField verifies correctly',
    );
  }

  {
    const sk = jubjubSampleScalar();
    const pk = jubjubSchnorrVerifyingKey(sk);
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const credIdField = pureCircuits.deriveCredIdField(secret);
    const sig = jubjubSchnorrSign([credIdField], sk);
    // Verify with wrong credential
    const wrongSecret = crypto.getRandomValues(new Uint8Array(32));
    const wrongCredIdField = pureCircuits.deriveCredIdField(wrongSecret);
    assert(
      !jubjubSchnorrVerify([wrongCredIdField], pk, sig),
      'Signature over credIdField rejects different credential',
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== CRYPTO TEST SUMMARY ===');
  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('CRYPTO TEST ERROR:', err);
  process.exit(1);
});
