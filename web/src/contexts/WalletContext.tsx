import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { WalletState } from '../types'

// ============================================================================
// WalletContext — Midnight wallet connection
//
// PHASE 1 NOTE: This uses a deterministic mock wallet for local devnet.
// The wallet address is derived from a seed (same as e2e-local.ts).
// In production, this would connect to Lace/1AM via the DApp Connector API.
// ============================================================================

interface WalletContextType {
  wallet: WalletState
  connect: (provider: string) => Promise<void>
  disconnect: () => void
  isAvailable: (provider: string) => boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

// Deterministic addresses for devnet wallets (matches e2e-local.ts pattern)
const DEVNET_WALLETS: Record<string, { address: string; balance: string }> = {
  lace: {
    address: 'mn_shielded_test1qr7refxk9z0p3qlj0d8a6c5t2s1m8n4k7j2x5w9',
    balance: '2,500.00',
  },
  '1am': {
    address: 'mn_shielded_test1qz8ahtm4p2k7j3n5w6r9c0s1t3u4v5x8y2m6p1',
    balance: '1,830.75',
  },
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
  })

  const isAvailable = useCallback((_provider: string) => {
    // Both Lace and 1AM are "available" in dev mode
    return true
  }, [])

  const connect = useCallback(async (provider: string) => {
    // Simulate wallet connection delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const devnetWallet = DEVNET_WALLETS[provider]
    if (!devnetWallet) {
      throw new Error(`Unknown wallet provider: ${provider}`)
    }

    setWallet({
      connected: true,
      address: devnetWallet.address,
      provider,
      balance: devnetWallet.balance,
    })
  }, [])

  const disconnect = useCallback(() => {
    setWallet({ connected: false })
  }, [])

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isAvailable }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
