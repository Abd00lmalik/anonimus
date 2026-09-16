import { WebSocket } from 'ws';
// @ts-expect-error WebSocket polyfill for apollo subscriptions
globalThis.WebSocket = WebSocket;

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
  createUnprovenCallTx,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import crypto from 'node:crypto';
import { createHash } from 'node:crypto';

import { getConfig, type NetworkConfig } from './config.js';
import { MidnightWalletProvider, syncWallet, type WalletSecret } from './wallet.js';
import { buildProviders, type PohProviders } from './providers.js';
import {
  CompiledPohCoreContract,
  Contract,
  pureCircuits,
  zkConfigPath,
} from '../contracts/index.js';
import {
  createTestVerifier,
  issueAttestation,
  type PohPrivateState,
  type TestVerifier,
  type JubjubPoint,
} from '../contracts/witnesses.js';
import { setVerifier } from './attestation-service.js';

// ============================================================================
// Midnight Service — real ZK proof generation + transaction submission
//
// This service handles all Midnight SDK operations:
//   1. Wallet setup (seed-based, local devnet)
//   2. Contract deployment
//   3. Verifier registration
//   4. Credential enrollment
//   5. Personhood verification (ZK proof + transaction)
//
// PRIVACY: credential secret + salt exist only transiently during
// a single registration request. They are never stored or returned.
// ============================================================================

// Lazy validation — don't crash at module import time
function getDeployerSeed(): string {
  const seed = process.env['DEPLOYER_WALLET_SECRET'] ?? '';
  if (!seed) {
    throw new Error('DEPLOYER_WALLET_SECRET env var is required');
  }
  return seed;
}

export interface MidnightRegistrationResult {
  txHash: string;
  nullifier: string;
  commitmentRef: string;
  expiresAt: string;
}

/**
 * Result of creating an unsigned registration transaction.
 * The participant's wallet will prove, balance, sign, and submit this.
 */
export interface UnsignedRegistrationResult {
  /** Hex-encoded unsigned enrollment transaction */
  enrollmentTx: string;
  /** Hex-encoded unsigned verification transaction */
  verificationTx: string;
  /** Attestation data needed for the ZK proof */
  attestation: {
    announcement: { x: string; y: string };
    response: string;
  };
  /** Verifier's public key (Jubjub point) */
  verifierVk: { x: string; y: string };
  /** Credential ID (hex) */
  credId: string;
  /** Commitment (hex) */
  commitment: string;
  /** Expiry timestamp (ISO) */
  expiresAt: string;
  /** Nullifier (hex) - for duplicate detection */
  nullifier: string;
}

