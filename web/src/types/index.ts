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

/**
 * Midnight wallet state
 */
export interface WalletState {
  connected: boolean
  address?: string
  provider?: string
  balance?: string
  /** Wallet's coin public key (for ZK proofs) */
  coinPublicKey?: string
  /** Wallet's encryption public key */
  encryptionPublicKey?: string
  /** DUST balance */
  dustBalance?: bigint
}

/**
 * Midnight DApp Connector wallet API types
 * Based on @midnight-ntwrk/dapp-connector-api v4.0.1
 */
export interface MidnightInitialAPI {
  rdns: string
  name: string
  icon: string
  apiVersion: string
  connect: (networkId: string) => Promise<MidnightConnectedAPI>
}

export interface MidnightConnectedAPI {
  getConfiguration: () => Promise<{
    indexerUri: string
    indexerWsUri: string
    proverServerUri: string
    substrateNodeUri: string
    networkId: string
  }>
  getConnectionStatus: () => Promise<{
    status: string
    networkId: string
  }>
  getShieldedAddresses: () => Promise<{
    shieldedAddress: string
    shieldedCoinPublicKey: string
    shieldedEncryptionPublicKey: string
  }>
  getUnshieldedAddress: () => Promise<{ unshieldedAddress: string }>
  getDustAddress: () => Promise<{ dustAddress: string }>
  getShieldedBalances: () => Promise<Record<string, bigint>>
  getUnshieldedBalances: () => Promise<Record<string, bigint>>
  getDustBalance: () => Promise<{ balance: bigint; cap: bigint }>
  balanceUnsealedTransaction: (tx: string, options?: { payFees?: boolean }) => Promise<{ tx: string }>
  balanceSealedTransaction: (tx: string, options?: { payFees?: boolean }) => Promise<{ tx: string }>
  submitTransaction: (tx: string) => Promise<void>
  makeTransfer?: (outputs: unknown[]) => Promise<string>
  getProvingProvider?: (keyMaterialProvider: unknown) => unknown
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
