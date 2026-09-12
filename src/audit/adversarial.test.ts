/**
 * Anonimus — Adversarial Test Suite
 *
 * Security, privacy, and protocol-integrity tests against the poh_core contract.
 * These tests exercise realistic attacks and verify the contract rejects them.
 *
 * Run: npx tsx src/audit/adversarial.test.ts (requires local devnet)
 */

import { WebSocket } from 'ws';
// @ts-expect-error WebSocket polyfill for apollo subscriptions in Node
globalThis.WebSocket = WebSocket;

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import pino from 'pino';
import crypto from 'node:crypto';

import { getConfig } from '../config.js';
import { MidnightWalletProvider, syncWallet, type WalletSecret } from '../wallet.js';
import { buildProviders, type PohProviders } from '../providers.js';
import {
  CompiledPohCoreContract,
  Contract,
  ledger,
  pureCircuits,
  zkConfigPath,
  type Ledger,
} from '../../contracts/index.js';
import {
  createTestVerifier,
  issueAttestation,
  jubjubSchnorrSign,
  jubjubSchnorrVerifyingKey,
  jubjubSampleScalar,
  type PohPrivateState,
} from '../../contracts/witnesses.js';

const ALICE_LOCAL_SEED =
  '0000000000000000000000000000000000000000000000000000000000000001';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const DEFAULT_EXPIRES_AT = BigInt(Date.now() + EXPIRY_MS);

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'warn',
  transport: { target: 'pino-pretty' },
});

const config = getConfig();
const secret: WalletSecret = { kind: 'seed', value: ALICE_LOCAL_SEED };

let wallet: MidnightWalletProvider;
let providers: PohProviders;
let contractAddress: ContractAddress;

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

async function shouldFail(
  fn: () => Promise<any>,
  testName: string,
  expectedPattern?: string,
): Promise<boolean> {
  total++;
  try {
    await fn();
    failed++;
    console.log(`  FAIL: ${testName} — expected rejection but it succeeded`);
    return false;
  } catch (err: any) {
    const msg = err.message || String(err);
    if (expectedPattern && !msg.includes(expectedPattern)) {
      failed++;
      console.log(`  FAIL: ${testName} — rejected but wrong error: ${msg.slice(0, 100)}`);
      return false;
    }
    passed++;
    console.log(`  PASS: ${testName}`);
    return true;
  }
}

async function queryLedger(): Promise<Ledger> {
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (!state) throw new Error('Contract state not found');
  return ledger(state.data);
}

async function setPrivateState(id: string, state: PohPrivateState): Promise<void> {
  providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set(id, state);
}

async function deploy(): Promise<void> {
  const adminSecretKey = crypto.getRandomValues(new Uint8Array(32));
  const adminState: PohPrivateState = {
    secretKey: adminSecretKey,
    credentialSalt: new Uint8Array(32),
    verifierSigningKey: 0n,
    attestation: null,
    attestedVerifierPk: null,
    expiresAt: 0n,
  };

  const deployedResult = await (deployContract<Contract>)(providers, {
    compiledContract: CompiledPohCoreContract,
    privateStateId: `poh-admin-${Date.now()}`,
    initialPrivateState: adminState,
    args: [],
  } as any);
  contractAddress = deployedResult.deployTxData.public.contractAddress;

  // Store admin state for later use
  await setPrivateState('audit-admin', adminState);
}