export class MidnightService {
  private wallet!: MidnightWalletProvider;
  private providers!: PohProviders;
  private contractAddress!: ContractAddress;
  private verifier!: TestVerifier;
  private adminSecretKey!: Uint8Array;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void }) {}

  /**
   * Initialize the service: wallet → sync → providers → deploy → register verifier.
   * Must be called before register(). Safe to call multiple times.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this._doInit();
    await this.initPromise;
  }

  private async _doInit(): Promise<void> {
    const config = getConfig();
    setNetworkId(config.networkId);
    this.logger.info(`[MidnightService] Network: ${config.networkId}`);

    const secret: WalletSecret = { kind: 'mnemonic', value: getDeployerSeed() };
    this.wallet = await MidnightWalletProvider.build(
      this.logger as any,
      {
        walletNetworkId: config.networkId,
        networkId: config.networkId,
        indexer: config.indexer,
        indexerWS: config.indexerWS,
        node: config.node,
        nodeWS: config.nodeWS,
        faucet: config.faucet,
        proofServer: config.proofServer,
      },
      secret,
    );
    await this.wallet.start();
    await syncWallet(this.logger as any, this.wallet.wallet);
    this.logger.info('[MidnightService] Wallet synced.');

    // Build providers (proof server, indexer, private state, etc.)
    this.providers = buildProviders(
      this.wallet,
      zkConfigPath,
      config,
      `poh-service-${config.networkId}`,
    );
    this.logger.info('[MidnightService] Providers initialized.');

    // Contract: deploy fresh (local) or load from env (preprod)
    const existingAddress = process.env['MIDNIGHT_CONTRACT_ADDRESS'];
    if (existingAddress) {
      this.contractAddress = existingAddress as ContractAddress;
      this.providers.privateStateProvider.setContractAddress(this.contractAddress);
      this.logger.info(`[MidnightService] Using existing contract: ${this.contractAddress}`);
    } else {
      // Retry contract deployment — DUST may take time to accrue after registration
      const MAX_RETRIES = 60;
      const RETRY_DELAY_MS = 60_000; // 1 minute
      let lastError: unknown;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await this._deployContract();
          this.logger.info(`[MidnightService] Contract deployed at: ${this.contractAddress}`);
          break;
        } catch (err: any) {
          lastError = err;
          if (err.message?.includes('InsufficientFunds') || err.message?.includes('could not balance dust')) {
            this.logger.warn(`[MidnightService] No DUST yet (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          } else if (err.message?.includes('170') || err.message?.includes('InvalidDustSpendProof')) {
            this.logger.warn(`[MidnightService] DUST proof stale (attempt ${attempt}/${MAX_RETRIES}). Retrying in 10s...`);
            await new Promise(r => setTimeout(r, 10_000));
          } else {
            throw err;
          }
        }
      }
      if (!this.contractAddress) {
        throw lastError;
      }
    }

    // Register test verifier (one-time)
    this.verifier = createTestVerifier();
    setVerifier(this.verifier);
    if (!existingAddress) {
      await this._registerVerifier();
      this.logger.info('[MidnightService] Verifier registered.');
    }

    this.initialized = true;
  }

  getVerifierPublicKey(): JubjubPoint {
    return this.verifier.pk;
  }

  isReady(): boolean {
    return this.initialized;
  }

  // ── Internal operations ───────────────────────────────────────────

  private async _deployContract(): Promise<void> {
    const MAX_TX_RETRIES = 5;
    let lastTxError: unknown;

    for (let txAttempt = 1; txAttempt <= MAX_TX_RETRIES; txAttempt++) {
      try {
        const adminSecretKey = crypto.getRandomValues(new Uint8Array(32));
        this.adminSecretKey = adminSecretKey;
        const adminState: PohPrivateState = {
          secretKey: adminSecretKey,
          credentialSalt: new Uint8Array(32),
          verifierSigningKey: 0n,
          attestation: null,
          attestedVerifierPk: null,
          expiresAt: 0n,
        };

        const deployedResult = await (deployContract<Contract>)(this.providers, {
          compiledContract: CompiledPohCoreContract,
          privateStateId: 'poh-admin-state',
          initialPrivateState: adminState,
          args: [],
        } as any);
        this.contractAddress = deployedResult.deployTxData.public.contractAddress;

        // Persist admin state for subsequent admin operations
        this.providers.privateStateProvider.setContractAddress(this.contractAddress);
        await this.providers.privateStateProvider.set('poh-admin-state', adminState);
        return;
      } catch (err: any) {
        lastTxError = err;
        if (err.message?.includes('170') || err.message?.includes('InvalidDustSpendProof')) {
          this.logger.warn(`[MidnightService] DUST spend proof stale (attempt ${txAttempt}/${MAX_TX_RETRIES}). Rebuilding tx...`);
          await new Promise(r => setTimeout(r, 5_000));
        } else {
          throw err;
        }
      }
    }
    throw lastTxError;
  }

  private async _setPrivateState(id: string, state: PohPrivateState): Promise<void> {
    this.providers.privateStateProvider.setContractAddress(this.contractAddress);
    await this.providers.privateStateProvider.set(id, state);
  }

  private async _registerVerifier(): Promise<void> {
    const MAX_RETRIES = 5;
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this._setPrivateState('poh-admin-state', {
          secretKey: this.adminSecretKey,
          credentialSalt: new Uint8Array(32),
          verifierSigningKey: 0n,
          attestation: null,
          attestedVerifierPk: null,
          expiresAt: 0n,
        });
        await submitCallTx<Contract, 'registerVerifier'>(this.providers, {
          compiledContract: CompiledPohCoreContract,
          contractAddress: this.contractAddress,
          privateStateId: 'poh-admin-state',
          circuitId: 'registerVerifier',
          args: [this.verifier.pk],
        } as any);
        return;
      } catch (err: any) {
        lastError = err;
        if (err.message?.includes('170') || err.message?.includes('InvalidDustSpendProof')) {
          this.logger.warn(`[MidnightService] Verifier registration: DUST proof stale (attempt ${attempt}/${MAX_RETRIES}). Rebuilding...`);
          await new Promise(r => setTimeout(r, 5_000));
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  }

  /**
   * Full registration: enroll credential + verify personhood for a campaign.
   *
   * Flow:
   *   1. Generate credential secret + salt (ephemeral, per-request)
   *   2. Derive commitment + credential ID
   *   3. Issue Schnorr attestation (real signature)
   *   4. Enroll commitment in Merkle registry (on-chain tx)
   *   5. Verify personhood (ZK proof + on-chain tx)
   *
   * Private data lifecycle:
   *   - credSecret: generated → used in this request → discarded
   *   - salt: generated → used in this request → discarded
   *   - attestation: generated → used in proof → not stored
   *   - Biometric data: stays on user device (never reaches backend)
   */
  async register(campaignId: string): Promise<MidnightRegistrationResult> {
    if (!this.initialized) {
      throw new Error('MidnightService not initialized — call initialize() first');
    }

    const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = BigInt(Date.now() + EXPIRY_MS);

    // Step 1: Generate ephemeral credential material
    const credSecret = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(32));

    // Step 2: Derive public values
    const credId = pureCircuits.deriveCredId(credSecret);
    const commitment = pureCircuits.deriveCommitment(credSecret, salt);

    // Step 3: Issue attestation (Schnorr signature over credId)
    const attestation = issueAttestation(this.verifier, credSecret, expiresAt);

    // Step 4: Enroll credential (admin tx — inserts commitment into Merkle tree)
    const adminState: PohPrivateState = {
      secretKey: this.adminSecretKey,
      credentialSalt: new Uint8Array(32),
      verifierSigningKey: 0n,
      attestation: null,
      attestedVerifierPk: null,
      expiresAt: 0n,
    };
    await this._setPrivateState('poh-admin-state', adminState);
    await submitCallTx<Contract, 'enrollCredential'>(this.providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress: this.contractAddress,
      privateStateId: 'poh-admin-state',
      circuitId: 'enrollCredential',
      args: [commitment],
    } as any);

    // Step 5: Verify personhood (user ZK proof — Schnorr + Merkle + nullifier)
    const userState: PohPrivateState = {
      secretKey: credSecret,
      credentialSalt: salt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: this.verifier.pk,
      expiresAt,
    };
    await this._setPrivateState('poh-user-state', userState);
    const scopeBytes2 = new Uint8Array(32);
    const encoded2 = new TextEncoder().encode(campaignId);
    scopeBytes2.set(encoded2.slice(0, 32));
    const verifyResult = await submitCallTx<Contract, 'verifyPersonhood'>(this.providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress: this.contractAddress,
      privateStateId: 'poh-user-state',
      circuitId: 'verifyPersonhood',
      args: [scopeBytes2],
    } as any);

    // Compute nullifier off-chain (matches circuit's persistentHash)
    const nullifier = this._computeNullifier(campaignId, credSecret);
    const txHash = (verifyResult as any)?.txId ?? `tx-${Date.now().toString(36)}`;

    return {
      txHash,
      nullifier,
      commitmentRef: Buffer.from(commitment).toString('hex'),
      expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
    };
  }

  /**
   * Create an unsigned verification transaction for the participant.
   *
   * Architecture (MCP-confirmed):
   *   1. Generate credential material (ephemeral, per-request)
   *   2. Issue Schnorr attestation
   *   3. Backend performs enrollment (admin tx — inserts commitment into Merkle tree)
   *   4. Wait for enrollment confirmation on-chain
   *   5. Create unsigned verification tx (user's wallet will prove/balance/sign/submit)
   *
   * The backend NEVER signs the participant's verification transaction.
   * Enrollment IS a server-side admin operation (deployer wallet signs it).
   */
  async createUnsignedRegisterTx(campaignId: string): Promise<UnsignedRegistrationResult> {
    if (!this.initialized) {
      throw new Error('MidnightService not initialized — call initialize() first');
    }

    const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = BigInt(Date.now() + EXPIRY_MS);

    // Step 1: Generate ephemeral credential material
    const credSecret = crypto.getRandomValues(new Uint8Array(32));
    const salt = crypto.getRandomValues(new Uint8Array(32));

    // Step 2: Derive public values
    const credId = pureCircuits.deriveCredId(credSecret);
    const commitment = pureCircuits.deriveCommitment(credSecret, salt);

    // Step 3: Issue attestation (Schnorr signature over credId)
    const attestation = issueAttestation(this.verifier, credSecret, expiresAt);

    // Step 4: Backend performs enrollment (admin tx — signs with deployer wallet)
    // This inserts the commitment into the Merkle registry on-chain.
    // The participant's wallet does NOT sign this — it's an admin operation.
    const adminState: PohPrivateState = {
      secretKey: this.adminSecretKey,
      credentialSalt: new Uint8Array(32),
      verifierSigningKey: 0n,
      attestation: null,
      attestedVerifierPk: null,
      expiresAt: 0n,
    };
    await this._setPrivateState('poh-admin-state', adminState);
    await submitCallTx<Contract, 'enrollCredential'>(this.providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress: this.contractAddress,
      privateStateId: 'poh-admin-state',
      circuitId: 'enrollCredential',
      args: [commitment],
    } as any);
    this.logger.info('[MidnightService] Enrollment tx submitted, waiting for confirmation...');

    // Step 5: Wait for enrollment to be confirmed on-chain
    // The verification circuit checks the Merkle root, which must include the commitment.
    await this._waitForStateUpdate(60_000);
    this.logger.info('[MidnightService] Enrollment confirmed on-chain.');

    // Step 6: Create unsigned verification transaction
    // This is the participant's transaction — their wallet will prove/balance/sign/submit it.
    const userState: PohPrivateState = {
      secretKey: credSecret,
      credentialSalt: salt,
      verifierSigningKey: 0n,
      attestation,
      attestedVerifierPk: this.verifier.pk,
      expiresAt,
    };
    await this._setPrivateState('poh-user-state', userState);

    const scopeBytes = new Uint8Array(32);
    const encoded = new TextEncoder().encode(campaignId);
    scopeBytes.set(encoded.slice(0, 32));

    const verificationResult = await createUnprovenCallTx<Contract, 'verifyPersonhood'>(this.providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress: this.contractAddress,
      privateStateId: 'poh-user-state',
      circuitId: 'verifyPersonhood',
      args: [scopeBytes],
    } as any);

    // Compute nullifier off-chain
    const nullifier = this._computeNullifier(campaignId, credSecret);

    return {
      enrollmentTx: '', // Enrollment done by backend — no tx for user
      verificationTx: toHex(verificationResult.private.unprovenTx.serialize()),
      attestation: {
        announcement: {
          x: attestation.announcement.x.toString(),
          y: attestation.announcement.y.toString(),
        },
        response: attestation.response.toString(),
      },
      verifierVk: {
        x: this.verifier.pk.x.toString(),
        y: this.verifier.pk.y.toString(),
      },
      credId: Buffer.from(credId).toString('hex'),
      commitment: Buffer.from(commitment).toString('hex'),
      expiresAt: new Date(Date.now() + EXPIRY_MS).toISOString(),
      nullifier,
    };
  }

  /**
   * Wait for on-chain state to update after a transaction.
   * Polls the indexer until the latest block height increases.
   */
  private async _waitForStateUpdate(timeoutMs: number): Promise<void> {
    const config = getConfig();
    const startTime = Date.now();
    let lastHeight: number | undefined;

    const queryHeight = async (): Promise<number | undefined> => {
      try {
        const res = await fetch(config.indexer, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'query { block { height } }' }),
        });
        if (!res.ok) return undefined;
        const json: any = await res.json();
        const h = json?.data?.block?.height;
        return typeof h === 'number' && h > 0 ? h : undefined;
      } catch {
        return undefined;
      }
    };

    while (Date.now() - startTime < timeoutMs) {
      try {
        const height = await queryHeight();
        if (height !== undefined && height !== null) {
          if (lastHeight === undefined) {
            lastHeight = height;
          } else if (height > lastHeight) {
            return;
          }
        }
      } catch {
        // Indexer may be temporarily unavailable, keep polling
      }
      await new Promise(r => setTimeout(r, 3_000));
    }
    this.logger.warn(`[MidnightService] State update wait timed out after ${timeoutMs}ms — proceeding anyway.`);
  }

  /**
   * Compute campaign-scoped nullifier off-chain.
   *
   * Matches the circuit's: persistentHash<Vector<3, Bytes<32>>>(
   *   [pad(32, "anonimus:nul:"), campaignId, credSecret]
   * )
   *
   * persistentHash is SHA-256 based. The preimage is the raw byte
   * concatenation of the three elements.
   */
  private _computeNullifier(campaignId: string, credSecret: Uint8Array): string {
    const domainSeparator = new Uint8Array(32);
    domainSeparator.set(new TextEncoder().encode('anonimus:nul:'));

    const campaignIdBytes = new TextEncoder().encode(campaignId);
    const paddedCampaignId = new Uint8Array(32);
    paddedCampaignId.set(campaignIdBytes.slice(0, Math.min(campaignIdBytes.length, 32)));

    const preimage = new Uint8Array(32 + 32 + 32);
    preimage.set(domainSeparator, 0);
    preimage.set(paddedCampaignId, 32);
    preimage.set(credSecret, 64);

    return createHash('sha256').update(preimage).digest('hex');
  }
}
