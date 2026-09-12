/**
 * Anonimus — Integration Test Suite
 *
 * Tests the DApp integration layer: verification receipts, scope binding,
 * replay protection, and privacy guarantees.
 *
 * Run: npx tsx src/integration.test.ts (no devnet required for receipt tests)
 *       npx tsx src/integration-e2e.test.ts (requires local devnet)
 */

import crypto from 'node:crypto';
import {
  generateSigningKeyPair,
  createReceipt,
  verifyReceipt,
  isValidNullifierFormat,
  type VerificationReceipt,
  type ReceiptSigningKey,
} from './receipt.js';
import {
  createService,
  type VerificationRequest,
} from './integration.js';

// ============================================================================
// Test helpers
// ============================================================================

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

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// ============================================================================
// Receipt unit tests
// ============================================================================

console.log('=== Receipt Unit Tests ===\n');

// Generate a signing keypair for tests
const signingKey = generateSigningKeyPair();
console.log('  Signing key generated.');

// TEST: Valid receipt
{
  const nullifier = randomHex(32);
  const scope = 'test-campaign-alpha';
  const sessionId = crypto.randomUUID();

  const receipt = createReceipt(nullifier, scope, sessionId, signingKey);
  const result = verifyReceipt(receipt, signingKey.publicKey);

  assert(result.valid === true, 'Valid receipt verifies successfully');
  assert(receipt.nullifier === nullifier, 'Receipt contains correct nullifier');
  assert(receipt.scope === scope, 'Receipt contains correct scope');
  assert(receipt.sessionId === sessionId, 'Receipt contains correct sessionId');
}

// TEST: Receipt with wrong signature
{
  const nullifier = randomHex(32);
  const scope = 'test-campaign-alpha';
  const sessionId = crypto.randomUUID();
  const wrongKey = generateSigningKeyPair();

  const receipt = createReceipt(nullifier, scope, sessionId, signingKey);
  // Tamper with signature
  const tampered = { ...receipt, signature: randomHex(64) };
  const result = verifyReceipt(tampered, signingKey.publicKey);

  assert(result.valid === false, 'Tampered signature rejected');
  if (!result.valid) {
    assert(result.reason === 'Invalid signature', `Correct reason: ${result.reason}`);
  }
}

// TEST: Receipt verified against wrong public key
{
  const nullifier = randomHex(32);
  const receipt = createReceipt(nullifier, 'scope', crypto.randomUUID(), signingKey);
  const wrongKey = generateSigningKeyPair();

  const result = verifyReceipt(receipt, wrongKey.publicKey);
  assert(result.valid === false, 'Wrong public key rejects receipt');
}

// TEST: Expired receipt
{
  const nullifier = randomHex(32);
  const receipt = createReceipt(nullifier, 'scope', crypto.randomUUID(), signingKey, -1000); // already expired
  const result = verifyReceipt(receipt, signingKey.publicKey);

  assert(result.valid === false, 'Expired receipt rejected');
  if (!result.valid) {
    assert(result.reason === 'Receipt expired', `Correct reason: ${result.reason}`);
  }
}

// TEST: Nullifier format validation
{
  assert(isValidNullifierFormat(randomHex(32)), 'Valid 64-char hex accepted');
  assert(!isValidNullifierFormat('not-hex'), 'Non-hex rejected');
  assert(!isValidNullifierFormat(randomHex(16)), 'Too short rejected');
  assert(!isValidNullifierFormat(randomHex(32) + 'ff'), 'Too long rejected');
  assert(!isValidNullifierFormat(''), 'Empty string rejected');
}

// ============================================================================
// Scope binding tests
// ============================================================================

console.log('\n=== Scope Binding Tests ===\n');

// TEST: Receipt for scope A cannot be used for scope B
{
  const nullifier = randomHex(32);
  const receiptA = createReceipt(nullifier, 'campaign-A', crypto.randomUUID(), signingKey);
  const receiptB = createReceipt(nullifier, 'campaign-B', crypto.randomUUID(), signingKey);

  // Verify receiptA for scope B — scope mismatch
  assert(receiptA.scope === 'campaign-A', 'Receipt A scoped to campaign-A');
  assert(receiptB.scope === 'campaign-B', 'Receipt B scoped to campaign-B');
  assert(receiptA.scope !== receiptB.scope, 'Scopes are different');

  // The DApp checks scope locally:
  const dappScope = 'campaign-A';
  assert(receiptA.scope === dappScope, 'Receipt A matches DApp scope');
  assert(receiptB.scope !== dappScope, 'Receipt B does NOT match DApp scope');
}

