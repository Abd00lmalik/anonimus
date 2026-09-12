import crypto from 'node:crypto';

// ============================================================================
// VerificationReceipt — the DApp-facing integration primitive.
//
// A VerificationReceipt is a signed claim by the PoH service that a specific
// nullifier was observed on-chain for a given scope. The DApp can:
//   1. Verify the receipt signature (authenticity).
//   2. Check the scope matches what it requested (scope binding).
//   3. Optionally verify the nullifier exists on-chain (independent check).
//
// Trust model:
//   - The DApp trusts the PoH service's signing key.
//   - The PoH service only signs after observing a successful on-chain
//     verifyPersonhood transaction.
//   - The nullifier is unique per (credential, scope) — prevents reuse.
//   - Session binding: each request has a unique sessionId; the server
//     only signs receipts for sessions it created.
// ============================================================================

export type VerificationReceipt = {
  /** The nullifier (hex-encoded 32 bytes). Unique per (credential, scope). */
  readonly nullifier: string;
  /** The scope/campaign this verification applies to. */
  readonly scope: string;
  /** Server-created session ID for this verification request. */
  readonly sessionId: string;
  /** ISO 8601 timestamp of when the receipt was issued. */
  readonly issuedAt: string;
  /** Expiry in ISO 8601 (policy-bound, not cryptographically enforced). */
  readonly expiresAt: string;
  /** Ed25519 signature over the receipt fields. */
  readonly signature: string;
};

export type ReceiptSigningKey = {
  /** Node.js KeyObject for the public key. */
  readonly publicKey: crypto.KeyObject;
  /** Node.js KeyObject for the private key. */
  readonly privateKey: crypto.KeyObject;
  /** Hex-encoded public key (for display/comparison). */
  readonly publicKeyHex: string;
};

/**
 * Generate an Ed25519 keypair for receipt signing.
 */
export function generateSigningKeyPair(): ReceiptSigningKey {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubRaw = publicKey.export({ type: 'spki', format: 'der' });
  // Ed25519 SPKI DER: last 32 bytes are the raw public key
  const pubHex = pubRaw.subarray(-32).toString('hex');
  return { publicKey, privateKey, publicKeyHex: pubHex };
}

/**
 * Compute the canonical payload bytes that get signed.
 * All fields are encoded as length-prefixed UTF-8 strings to avoid
 * ambiguity in serialization.
 */
function receiptPayload(r: Omit<VerificationReceipt, 'signature'>): Buffer {
  const fields = [r.nullifier, r.scope, r.sessionId, r.issuedAt, r.expiresAt];
  const parts: Buffer[] = [];
  for (const f of fields) {
    const bytes = Buffer.from(f, 'utf-8');
    // 4-byte big-endian length prefix
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(bytes.length);
    parts.push(lenBuf);
    parts.push(bytes);
  }
  return Buffer.concat(parts);
}

/**
 * Create a signed VerificationReceipt.
 *
 * @param nullifier - hex-encoded 32-byte nullifier from on-chain verification
 * @param scope - the campaign/scope identifier
 * @param sessionId - server-generated unique session ID
 * @param signingKey - the PoH service's Ed25519 signing key
 * @param ttlMs - time-to-live in milliseconds (default: 1 hour)
 */
export function createReceipt(
  nullifier: string,
  scope: string,
  sessionId: string,
  signingKey: ReceiptSigningKey,
  ttlMs: number = 3_600_000,
): VerificationReceipt {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const keyObject = signingKey.privateKey;

  const partial = { nullifier, scope, sessionId, issuedAt, expiresAt };
  const payload = receiptPayload(partial);
  const sig = crypto.sign(null, payload, keyObject);

  return {
    ...partial,
    signature: sig.toString('hex'),
  };
}

/**
 * Verify a VerificationReceipt against a trusted public key.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function verifyReceipt(
  receipt: VerificationReceipt,
  trustedPublicKey: crypto.KeyObject,
): { valid: true } | { valid: false; reason: string } {
  // Check expiry (policy-bound advisory check)
  if (new Date(receipt.expiresAt) < new Date()) {
    return { valid: false, reason: 'Receipt expired' };
  }

  // Reconstruct the payload
  const { signature, ...partial } = receipt;
  const payload = receiptPayload(partial);

  // Verify signature
  const keyObject = trustedPublicKey;

  const valid = crypto.verify(null, payload, keyObject, Buffer.from(signature, 'hex'));

  if (!valid) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true };
}

/**
 * Validate nullifier format (hex-encoded 32 bytes).
 */
export function isValidNullifierFormat(nullifier: string): boolean {
  return /^[0-9a-f]{64}$/i.test(nullifier);
}
