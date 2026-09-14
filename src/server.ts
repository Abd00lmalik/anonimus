import express from 'express';
import cors from 'cors';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  getRegistrationsByCampaign,
  getRegistrationCount,
  addRegistration,
  isRegistered,
} from './store.js';
import {
  getVerifierPublicKey,
  issueAttestationForUser,
  type AttestationRequest,
} from './attestation-service.js';
import { MidnightService } from './midnight-service.js';
import { getFaucetUrl, getExplorerUrl } from './config.js';

// ============================================================================
// Anonimus Backend Server — Phase 1 (real Midnight integration)
//
// Provides:
//   1. Campaign CRUD (metadata persistence via Supabase or JSON fallback)
//   2. Registration via real Midnight ZK proof + transaction
//   3. Attestation issuance (verifier service)
//   4. Health + status endpoints
//
// The /api/register endpoint performs REAL:
//   - Credential enrollment (Merkle tree insert)
//   - ZK proof generation (Schnorr + Merkle + nullifier)
//   - Midnight transaction submission
//   - On-chain state change
//
// The /api/register-unsigned endpoint creates unsigned transactions
// that the participant's wallet proves, balances, signs, and submits.
// ============================================================================

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// ── Initialize services ──────────────────────────────────────────────
// NOTE: The verifier keypair is created by midnight-service.ts and shared
// with attestation-service.ts via setVerifier(). This ensures the same key
// is used for both on-chain registration and off-chain attestation issuance.
const midnightService = new MidnightService(console);

// Background init: deploy contract + register verifier on local devnet.
// Server starts immediately; registration endpoint returns 503 until ready.
midnightService.initialize().catch(err => {
  console.error('[Anonimus] Midnight service init failed:', err);
});

// ── Health ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    midnightReady: midnightService.isReady(),
    timestamp: new Date().toISOString(),
  });
});

// ── Verifier info ─────────────────────────────────────────────────────
app.get('/api/verifier', (_req, res) => {
  const vk = midnightService.isReady()
    ? midnightService.getVerifierPublicKey()
    : getVerifierPublicKey();
  if (!vk) {
    res.status(503).json({ error: 'Verifier not initialized' });
    return;
  }
  res.json({
    publicKey: {
      x: vk.x.toString(),
      y: vk.y.toString(),
    },
  });
});

// ── Campaign CRUD ─────────────────────────────────────────────────────