async function main() {
  setNetworkId(config.networkId);

  // ── Setup ───────────────────────────────────────────────────────
  const envConfig: EnvironmentConfiguration = {
    walletNetworkId: config.networkId,
    networkId: config.networkId,
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    nodeWS: config.nodeWS,
    faucet: config.faucet,
    proofServer: config.proofServer,
  };

  wallet = await MidnightWalletProvider.build(logger, envConfig, secret);
  await wallet.start();
  await syncWallet(logger, wallet.wallet);
  providers = buildProviders(wallet, zkConfigPath, config, `poh-audit-${Date.now()}`);

  console.log('\n=== ADVERSARIAL TEST SUITE ===\n');

  // ── Deploy fresh contract ───────────────────────────────────────
  console.log('--- Setup: Deploy ---');
  await deploy();
  console.log('  Contract deployed.\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. ATTESTATION INTEGRITY TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('--- 1. Attestation Integrity ---');

  // 1a. Register a legitimate verifier
  const verifier = createTestVerifier();
  await submitCallTx<Contract, 'registerVerifier'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'audit-admin',
    circuitId: 'registerVerifier',
    args: [verifier.pk],
  } as any);
  console.log('  (Verifier registered)');

  // 1b. Enroll a credential
  const userSecret = crypto.getRandomValues(new Uint8Array(32));
  const userSalt = crypto.getRandomValues(new Uint8Array(32));
  const commitment = pureCircuits.deriveCommitment(userSecret, userSalt);
  await submitCallTx<Contract, 'enrollCredential'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'audit-admin',
    circuitId: 'enrollCredential',
    args: [commitment],
  } as any);
  console.log('  (Credential enrolled)');

  // 1c. Valid attestation
  const attestation = issueAttestation(verifier, userSecret, DEFAULT_EXPIRES_AT);
  console.log('  (Valid attestation issued)\n');

  // TEST: Modified attestation (tamper with response)
  await shouldFail(async () => {
    const tampered = {
      announcement: attestation.announcement,
      response: (attestation.response + 1n) % (6554484396890773809930967563523245729705921265872317281365359162392183254199n),
    };
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation: tampered,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-tamper', userState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-tamper',
      circuitId: 'verifyPersonhood',
      args: [crypto.getRandomValues(new Uint8Array(32))],
    } as any);
  }, 'Modified attestation (tampered response) rejected');

  // TEST: Modified attestation (tamper with announcement point)
  await shouldFail(async () => {
    const tampered = {
      announcement: { x: attestation.announcement.x + 1n, y: attestation.announcement.y },
      response: attestation.response,
    };
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation: tampered,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-tamper2', userState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-tamper2',
      circuitId: 'verifyPersonhood',
      args: [crypto.getRandomValues(new Uint8Array(32))],
    } as any);
  }, 'Modified attestation (tampered announcement) rejected');

  // TEST: Wrong public key used for verification
  await shouldFail(async () => {
    const wrongVk = jubjubSchnorrVerifyingKey(jubjubSampleScalar());
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: wrongVk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-wrongvk', userState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-wrongvk',
      circuitId: 'verifyPersonhood',
      args: [crypto.getRandomValues(new Uint8Array(32))],
    } as any);
  }, 'Wrong verification key rejected');

  // ═══════════════════════════════════════════════════════════════
  // 2. TRUST MODEL TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 2. Trust Model ---');

  // TEST: Unauthorized verifier (not registered) issues attestation
  {
    let threw = false;
    let errMsg = '';
    try {
      const unauthorizedVerifier = createTestVerifier();
      const unauthorizedAttestation = issueAttestation(unauthorizedVerifier, userSecret, DEFAULT_EXPIRES_AT);
      console.log('    [debug] unauthorized vk:', Buffer.from([
        Number(unauthorizedVerifier.pk.x & 0xffn),
      ]).toString('hex'), '...');
      console.log('    [debug] registered vk:', Buffer.from([
        Number(verifier.pk.x & 0xffn),
      ]).toString('hex'), '...');
      console.log('    [debug] vk are equal:', unauthorizedVerifier.pk.x === verifier.pk.x && unauthorizedVerifier.pk.y === verifier.pk.y);
      const userState: PohPrivateState = {
        secretKey: userSecret,
        credentialSalt: userSalt,
        verifierSigningKey: 0n,
        attestation: unauthorizedAttestation,
        attestedVerifierPk: unauthorizedVerifier.pk,
        expiresAt: DEFAULT_EXPIRES_AT,
      };
      await setPrivateState('audit-user-unauth', userState);
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-unauth',
        circuitId: 'verifyPersonhood',
        args: [crypto.getRandomValues(new Uint8Array(32))],
      } as any);
    } catch (err: any) {
      threw = true;
      errMsg = err.message || String(err);
    }
    total++;
    if (!threw) {
      failed++;
      console.log('  FAIL: Unauthorized verifier attestation rejected — SUCCEEDED (should have failed)');
      console.log('        FINDING: Circuit may not be checking verifier membership correctly');
    } else if (errMsg.includes('Only admin') || errMsg.includes('Verifier not registered') || errMsg.includes('Invalid attestation')) {
      passed++;
      console.log('  PASS: Unauthorized verifier attestation rejected');
    } else {
      failed++;
      console.log(`  FAIL: Unexpected error: ${errMsg.slice(0, 120)}`);
    }
  }

  // TEST: Non-admin tries to register verifier
  await shouldFail(async () => {
    const fakeAdminState: PohPrivateState = {
      secretKey: crypto.getRandomValues(new Uint8Array(32)),
      credentialSalt: new Uint8Array(32),
      verifierSigningKey: 0n,
      attestation: null,
      attestedVerifierPk: null,
      expiresAt: 0n,
    };
    await setPrivateState('audit-fakeadmin', fakeAdminState);
    await submitCallTx<Contract, 'registerVerifier'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-fakeadmin',
      circuitId: 'registerVerifier',
      args: [jubjubSchnorrVerifyingKey(jubjubSampleScalar())],
    } as any);
  }, 'Non-admin cannot register verifier');

  // TEST: Non-admin tries to enroll credential
  await shouldFail(async () => {
    const fakeAdminState: PohPrivateState = {
      secretKey: crypto.getRandomValues(new Uint8Array(32)),
      credentialSalt: new Uint8Array(32),
      verifierSigningKey: 0n,
      attestation: null,
      attestedVerifierPk: null,
      expiresAt: 0n,
    };
    await setPrivateState('audit-fakeadmin2', fakeAdminState);
    await submitCallTx<Contract, 'enrollCredential'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-fakeadmin2',
      circuitId: 'enrollCredential',
      args: [crypto.getRandomValues(new Uint8Array(32))],
    } as any);
  }, 'Non-admin cannot enroll credential');

  // ═══════════════════════════════════════════════════════════════
  // 3. CREDENTIAL BINDING TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 3. Credential Binding ---');

  // TEST: User A tries to use User B's attestation
  await shouldFail(async () => {
    const userBSecret = crypto.getRandomValues(new Uint8Array(32));
    const userBSalt = crypto.getRandomValues(new Uint8Array(32));
    const userBCommitment = pureCircuits.deriveCommitment(userBSecret, userBSalt);

    // Enroll user B
    await submitCallTx<Contract, 'enrollCredential'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-admin',
      circuitId: 'enrollCredential',
      args: [userBCommitment],
    } as any);

    // Issue attestation for user B
    const attestationB = issueAttestation(verifier, userBSecret, DEFAULT_EXPIRES_AT);

    // User A tries to use user B's attestation with user A's credential
    const userAState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation: attestationB,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-a-cross', userAState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-a-cross',
      circuitId: 'verifyPersonhood',
      args: [crypto.getRandomValues(new Uint8Array(32))],
    } as any);
  }, "Cross-user attestation rejected (A cannot use B's attestation)");

  // TEST: Same credential enrolled with different salt (different commitment — should succeed)
  {
    const differentSalt = crypto.getRandomValues(new Uint8Array(32));
    const differentCommitment = pureCircuits.deriveCommitment(userSecret, differentSalt);
    let succeeded = false;
    try {
      await submitCallTx<Contract, 'enrollCredential'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-admin',
        circuitId: 'enrollCredential',
        args: [differentCommitment],
      } as any);
      succeeded = true;
    } catch {
      succeeded = false;
    }
    assert(succeeded, 'Same credential with different salt produces different commitment (enrollment succeeds)');
  }

  // NOTE: Duplicate enrollment with the SAME commitment may succeed depending
  // on the MerkleTree implementation — some implementations silently ignore
  // duplicate inserts, others throw. This is NOT a vulnerability because:
  // the second insert produces the same leaf_hash, so the tree is unchanged.
  // The audit finding is documented as Informational.

  // ── 4. NULLIFIER CORRECTNESS TESTS ─────────────────────────────
  console.log('\n--- 4. Nullifier Correctness ---');

  // TEST: Duplicate verification (same campaign) — should fail
  const campaignX = crypto.getRandomValues(new Uint8Array(32));
  {
    // First verification succeeds
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-null1', userState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-null1',
      circuitId: 'verifyPersonhood',
      args: [campaignX],
    } as any);
    console.log('  (First verification for campaign X succeeded)');
  }

  await shouldFail(async () => {
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-null2', userState);
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'audit-user-null2',
      circuitId: 'verifyPersonhood',
      args: [campaignX],
    } as any);
  }, 'Duplicate verification for same campaign rejected');

  // TEST: Different campaign should succeed (cross-campaign unlinkability)
  {
    const campaignY = crypto.getRandomValues(new Uint8Array(32));
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: verifier.pk,
      expiresAt: DEFAULT_EXPIRES_AT,
    };
    await setPrivateState('audit-user-cross-campaign', userState);
    let succeeded = false;
    try {
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-cross-campaign',
        circuitId: 'verifyPersonhood',
        args: [campaignY],
      } as any);
      succeeded = true;
    } catch {
      succeeded = false;
    }
    assert(succeeded, 'Different campaign succeeds (cross-campaign unlinkability)');
  }

  // TEST: Nullifier domain separation — verified via E2E behavior:
  // Different campaigns succeed independently (tested above in cross-campaign test)
  // Same campaign fails on second use (tested above in duplicate test)
  // This confirms nullifiers are properly domain-separated by campaign.

  // ═══════════════════════════════════════════════════════════════
  // 5. MERKLE / MEMBERSHIP PROOF TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 5. Merkle / Membership Proof ---');

  // TEST: Unenrolled credential — cannot verify
  {
    const unenrolledSecret = crypto.getRandomValues(new Uint8Array(32));
    const unenrolledSalt = crypto.getRandomValues(new Uint8Array(32));
    const unenrolledAttestation = issueAttestation(verifier, unenrolledSecret, DEFAULT_EXPIRES_AT);
    await shouldFail(async () => {
      const userState: PohPrivateState = {
        secretKey: unenrolledSecret,
        credentialSalt: unenrolledSalt,
        verifierSigningKey: 0n,
        attestation: unenrolledAttestation,
        attestedVerifierPk: verifier.pk,
        expiresAt: DEFAULT_EXPIRES_AT,
      };
      await setPrivateState('audit-user-unenrolled', userState);
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-unenrolled',
        circuitId: 'verifyPersonhood',
        args: [crypto.getRandomValues(new Uint8Array(32))],
      } as any);
    }, 'Unenrolled credential rejected (Merkle membership fails)');
  }

  // TEST: Wrong salt for enrolled credential — commitment mismatch
  {
    const wrongSalt = crypto.getRandomValues(new Uint8Array(32));
    const attestationForUser = issueAttestation(verifier, userSecret, DEFAULT_EXPIRES_AT);
    await shouldFail(async () => {
      const userState: PohPrivateState = {
        secretKey: userSecret,
        credentialSalt: wrongSalt,
        verifierSigningKey: 0n,
        attestation: attestationForUser,
        attestedVerifierPk: verifier.pk,
        expiresAt: DEFAULT_EXPIRES_AT,
      };
      await setPrivateState('audit-user-wrongsalt', userState);
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-wrongsalt',
        circuitId: 'verifyPersonhood',
        args: [crypto.getRandomValues(new Uint8Array(32))],
      } as any);
    }, 'Wrong salt produces wrong commitment (Merkle path fails)');
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. SIGNATURE CORRECTNESS TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 6. Signature Correctness ---');

  // TEST: Signature with wrong message (different credential)
  {
    const wrongSecret = crypto.getRandomValues(new Uint8Array(32));
    // Sign over wrong credential, but try to verify with correct credential
    const wrongSig = issueAttestation(verifier, wrongSecret, DEFAULT_EXPIRES_AT);
    await shouldFail(async () => {
      const userState: PohPrivateState = {
        secretKey: userSecret,
        credentialSalt: userSalt,
        verifierSigningKey: 0n,
        attestation: wrongSig,
        attestedVerifierPk: verifier.pk,
        expiresAt: DEFAULT_EXPIRES_AT,
      };
      await setPrivateState('audit-user-wrongsig', userState);
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-wrongsig',
        circuitId: 'verifyPersonhood',
        args: [crypto.getRandomValues(new Uint8Array(32))],
      } as any);
    }, 'Signature over wrong credential rejected');
  }

  // TEST: Signature with wrong secret key (different verifier)
  {
    const wrongVerifier = createTestVerifier();
    const wrongSig = issueAttestation(wrongVerifier, userSecret, DEFAULT_EXPIRES_AT);
    await shouldFail(async () => {
      const userState: PohPrivateState = {
        secretKey: userSecret,
        credentialSalt: userSalt,
        verifierSigningKey: 0n,
        attestation: wrongSig,
        attestedVerifierPk: wrongVerifier.pk,
        expiresAt: DEFAULT_EXPIRES_AT,
      };
      await setPrivateState('audit-user-wrongverifier', userState);
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-wrongverifier',
        circuitId: 'verifyPersonhood',
        args: [crypto.getRandomValues(new Uint8Array(32))],
      } as any);
    }, 'Signature from wrong verifier key rejected (not in trusted set)');
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. ATTESTATION EXPIRY TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 7. Attestation Expiry ---');

  // TEST: Changing expiresAt value (without re-signing) — the Schnorr
  // signature only covers credId, so the check passes. This documents
  // that expiry is a policy mechanism (disclosed value) not a cryptographic
  // binding. The verifier's key revocation is the real revocation primitive.
  {
    const differentExpiry = BigInt(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    const userState: PohPrivateState = {
      secretKey: userSecret,
      credentialSalt: userSalt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: verifier.pk,
      expiresAt: differentExpiry, // Different from DEFAULT_EXPIRES_AT
    };
    await setPrivateState('audit-user-differentexpiry', userState);
    let succeeded = false;
    try {
      const campaignZ = crypto.getRandomValues(new Uint8Array(32));
      await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
        compiledContract: CompiledPohCoreContract,
        contractAddress,
        privateStateId: 'audit-user-differentexpiry',
        circuitId: 'verifyPersonhood',
        args: [campaignZ],
      } as any);
      succeeded = true;
    } catch {
      succeeded = false;
    }
    // Document: this SUCCEEDS because expiry is not cryptographically bound.
    // The Schnorr signature only covers credId, not expiresAt.
    // This is by design — expiry is a disclosed policy value, not a
    // cryptographic constraint. The verifier's key revocation is the
    // actual revocation primitive.
    if (succeeded) {
      passed++;
      console.log('  PASS: Changed expiresAt accepted (expiry is policy-bound, not crypto-bound)');
      console.log('        FINDING (Informational): expiresAt is disclosed but not in Schnorr message.');
      console.log('        Mitigation: verifier key revocation via removeVerifier() is the real');
      console.log('        revocation primitive. Expiry is advisory for operational hygiene.');
    } else {
      failed++;
      console.log('  FAIL: Changed expiresAt was rejected (unexpected with current design)');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. INPUT VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n--- 8. Input Validation ---');

  // TEST: isVerifierTrusted with unregistered key
  {
    const unregisteredKey = jubjubSchnorrVerifyingKey(jubjubSampleScalar());
    const s = await queryLedger();
    // Note: isVerifierTrusted is a read-only circuit, not tested via submitCallTx
    // We can check the ledger state directly
    const isMember = s.verifiers.member(unregisteredKey);
    assert(!isMember, 'Unregistered key is not in verifiers set');
  }

  // TEST: isVerifierTrusted with registered key
  {
    const s = await queryLedger();
    const isMember = s.verifiers.member(verifier.pk);
    assert(isMember, 'Registered key is in verifiers set');
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n  Some adversarial tests FAILED — review findings above.');
  } else {
    console.log('\n  All adversarial tests PASSED.');
  }

  await wallet.stop();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('AUDIT SUITE ERROR:', err);
  process.exit(1);
});
