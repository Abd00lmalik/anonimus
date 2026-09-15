// ============================================================================
// API Client — frontend ↔ backend communication
//
// Base URL defaults to localhost:3001 for local dev.
// In production, this would be configured via environment variables.
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──

export interface ApiCampaign {
  id: string;
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  status: 'live' | 'ended';
  creatorWallet: string;
  createdAt: string;
  registrations: number;
}

export interface ApiRegistration {
  id: string;
  campaignId: string;
  walletHandle: string;
  registeredAt: string;
  nullifier: string;
  commitmentRef: string;
}

export interface ApiVerifier {
  publicKey: { x: string; y: string };
}

export interface ApiAttestationResponse {
  attestation: {
    announcement: { x: string; y: string };
    response: string;
  };
  verifierVk: { x: bigint; y: bigint };
  expiresAt: string;
}

export interface ApiRealRegistrationResponse {
  registrationId: string;
  nullifier: string;
  commitmentRef: string;
  txHash: string;
  expiresAt: string;
  scope: string;
}

// ── Campaign API ──

export async function fetchCampaigns(): Promise<ApiCampaign[]> {
  const { campaigns } = await apiFetch<{ campaigns: ApiCampaign[] }>('/api/campaigns');
  return campaigns;
}

export async function fetchCampaign(id: string): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>(`/api/campaigns/${id}`);
}

export async function createCampaignApi(input: {
  title: string;
  organizer: string;
  description: string;
  purpose: string;
  scope: string;
  startDate: string;
  endDate: string;
  purposeType: string;
  creatorWallet: string;
}): Promise<ApiCampaign> {
  return apiFetch<ApiCampaign>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Registration API ──

export async function fetchRegistrations(campaignId: string): Promise<{
  registrations: ApiRegistration[];
  count: number;
}> {
  return apiFetch(`/api/campaigns/${campaignId}/registrations`);
}

export async function registerForCampaign(
  campaignId: string,
  input: {
    walletHandle: string;
    nullifier: string;
    commitmentRef: string;
  },
): Promise<ApiRegistration> {
  return apiFetch<ApiRegistration>(`/api/campaigns/${campaignId}/register`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Attestation API ──

export async function fetchVerifier(): Promise<ApiVerifier> {
  return apiFetch<ApiVerifier>('/api/verifier');
}

export async function requestAttestation(input: {
  commitment: string;
  credId: string;
}): Promise<ApiAttestationResponse> {
  return apiFetch<ApiAttestationResponse>('/api/attest', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Real Registration API (ZK proof + Midnight transaction) ──

export async function registerForCampaignReal(
  campaignId: string,
  walletHandle: string,
): Promise<ApiRealRegistrationResponse> {
  return apiFetch<ApiRealRegistrationResponse>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ campaignId, walletHandle }),
  });
}

// ── Unsigned Registration API (user-wallet-signed flow) ──

export interface ApiUnsignedRegistrationResponse {
  enrollmentTx: string
  verificationTx: string
  attestation: {
    announcement: { x: string; y: string }
    response: string
  }
  verifierVk: { x: string; y: string }
  credId: string
  commitment: string
  expiresAt: string
  nullifier: string
}

export async function registerForCampaignUnsigned(
  campaignId: string,
): Promise<ApiUnsignedRegistrationResponse> {
  return apiFetch<ApiUnsignedRegistrationResponse>('/api/register-unsigned', {
    method: 'POST',
    body: JSON.stringify({ campaignId }),
  })
}

// ── Network Info API ──

export interface ApiNetworkInfo {
  faucetUrl: string
  explorerUrl: string
  networkId: string
}

export async function fetchNetworkInfo(): Promise<ApiNetworkInfo> {
  return apiFetch<ApiNetworkInfo>('/api/network')
}