app.get('/api/campaigns', async (_req, res) => {
  try {
    const campaigns = await getAllCampaigns();
    const withCounts = await Promise.all(
      campaigns.map(async (c) => ({
        ...c,
        registrations: await getRegistrationCount(c.id),
      }))
    );
    res.json({ campaigns: withCounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params['id']);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const registrations = await getRegistrationCount(campaign.id);
    res.json({
      ...campaign,
      registrations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const {
      title, organizer, description, purpose,
      scope, startDate, endDate, purposeType, creatorWallet,
    } = req.body;

    if (!title || !organizer || !scope || !startDate || !endDate || !creatorWallet) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const campaign = await createCampaign({
      title, organizer, description: description ?? '',
      purpose: purpose ?? '', scope, startDate, endDate,
      purposeType: purposeType ?? 'community',
      creatorWallet,
    });

    res.status(201).json(campaign);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Registration (legacy — kept for backward compatibility) ──────────

app.get('/api/campaigns/:id/registrations', async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params['id']);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const registrations = await getRegistrationsByCampaign(campaign.id);
    res.json({ registrations, count: registrations.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns/:id/register', async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params['id']);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const { walletHandle, nullifier, commitmentRef } = req.body;
    if (!walletHandle || !nullifier || !commitmentRef) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const alreadyRegistered = await isRegistered(campaign.id, nullifier);
    if (alreadyRegistered) {
      res.status(409).json({ error: 'Already registered in this campaign' });
      return;
    }

    const registration = await addRegistration({
      campaignId: campaign.id,
      walletHandle,
      nullifier,
      commitmentRef,
    });

    res.status(201).json(registration);
  } catch (err: any) {
    if (err.message?.includes('Already registered')) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Real registration (ZK proof + Midnight transaction) ──────────────
//
// This is the REAL integration endpoint. It:
//   1. Generates ephemeral credential material (never stored)
//   2. Issues Schnorr attestation (real signature)
//   3. Enrolls credential in Merkle registry (on-chain tx)
//   4. Generates ZK proof (Schnorr + Merkle + nullifier check)
//   5. Submits verifyPersonhood transaction to Midnight
//   6. Waits for on-chain confirmation
//   7. Records registration in backend store
//
// Privacy: credential secret + salt exist only transiently during
// this request. They are never returned or stored.

app.post('/api/register', async (req, res) => {
  try {
    if (!midnightService.isReady()) {
      res.status(503).json({
        error: 'Midnight service initializing — contract deployment in progress',
      });
      return;
    }

    const { campaignId, walletHandle } = req.body;
    if (!campaignId || !walletHandle) {
      res.status(400).json({ error: 'Missing campaignId or walletHandle' });
      return;
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Execute real Midnight registration
    const result = await midnightService.register(campaignId);

    // Check for duplicate nullifier in this campaign
    const alreadyRegistered = await isRegistered(campaignId, result.nullifier);
    if (alreadyRegistered) {
      res.status(409).json({ error: 'Already registered in this campaign' });
      return;
    }

    // Record registration
    const registration = await addRegistration({
      campaignId,
      walletHandle,
      nullifier: result.nullifier,
      commitmentRef: result.commitmentRef,
    });

    res.status(201).json({
      registrationId: registration.id,
      nullifier: result.nullifier,
      commitmentRef: result.commitmentRef,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      scope: campaignId,
    });
  } catch (err: any) {
    console.error('[Anonimus] Registration failed:', err.message ?? 'unknown error');
    const message = err.message ?? 'Registration failed';
    const status = message.includes('Already used in this campaign')
      ? 409
      : message.includes('not initialized')
        ? 503
        : 500;
    res.status(status).json({ error: message });
  }
});

// ── Attestation (legacy — kept for backward compatibility) ───────────

app.post('/api/attest', (req, res) => {
  try {
    const request: AttestationRequest = req.body;
    if (!request.commitment || !request.credId) {
      res.status(400).json({ error: 'Missing commitment or credId' });
      return;
    }

    // NOTE: This endpoint is kept for backward compatibility.
    // The real registration flow uses /api/register which handles
    // attestation internally as part of the full ZK proof flow.
    const response = issueAttestationForUser(request);
    res.json(response);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Unsigned registration (user-wallet-signed flow) ─────────────────
//
// This endpoint creates unsigned transactions that the participant's
// wallet will prove, balance, sign, and submit.
//
// The backend NEVER signs the participant's transaction.

app.post('/api/register-unsigned', async (req, res) => {
  try {
    if (!midnightService.isReady()) {
      res.status(503).json({
        error: 'Midnight service initializing — contract deployment in progress',
      });
      return;
    }

    const { campaignId } = req.body;
    if (!campaignId) {
      res.status(400).json({ error: 'Missing campaignId' });
      return;
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Create unsigned transactions for the participant's wallet
    const result = await midnightService.createUnsignedRegisterTx(campaignId);

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Anonimus] Unsigned registration failed:', err.message ?? 'unknown error');
    const message = err.message ?? 'Registration failed';
    const status = message.includes('not initialized') ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

// ── Network info ────────────────────────────────────────────────────

app.get('/api/network', (_req, res) => {
  res.json({
    faucetUrl: getFaucetUrl(),
    explorerUrl: getExplorerUrl(),
    networkId: process.env['MIDNIGHT_NETWORK'] ?? 'local',
  });
});

// ── Start ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Anonimus] Backend server running on http://localhost:${PORT}`);
  console.log(`[Anonimus] Real registration: POST /api/register`);
  console.log(`[Anonimus] Unsigned registration: POST /api/register-unsigned`);
  console.log(`[Anonimus] Midnight service: initializing in background...`);
});
