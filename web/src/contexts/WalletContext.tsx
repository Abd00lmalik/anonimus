import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { WalletState, MidnightInitialAPI, MidnightConnectedAPI } from '../types'

// ============================================================================
// WalletContext — Midnight DApp Connector wallet connection
//
// This uses the real Midnight DApp Connector API (v4.0.1) to connect
// to the user's browser wallet (Lace, 1AM, etc.).
//
// The wallet handles:
// - ZK proof generation (via proof server)
// - Transaction balancing
// - Transaction signing
// - Transaction submission
//
// The backend NEVER signs the participant's transaction.
// ============================================================================

interface WalletContextType {
  wallet: WalletState
  /** The connected wallet API - needed for transaction operations */
  walletAPI: MidnightConnectedAPI | null
  connect: (provider: string) => Promise<void>
  disconnect: () => void
  isAvailable: (provider: string) => boolean
  /** Get list of available wallet providers */
  getAvailableWallets: () => MidnightInitialAPI[]
}

const WalletContext = createContext<WalletContextType | null>(null)

/** Compatible DApp Connector API version */
const COMPATIBLE_API_VERSION = '^4.0'

/**
 * Check if a wallet's API version is compatible
 */
function isVersionCompatible(walletVersion: string, expectedRange: string): boolean {
  // Simple semver check for major version match
  const major = parseInt(walletVersion.split('.')[0] ?? '0', 10)
  const expectedMajor = parseInt(expectedRange.replace('^', '').split('.')[0] ?? '0', 10)
  return major === expectedMajor
}

/**
 * Get all available Midnight wallets from window.midnight
 */
function getAvailableWallets(): MidnightInitialAPI[] {
  if (typeof window === 'undefined' || !window.midnight) {
    return []
  }

  return Object.values(window.midnight).filter(
    (w): w is MidnightInitialAPI =>
      !!w &&
      typeof w === 'object' &&
      'name' in w &&
      'apiVersion' in w &&
      'connect' in w &&
      isVersionCompatible((w as MidnightInitialAPI).apiVersion, COMPATIBLE_API_VERSION)
  )
}

/**
 * Get wallet provider ID from name or key
 */
function getWalletProviderId(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('lace')) return 'lace'
  if (lower.includes('1am') || lower.includes('1am')) return '1am'
  return lower.replace(/\s+/g, '-')
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
  })
  const [walletAPI, setWalletAPI] = useState<MidnightConnectedAPI | null>(null)
  const [availableWallets, setAvailableWallets] = useState<MidnightInitialAPI[]>([])

  // Detect available wallets on mount and when window.midnight changes
  useEffect(() => {
    const detectWallets = () => {
      const wallets = getAvailableWallets()
      setAvailableWallets(wallets)
    }

    detectWallets()

    // Poll for wallet injection (extensions inject after DOMContentLoaded)
    const interval = setInterval(detectWallets, 1000)
    const timeout = setTimeout(() => clearInterval(interval), 10000) // Stop after 10s

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  const isAvailable = useCallback((_provider: string) => {
    return availableWallets.length > 0
  }, [availableWallets])

  const getAvailableWalletsFn = useCallback(() => {
    return availableWallets
  }, [availableWallets])

  const connect = useCallback(async (provider: string) => {
    // Find the wallet by provider ID or name
    const walletToConnect = availableWallets.find(w => {
      const id = getWalletProviderId(w.name)
      return id === provider || w.name.toLowerCase().includes(provider.toLowerCase())
    })

    if (!walletToConnect) {
      // Try the legacy keys (window.midnight.mnLace, window.midnight['1am'])
      const legacyWallet = (window as any).midnight?.mnLace ||
                          (window as any).midnight?.['1am']
      if (legacyWallet && legacyWallet.connect) {
        try {
          const connectedAPI = await legacyWallet.connect('preprod')
          const status = await connectedAPI.getConnectionStatus()

          if (status.status !== 'connected') {
            throw new Error('Wallet disconnected')
          }

          // Get wallet info
          const shieldedAddresses = await connectedAPI.getShieldedAddresses()
          const dustBalance = await connectedAPI.getDustBalance()

          setWalletAPI(connectedAPI)
          setWallet({
            connected: true,
            address: shieldedAddresses.shieldedAddress,
            provider: legacyWallet.name ?? provider,
            coinPublicKey: shieldedAddresses.shieldedCoinPublicKey,
            encryptionPublicKey: shieldedAddresses.shieldedEncryptionPublicKey,
            dustBalance: dustBalance.balance,
          })
          return
        } catch (err: any) {
          throw new Error(err.message || 'Wallet connection failed')
        }
      }

      throw new Error(`No wallet found for provider: ${provider}. Please install a Midnight wallet extension.`)
    }

    try {
      // Connect to the wallet
      const connectedAPI = await walletToConnect.connect('preprod')

      // Verify connection
      const status = await connectedAPI.getConnectionStatus()
      if (status.status !== 'connected') {
        throw new Error('Wallet disconnected')
      }

      // Get wallet info
      const shieldedAddresses = await connectedAPI.getShieldedAddresses()
      const dustBalance = await connectedAPI.getDustBalance()

      setWalletAPI(connectedAPI)
      setWallet({
        connected: true,
        address: shieldedAddresses.shieldedAddress,
        provider: walletToConnect.name,
        coinPublicKey: shieldedAddresses.shieldedCoinPublicKey,
        encryptionPublicKey: shieldedAddresses.shieldedEncryptionPublicKey,
        dustBalance: dustBalance.balance,
      })
    } catch (err: any) {
      if (err.message?.includes('cancelled') || err.message?.includes('rejected')) {
        throw new Error('Wallet connection was rejected')
      }
      throw new Error(err.message || 'Wallet connection failed')
    }
  }, [availableWallets])

  const disconnect = useCallback(() => {
    setWalletAPI(null)
    setWallet({ connected: false })
  }, [])

  return (
    <WalletContext.Provider value={{
      wallet,
      walletAPI,
      connect,
      disconnect,
      isAvailable,
      getAvailableWallets: getAvailableWalletsFn,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

// Extend Window interface for Midnight wallet
declare global {
  interface Window {
    midnight?: Record<string, MidnightInitialAPI>
  }
}