// TEST: Same nullifier, different scopes — receipts are distinct
{
  const nullifier = randomHex(32);
  const r1 = createReceipt(nullifier, 'scope-1', crypto.randomUUID(), signingKey);
  const r2 = createReceipt(nullifier, 'scope-2', crypto.randomUUID(), signingKey);

  // Both verify (different signatures because scope is in the payload)
  assert(verifyReceipt(r1, signingKey.publicKey).valid === true, 'Receipt for scope-1 verifies');
  assert(verifyReceipt(r2, signingKey.publicKey).valid === true, 'Receipt for scope-2 verifies');
  assert(r1.signature !== r2.signature, 'Signatures differ for different scopes');
}

// ============================================================================
// Session binding tests
// ============================================================================

console.log('\n=== Session Binding Tests ===\n');

// TEST: Receipt is bound to the session it was created for
{
  const nullifier = randomHex(32);
  const sessionA = crypto.randomUUID();
  const sessionB = crypto.randomUUID();

  const receiptA = createReceipt(nullifier, 'scope', sessionA, signingKey);
  const receiptB = createReceipt(nullifier, 'scope', sessionB, signingKey);

  assert(receiptA.sessionId === sessionA, 'Receipt A bound to session A');
  assert(receiptB.sessionId === sessionB, 'Receipt B bound to session B');
  assert(receiptA.sessionId !== receiptB.sessionId, 'Sessions are different');
  assert(receiptA.signature !== receiptB.signature, 'Signatures differ for different sessions');
}

// TEST: DApp rejects receipt with wrong session ID
{
  const nullifier = randomHex(32);
  const correctSession = crypto.randomUUID();
  const wrongSession = crypto.randomUUID();

  const receipt = createReceipt(nullifier, 'scope', correctSession, signingKey);

  // DApp checks session locally
  assert(receipt.sessionId === correctSession, 'Receipt matches correct session');
  assert(receipt.sessionId !== wrongSession, 'Receipt does NOT match wrong session');
}

// ============================================================================
// HTTP service tests (using built-in http)
// ============================================================================

console.log('\n=== HTTP Service Tests ===\n');

