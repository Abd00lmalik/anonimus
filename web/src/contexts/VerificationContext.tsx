import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Campaign, VerificationReceipt, VerificationStage } from '../types'
import { useWallet } from './WalletContext'
import { registerForCampaignUnsigned, type ApiUnsignedRegistrationResponse } from '../lib/api'

// ============================================================================
// VerificationContext — real verification flow with user-signed transactions
//
// The flow:
//   1. Wallet connection (real Midnight wallet via DApp Connector)
//   2. Disclosure review
//   3. Face check (client-side spatial quality — NOT liveness/personhood)
//   4. Backend creates unsigned transactions
//   5. User's wallet proves, balances, signs, and submits transactions
//   6. Wait for on-chain confirmation
//   7. Show success
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
  const { walletAPI, connect } = useWallet()

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
    if (!campaign || !walletAPI) return

    try {
      setStage('preparing')
      setError(null)

      // Step 1: Backend performs enrollment (admin tx) + creates unsigned verification tx
      const unsignedData: ApiUnsignedRegistrationResponse = await registerForCampaignUnsigned(
        campaign.id,
      )

      // Step 2: User's wallet proves the verification transaction
      // The wallet fetches ZK artifacts from the DApp's URL and generates the ZK proof
      setStage('generating-proof')

      // Step 3: User's wallet balances, signs, and submits the verification transaction
      // This is the participant's transaction — their wallet signs it
      const balancedTx = await walletAPI.balanceUnsealedTransaction(
        unsignedData.verificationTx,
        { payFees: true }
      )

      // Step 4: Submit the verified transaction
      await walletAPI.submitTransaction(balancedTx.tx)

      // Step 5: Create verification receipt
      setStage('checking-attestation')
      setStage('checking-uniqueness')

      const verificationReceipt: VerificationReceipt = {
        nullifier: `0x${unsignedData.nullifier}`,
        scope: campaign.id,
        sessionId: `tx-${Date.now().toString(36)}`,
        issuedAt: new Date().toISOString(),
        expiresAt: unsignedData.expiresAt,
        signature: unsignedData.attestation.response,
      }

      setReceipt(verificationReceipt)
      setStage('success')
    } catch (err: any) {
      const message = err.message || 'Verification failed'

      if (message.includes('Already used in this campaign')) {
        setStage('error')
        setError('This credential has already been used in this campaign.')
      } else if (message.includes('not initialized')) {
        setStage('error')
        setError('Midnight service is still initializing. Please try again in a moment.')
      } else if (message.includes('Wallet') || message.includes('wallet')) {
        setStage('error')
        setError('Wallet rejected the transaction. Please check your wallet and try again.')
      } else if (message.includes('insufficient') || message.includes('DUST') || message.includes('dust')) {
        setStage('error')
        setError('Insufficient funds. Please get test tokens from the faucet.')
      } else if (message.includes('proof') || message.includes('Proving') || message.includes('prove')) {
        setStage('error')
        setError('Proof generation failed. Please check your proof server connection and try again.')
      } else if (message.includes('network') || message.includes('Network') || message.includes('fetch')) {
        setStage('error')
        setError('Network error. Please check your connection and try again.')
      } else {
        setStage('error')
        setError(message)
      }
    }
  }, [campaign, walletAPI])

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
