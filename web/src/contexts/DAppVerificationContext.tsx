import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DAppRequest, DAppVerificationStage, VerificationReceipt } from '../types'
import { useWallet } from './WalletContext'

interface DAppVerificationContextType {
  stage: DAppVerificationStage
  request: DAppRequest | null
  receipt: VerificationReceipt | null
  error: string | null
  loadRequest: (req: DAppRequest) => void
  startWalletConnect: (provider: string) => Promise<void>
  reviewDisclosure: () => void
  startVerification: () => Promise<void>
  reset: () => void
}

const DAppVerificationContext = createContext<DAppVerificationContextType | null>(null)

export function DAppVerificationProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<DAppVerificationStage>('request-loading')
  const [request, setRequest] = useState<DAppRequest | null>(null)
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { connect } = useWallet()

  const loadRequest = useCallback((req: DAppRequest) => {
    if (new Date(req.expiresAt) < new Date()) {
      setStage('request-expired')
      setError('This verification request has expired.')
      return
    }
    setRequest(req)
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
      setError('Wallet connection was declined.')
    }
  }, [connect])

  const reviewDisclosure = useCallback(() => {
    setStage('disclosure-review')
  }, [])

  const startVerification = useCallback(async () => {
    if (!request) return

    setStage('preparing')
    await new Promise(r => setTimeout(r, 1200))

    setStage('generating-proof')
    await new Promise(r => setTimeout(r, 2400))

    setStage('checking-attestation')
    await new Promise(r => setTimeout(r, 1800))

    setStage('checking-uniqueness')
    await new Promise(r => setTimeout(r, 1600))

    setStage('registering')
    await new Promise(r => setTimeout(r, 1000))

    const mockReceipt: VerificationReceipt = {
      nullifier: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      scope: request.scope,
      sessionId: request.sessionId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      signature: `0x${Array.from({ length: 128 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    }
    setReceipt(mockReceipt)
    setStage('success')
  }, [request])

  const reset = useCallback(() => {
    setStage('request-loading')
    setRequest(null)
    setReceipt(null)
    setError(null)
  }, [])

  return (
    <DAppVerificationContext.Provider value={{
      stage,
      request,
      receipt,
      error,
      loadRequest,
      startWalletConnect,
      reviewDisclosure,
      startVerification,
      reset,
    }}>
      {children}
    </DAppVerificationContext.Provider>
  )
}

export function useDAppVerification() {
  const ctx = useContext(DAppVerificationContext)
  if (!ctx) throw new Error('useDAppVerification must be used within DAppVerificationProvider')
  return ctx
}
