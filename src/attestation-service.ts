import {
  createTestVerifier,
  issueAttestation,
  type TestVerifier,
  type JubjubPoint,
} from '../contracts/witnesses.js';

// ============================================================================
// Attestation Service — issues Schnorr attestations over credential IDs
//
// TRUST MODEL: This service is the "verifier" in the Anonimus architecture.
// It signs attestations over credential IDs. The verifier key is set once
// during server startup by midnight-service.ts (which also registers the
// same key on-chain). This ensures attestations issued here are verifiable
// by the on-chain contract.
//
// The /api/attest endpoint is LEGACY. The real registration flow uses
// /api/register which handles attestation internally.
// ============================================================================

let verifier: TestVerifier | null = null;

/**
 * Set the verifier keypair. Called once during server startup by
 * midnight-service.ts to ensure the same key is used for both
 * on-chain registration and off-chain attestation issuance.
 */
export function setVerifier(v: TestVerifier): void {
  verifier = v;
  console.log(`[AttestationService] Verifier set. VK: (${v.pk.x.toString(16).slice(0, 12)}...)`);
}

/**
 * Initialize a fallback verifier. Only used if midnight-service hasn't
 * initialized yet. WARNING: attestations from this verifier are NOT
 * registered on-chain and will fail the verifiers.member() check.
 */
export function initializeVerifier(): { publicKey: JubjubPoint } {
  verifier = createTestVerifier();
  console.log(`[AttestationService] Fallback verifier initialized. VK: (${verifier.pk.x.toString(16).slice(0, 12)}...)`);
  return { publicKey: verifier.pk };
}

export function getVerifierPublicKey(): JubjubPoint | null {
  return verifier?.pk ?? null;
}

export interface AttestationRequest {
  commitment: string;   // hex-encoded Bytes<32>
  credId: string;       // hex-encoded Bytes<32>
}

export interface AttestationResponse {
  attestation: {
    announcement: { x: string; y: string };
    response: string;
  };
  verifierVk: JubjubPoint;
  expiresAt: string;    // ISO timestamp
}

export function issueAttestationForUser(
  request: AttestationRequest,
): AttestationResponse {
  if (!verifier) {
    throw new Error('Verifier not initialized — call setVerifier() first');
  }

  // Decode the credId from hex
  const credIdBytes = hexToBytes(request.credId);
  if (credIdBytes.length !== 32) {
    throw new Error(`Invalid credId length: ${credIdBytes.length} (expected 32)`);
  }

  // 30-day expiry
  const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = BigInt(Date.now() + EXPIRY_MS);

  // Issue the Schnorr attestation over the credential ID
  const sig = issueAttestation(verifier, credIdBytes, expiresAt);

  return {
    attestation: {
      announcement: {
        x: sig.announcement.x.toString(),
        y: sig.announcement.y.toString(),
      },
      response: sig.response.toString(),
    },
    verifierVk: verifier.pk,
    expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
  };
}

// ── Helpers ──

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