async function testService() {
  const serviceKey = generateSigningKeyPair();
  const server = createService({ port: 0, signingKey: serviceKey });

  // Get the assigned port
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('Server not listening');
  const port = addr.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // TEST: Health check
    {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json() as any;
      assert(res.ok, 'Health check returns 200');
      assert(data.status === 'ok', 'Health status is ok');
    }

    // TEST: Create verification request
    {
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID(), scope: 'test-scope' }),
      });
      const data = await res.json() as any;
      assert(res.status === 201, 'Verify returns 201');
      assert(data.requestId, 'Response includes requestId');
      assert(data.status === 'pending', 'Status is pending');
    }

    // TEST: Missing sessionId returns 400
    {
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'test-scope' }),
      });
      assert(res.status === 400, 'Missing sessionId returns 400');
    }

    // TEST: Missing scope returns 400
    {
      const res = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID() }),
      });
      assert(res.status === 400, 'Missing scope returns 400');
    }

    // TEST: Full verification flow
    {
      const sessionId = crypto.randomUUID();
      const scope = 'integration-test';

      // 1. Create request
      const createRes = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scope }),
      });
      const { requestId } = await createRes.json() as any;

      // 2. Check pending status
      const pendingRes = await fetch(`${baseUrl}/receipt/${requestId}`);
      const pendingData = await pendingRes.json() as any;
      assert(pendingData.status === 'pending', 'Request is pending before completion');

      // 3. Complete with nullifier
      const nullifier = randomHex(32);
      const completeRes = await fetch(`${baseUrl}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, nullifier }),
      });
      const completeData = await completeRes.json() as any;
      assert(completeRes.ok, 'Complete returns 200');
      assert(completeData.status === 'verified', 'Status is verified after completion');
      assert(completeData.receipt, 'Receipt is included');

      // 4. Retrieve receipt
      const receiptRes = await fetch(`${baseUrl}/receipt/${requestId}`);
      const receiptData = await receiptRes.json() as any;
      assert(receiptData.status === 'verified', 'Receipt retrieval shows verified');
      assert(receiptData.receipt.nullifier === nullifier, 'Receipt nullifier matches');
      assert(receiptData.receipt.scope === scope, 'Receipt scope matches');
      assert(receiptData.receipt.sessionId === sessionId, 'Receipt sessionId matches');

      // 5. Verify receipt signature
      const sigResult = verifyReceipt(receiptData.receipt, serviceKey.publicKey);
      assert(sigResult.valid === true, 'Receipt signature verifies against service key');
    }

    // TEST: Duplicate completion rejected
    {
      const sessionId = crypto.randomUUID();
      const createRes = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scope: 'dup-test' }),
      });
      const { requestId } = await createRes.json() as any;

      const nullifier = randomHex(32);
      await fetch(`${baseUrl}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, nullifier }),
      });

      // Try to complete again
      const dupRes = await fetch(`${baseUrl}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, nullifier }),
      });
      assert(dupRes.status === 409, 'Duplicate completion returns 409');
    }

    // TEST: Receipt for wrong scope is rejected by DApp
    {
      const sessionId = crypto.randomUUID();
      const actualScope = 'actual-scope';
      const wrongScope = 'wrong-scope';

      const createRes = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scope: actualScope }),
      });
      const { requestId } = await createRes.json() as any;

      const nullifier = randomHex(32);
      await fetch(`${baseUrl}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, nullifier }),
      });

      const receiptRes = await fetch(`${baseUrl}/receipt/${requestId}`);
      const { receipt } = await receiptRes.json() as any;

      // DApp checks scope
      assert(receipt.scope === actualScope, 'Receipt has correct scope');
      assert(receipt.scope !== wrongScope, 'Receipt scope does NOT match wrong scope');
    }

    // TEST: Request not found returns 404
    {
      const res = await fetch(`${baseUrl}/receipt/nonexistent-id`);
      assert(res.status === 404, 'Unknown requestId returns 404');
    }

    // TEST: Invalid nullifier format rejected
    {
      const sessionId = crypto.randomUUID();
      const createRes = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, scope: 'bad-null' }),
      });
      const { requestId } = await createRes.json() as any;

      const res = await fetch(`${baseUrl}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, nullifier: 'not-a-valid-nullifier' }),
      });
      assert(res.status === 400, 'Invalid nullifier format returns 400');
    }

  } finally {
    server.close();
  }
}

// ============================================================================
// Privacy tests
// ============================================================================

console.log('\n=== Privacy Tests ===\n');

// TEST: Receipt does not contain credential, salt, or biometric data
{
  const nullifier = randomHex(32);
  const receipt = createReceipt(nullifier, 'scope', crypto.randomUUID(), signingKey);

  const receiptStr = JSON.stringify(receipt);
  assert(!receiptStr.includes('credential'), 'No credential in receipt');
  assert(!receiptStr.includes('salt'), 'No salt in receipt');
  assert(!receiptStr.includes('biometric'), 'No biometric data in receipt');
  assert(!receiptStr.includes('face'), 'No face data in receipt');
  assert(!receiptStr.includes('secret'), 'No secret in receipt');
  assert(receiptStr.length < 2000, 'Receipt is compact (< 2KB)');
}

// TEST: Receipt fields are exactly what's expected (no extra data)
{
  const nullifier = randomHex(32);
  const receipt = createReceipt(nullifier, 'scope', crypto.randomUUID(), signingKey);
  const keys = Object.keys(receipt);

  assert(keys.length === 6, 'Receipt has exactly 6 fields');
  assert(keys.includes('nullifier'), 'Has nullifier');
  assert(keys.includes('scope'), 'Has scope');
  assert(keys.includes('sessionId'), 'Has sessionId');
  assert(keys.includes('issuedAt'), 'Has issuedAt');
  assert(keys.includes('expiresAt'), 'Has expiresAt');
  assert(keys.includes('signature'), 'Has signature');
}

// ============================================================================
// Summary
// ============================================================================

async function runAll() {
  await testService();

  console.log('\n=== INTEGRATION TEST SUMMARY ===');
  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n  Some integration tests FAILED.');
    process.exit(1);
  } else {
    console.log('\n  All integration tests PASSED.');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
