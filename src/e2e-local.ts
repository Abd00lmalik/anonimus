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
import {
  type EnvironmentConfiguration,
} from '@midnight-ntwrk/testkit-js';
import pino from 'pino';
import crypto from 'node:crypto';

import { getConfig } from './config.js';
import { MidnightWalletProvider, syncWallet, type WalletSecret } from './wallet.js';
import { buildProviders, type PohProviders } from './providers.js';
import {
  CompiledPohCoreContract,
  Contract,
  ledger,
  pureCircuits,
  zkConfigPath,
  type Ledger,
} from '../contracts/index.js';
import {
  createTestVerifier,
  issueAttestation,
  type PohPrivateState,
} from '../contracts/witnesses.js';

// Genesis-funded local devnet wallet (basic-start reference, step 4).
const ALICE_LOCAL_SEED =
  '0000000000000000000000000000000000000000000000000000000000000001';

const CAMPAIGN_A = crypto.getRandomValues(new Uint8Array(32));
const CAMPAIGN_B = crypto.getRandomValues(new Uint8Array(32));

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const config = getConfig();
const secret: WalletSecret = { kind: 'seed', value: ALICE_LOCAL_SEED };

let wallet: MidnightWalletProvider;
let providers: PohProviders;
let contractAddress: ContractAddress;

async function queryLedger(): Promise<Ledger> {
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (!state) throw new Error('Contract state not found');
  return ledger(state.data);
}

async function setPrivateState(id: string, state: PohPrivateState): Promise<void> {
  providers.privateStateProvider.setContractAddress(contractAddress);
  await providers.privateStateProvider.set(id, state);
}

async function main() {
  setNetworkId(config.networkId);
  logger.info(`Network: ${config.networkId}`);

  // ── Wallet + providers ─────────────────────────────────────────────
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

  providers = buildProviders(wallet, zkConfigPath, config, `poh-core-${Date.now()}`);
  logger.info('Providers initialized.');

  // ── 1. Deploy (admin wallet) ──────────────────────────────────────
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
    privateStateId: 'poh-admin-state',
    initialPrivateState: adminState,
    args: [],
  } as any);
  contractAddress = deployedResult.deployTxData.public.contractAddress;
  logger.info(`Contract deployed at: ${contractAddress}`);

  const s0 = await queryLedger();
  console.log('  adminKey:', Buffer.from(s0.adminKey).toString('hex').slice(0, 16) + '...');

  // ── 2. Register verifier (admin) ──────────────────────────────────
  const verifier = createTestVerifier();
  logger.info('Test verifier created.');

  await setPrivateState('poh-admin-state', adminState);
  await submitCallTx<Contract, 'registerVerifier'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'poh-admin-state',
    circuitId: 'registerVerifier',
    args: [verifier.pk],
  } as any);
  logger.info('Verifier registered on-chain.');

  // ── 3. User credential + commitment ────────────────────────────────
  const userSecretKey = crypto.getRandomValues(new Uint8Array(32));
  const userSalt = crypto.getRandomValues(new Uint8Array(32));

  const credId = pureCircuits.deriveCredId(userSecretKey);
  const commitment = pureCircuits.deriveCommitment(userSecretKey, userSalt);
  logger.info('Credential derived (credId + commitment).');

  // ── 4. Verifier issues attestation (with 30-day expiry) ──────────
  const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  const expiresAt = BigInt(Date.now() + EXPIRY_MS);
  const attestation = issueAttestation(verifier, userSecretKey, expiresAt);
  logger.info('Attestation issued by test verifier.');

  // ── 5. Enroll credential (admin) ──────────────────────────────────
  await setPrivateState('poh-admin-state', adminState);
  await submitCallTx<Contract, 'enrollCredential'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'poh-admin-state',
    circuitId: 'enrollCredential',
    args: [commitment],
  } as any);
  logger.info('Credential enrolled in registry.');

  // ── 6. Verify personhood (user) — campaign A ──────────────────────
  const userState: PohPrivateState = {
    secretKey: userSecretKey,
    credentialSalt: userSalt,
    verifierSigningKey: 0n,
    attestation,
    attestedVerifierPk: verifier.pk,
    expiresAt,
  };
  await setPrivateState('poh-user-state', userState);

  await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'poh-user-state',
    circuitId: 'verifyPersonhood',
    args: [CAMPAIGN_A],
  } as any);
  logger.info('Personhood verified for campaign A.');

  // ── 7. Duplicate claim rejected ───────────────────────────────────
  try {
    await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
      compiledContract: CompiledPohCoreContract,
      contractAddress,
      privateStateId: 'poh-user-state',
      circuitId: 'verifyPersonhood',
      args: [CAMPAIGN_A],
    } as any);
    throw new Error('Expected duplicate claim to fail but it succeeded');
  } catch (err: any) {
    if (err.message?.includes('Expected duplicate claim')) throw err;
    logger.info(`Duplicate claim correctly rejected: ${err.message?.slice(0, 80)}`);
  }

  // ── 8. Different campaign succeeds ────────────────────────────────
  await submitCallTx<Contract, 'verifyPersonhood'>(providers, {
    compiledContract: CompiledPohCoreContract,
    contractAddress,
    privateStateId: 'poh-user-state',
    circuitId: 'verifyPersonhood',
    args: [CAMPAIGN_B],
  } as any);
  logger.info('Personhood verified for campaign B (different scope).');

  // ── Final state ────────────────────────────────────────────────────
  const sf = await queryLedger();
  console.log('\n=== Final ledger ===');
  console.log('  verifiers:', sf.verifiers.size());
  console.log('  registry leaves:', sf.registry.firstFree());
  console.log('  spent nullifiers:', sf.spentNullifiers.size());

  await wallet.stop();
}

main()
  .then(() => {
    console.log('\nE2E LOCAL COMPLETE');
    process.exit(0);
  })
  .catch((err) => {
    console.error('E2E LOCAL FAILED:', err);
    process.exit(1);
  });
