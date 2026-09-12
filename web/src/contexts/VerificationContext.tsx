import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Campaign, VerificationReceipt, VerificationStage } from '../types'
import { useWallet } from './WalletContext'
import { registerForCampaignReal } from '../lib/api'

// ============================================================================
// VerificationContext — real verification flow
//
// The flow:
//   1. Wallet connection (mock devnet wallet for UX)
//   2. Disclosure review
//   3. Face check (client-side spatial quality — NOT liveness/personhood)
//   4. Registration (real Midnight ZK proof + transaction via backend)
//
// Privacy boundary:
//   - Face data: stays on user device (never sent to backend)
//   - Credential secret: generated ephemerally by backend, never returned
//   - Attestation: Schnorr signature, used in ZK proof, not stored
//   - Nullifier: derived from credential + campaign, revealed on-chain
//
// IMPORTANT: The face check in step 3 establishes face presence and
// spatial quality. It does NOT establish liveness, personhood, or
// uniqueness. The actual "proof of humanity" is the Schnorr attestation
// issued by the backend verifier service, which is verified inside the
// ZK proof on Midnight. In the current dev environment, the backend
// trusts that face verification was completed. In production, a real
// personhood provider would replace this client-side check.
// ============================================================================

interface VerificationContextType {
  stage: VerificationStage
  campaign: Campaign | null
  receipt: VerificationReceipt | null
  error: string | null
  setCampaign: (c: Campaign) => void
  startWalletConnect: (provider: string) => Promise<void>
  reviewDisclosure: () => void
  startVerification: () => Promise<void>
  reset: () => void
  faceVerificationState: {
    modelsLoaded: boolean
    livenessPassed: boolean
    faceDetected: boolean
  }
  setFaceVerificationState: (state: Partial<VerificationContextType['faceVerificationState']>) => void
}

const VerificationContext = createContext<VerificationContextType | null>(null)

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<VerificationStage>('idle')
  const [campaign, setCampaignState] = useState<Campaign | null>(null)
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { wallet, connect } = useWallet()

  const [faceVerificationState, setFaceVerificationStateInternal] = useState({
    modelsLoaded: false,
    livenessPassed: false,
    faceDetected: false,
  })

  const setFaceVerificationState = useCallback((state: Partial<typeof faceVerificationState>) => {
    setFaceVerificationStateInternal(prev => ({ ...prev, ...state }))
  }, [])

  const setCampaign = useCallback((c: Campaign) => {
    setCampaignState(c)
    setStage('wallet-required')
    setError(null)
  }, [])

  const startWalletConnect = useCallback(async (provider: string) => {
    try {
      setStage('wallet-connecting')
      await connect(provider)
      setStage('wallet-connected')
    } catch {
      setStage('wallet-rejected')
      setError('Wallet connection was rejected or timed out.')
    }
  }, [connect])

  const reviewDisclosure = useCallback(() => {
    setStage('disclosure-review')
  }, [])

  const startVerification = useCallback(async () => {
    if (!campaign) return

    try {
      setStage('preparing')
      setError(null)

      // Step 1: Generating proof — real ZK proof generation via backend
      // This triggers: credential enrollment + Schnorr attestation +
      // ZK proof generation + Midnight transaction submission
      setStage('generating-proof')

      const registrationResult = await registerForCampaignReal(
        campaign.id,
        wallet.address ?? 'devnet-wallet',
      )

      // Step 2: Attestation verified (real Schnorr check happened inside the proof)
      setStage('checking-attestation')

      // Step 3: Uniqueness verified (real nullifier spend happened on-chain)
      setStage('checking-uniqueness')

      const verificationReceipt: VerificationReceipt = {
        nullifier: `0x${registrationResult.nullifier}`,
        scope: registrationResult.scope,
        sessionId: `tx-${registrationResult.txHash.slice(0, 16)}`,
        issuedAt: new Date().toISOString(),
        expiresAt: registrationResult.expiresAt,
        signature: registrationResult.txHash,
      }

      setReceipt(verificationReceipt)
      setStage('success')
    } catch (err: any) {
      const message = err.message || 'Verification failed'

      // Surface specific failure modes
      if (message.includes('Already used in this campaign')) {
        setStage('error')
        setError('This credential has already been used in this campaign.')
      } else if (message.includes('not initialized')) {
        setStage('error')
        setError('Midnight service is still initializing. Please try again in a moment.')
      } else if (message.includes('Wallet')) {
        setStage('error')
        setError('Wallet rejected the transaction.')
      } else {
        setStage('error')
        setError(message)
      }
    }
  }, [campaign, wallet.address])

  const reset = useCallback(() => {
    setStage('idle')
    setCampaignState(null)
    setReceipt(null)
    setError(null)
    setFaceVerificationStateInternal({
      modelsLoaded: false,
      livenessPassed: false,
      faceDetected: false,
    })
  }, [])

  return (
    <VerificationContext.Provider value={{
      stage,
      campaign,
      receipt,
      error,
      setCampaign,
      startWalletConnect,
      reviewDisclosure,
      startVerification,
      reset,
      faceVerificationState,
      setFaceVerificationState,
    }}>
      {children}
    </VerificationContext.Provider>
  )
}

export function useVerification() {
  const ctx = useContext(VerificationContext)
  if (!ctx) throw new Error('useVerification must be used within VerificationProvider')
  return ctx
}
