export type SealState = 'idle' | 'preparing' | 'proving' | 'verifying' | 'sealed' | 'success'

export interface Campaign {
  id: string
  title: string
  organizer: string
  organizerIcon?: string
  purpose: string
  status: 'live' | 'ending-soon' | 'invite' | 'ended'
  uniqueness: 'campaign-scoped' | 'application-scoped'
  requirement: string
  deadline: string
  featured?: boolean
  description?: string
  whyRequired?: string
  eligibility?: string[]
}

export interface VerificationReceipt {
  nullifier: string
  scope: string
  sessionId: string
  issuedAt: string
  expiresAt: string
  signature: string
}

export interface WalletState {
  connected: boolean
  address?: string
  provider?: string
  balance?: string
}

export type VerificationStage =
  | 'idle'
  | 'wallet-required'
  | 'wallet-connecting'
  | 'wallet-connected'
  | 'wallet-rejected'
  | 'wallet-unavailable'
  | 'proof-server-unavailable'
  | 'disclosure-review'
  | 'preparing'
  | 'generating-proof'
  | 'checking-attestation'
  | 'checking-uniqueness'
  | 'registering'
  | 'success'
  | 'already-registered'
  | 'campaign-closed'
  | 'expired'
  | 'verifier-unavailable'
  | 'network-error'
  | 'error'

export interface VerificationState {
  stage: VerificationStage
  campaign: Campaign | null
  wallet: WalletState
  receipt: VerificationReceipt | null
  error: string | null
}

export interface DAppRequest {
  id: string
  appName: string
  appId: string
  appIcon?: string
  scope: string
  requestedClaims: string[]
  returnUrl: string
  sessionId: string
  createdAt: string
  expiresAt: string
}

export type DAppVerificationStage =
  | 'request-loading'
  | 'request-expired'
  | 'request-invalid'
  | 'wallet-required'
  | 'wallet-connecting'
  | 'wallet-connected'
  | 'wallet-rejected'
  | 'wallet-unavailable'
  | 'proof-server-unavailable'
  | 'disclosure-review'
  | 'preparing'
  | 'generating-proof'
  | 'checking-attestation'
  | 'checking-uniqueness'
  | 'registering'
  | 'success'
  | 'returning'
  | 'attestation-failure'
  | 'network-error'
  | 'dapp-unavailable'
  | 'error'

// ── Campaign Management (Project-Side) ──

export interface CampaignCreateInput {
  title: string
  organizer: string
  description: string
  purpose: string
  scope: string
  startDate: string
  endDate: string
  purposeType: 'airdrop' | 'rewards' | 'access' | 'allowlist' | 'community' | 'other'
}

export interface ManagedCampaign extends Campaign {
  scope: string
  startDate: string
  registrations: number
  createdAt: string
  purposeType: 'airdrop' | 'rewards' | 'access' | 'allowlist' | 'community' | 'other'
}

export interface Registration {
  id: string
  campaignId: string
  walletHandle: string
  registeredAt: string
  verificationStatus: 'verified' | 'pending' | 'failed'
  commitmentRef: string
}

// ── DApp Developer Verification Requests ──

export type DevRequestStatus = 'active' | 'paused' | 'expired' | 'draft'

export interface DevRequest {
  id: string
  appId: string
  appName: string
  scope: string
  description: string
  returnUrl: string
  requestedClaims: string[]
  apiKey: string
  status: DevRequestStatus
  verifications: number
  maxVerifications: number | null
  createdAt: string
  expiresAt: string
}

export interface DevRequestCreateInput {
  appName: string
  scope: string
  description: string
  returnUrl: string
  requestedClaims: string[]
  maxVerifications: number | null
  expiresInDays: number
}
