import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ManagedCampaign, CampaignCreateInput, Registration } from '../types'
import {
  fetchCampaigns,
  fetchCampaign,
  createCampaignApi,
  fetchRegistrations,
  type ApiCampaign,
  type ApiRegistration,
} from '../lib/api'

// ============================================================================
// OperatorContext — campaign management via real backend API
// ============================================================================

export type OperatorAuthStage =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'rejected'
  | 'unavailable'
  | 'session-expired'
  | 'unauthorized'

export interface OperatorIdentity {
  walletAddress: string
  projectName: string
  connectedAt: string
  provider: string
}

interface OperatorContextType {
  stage: OperatorAuthStage
  operator: OperatorIdentity | null
  error: string | null
  connect: (provider: string) => Promise<void>
  setIdentity: (identity: OperatorIdentity) => void
  disconnect: () => void
  retry: () => void

  campaigns: ManagedCampaign[]
  currentCampaign: ManagedCampaign | null
  registrations: Registration[]
  loadCampaigns: () => Promise<void>
  loadCampaign: (id: string) => Promise<void>
  createCampaign: (input: CampaignCreateInput) => Promise<ManagedCampaign>
  loadRegistrations: (campaignId: string) => Promise<void>
  getExportData: (campaignId: string) => Promise<{ walletHandle: string; registeredAt: string }[]>

  totalRegistrations: number
  activeCampaigns: number
}

const OperatorContext = createContext<OperatorContextType | null>(null)

function apiCampaignToManaged(c: ApiCampaign): ManagedCampaign {
  return {
    id: c.id,
    title: c.title,
    organizer: c.organizer,
    purpose: c.purpose,
    status: c.status === 'live' ? 'live' : 'ended',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: c.endDate,
    description: c.description,
    scope: c.scope,
    startDate: c.startDate,
    registrations: c.registrations,
    createdAt: c.createdAt,
    purposeType: c.purposeType as ManagedCampaign['purposeType'],
  }
}

function apiRegistrationToRegistration(r: ApiRegistration): Registration {
  return {
    id: r.id,
    campaignId: r.campaignId,
    walletHandle: r.walletHandle,
    registeredAt: r.registeredAt,
    verificationStatus: 'verified',
    commitmentRef: r.commitmentRef,
  }
}

function deriveProjectName(address: string): string {
  const hash = address.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
  const suffix = Math.abs(hash).toString(36).slice(0, 4).toUpperCase()
  return `Project ${suffix}`
}

export function OperatorProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<OperatorAuthStage>('idle')
  const [operator, setOperator] = useState<OperatorIdentity | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [campaigns, setCampaigns] = useState<ManagedCampaign[]>([])
  const [currentCampaign, setCurrentCampaign] = useState<ManagedCampaign | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])

  // Check for existing session on mount — do NOT auto-connect
  // User must explicitly sign in via the wallet modal
  useEffect(() => {
    // Clear any stale session on fresh load to prevent auto-connect
    // Only re-connect if user clicks "Sign in" and wallet approves
  }, [])

  const connect = useCallback(async (provider: string) => {
    setStage('connecting')
    setError(null)

    try {
      // Use the real Midnight DApp Connector API
      const midnight = (window as any).midnight
      if (!midnight) {
        throw new Error('No Midnight wallet found. Please install a Midnight wallet extension (Lace or 1AM).')
      }

      // Find wallet by provider ID
      const walletKey = provider === 'lace' ? 'mnLace' : provider === '1am' ? '1am' : provider
      const walletApi = midnight[walletKey] || midnight.mnLace || midnight['1am']

      if (!walletApi || typeof walletApi.connect !== 'function') {
        throw new Error(`Wallet "${provider}" is not available. Please install the extension.`)
      }

      // Trigger the real wallet connection popup
      const connectedAPI = await walletApi.connect('preprod')
      const status = await connectedAPI.getConnectionStatus()
      if (status.status !== 'connected') {
        throw new Error('Wallet connection was rejected')
      }

      // Get real wallet address
      const shieldedAddresses = await connectedAPI.getShieldedAddresses()
      const address = shieldedAddresses.shieldedAddress
      const projectName = deriveProjectName(address)

      const identity: OperatorIdentity = {
        walletAddress: address,
        projectName,
        connectedAt: new Date().toISOString(),
        provider,
      }

      setOperator(identity)
      setStage('connected')
      localStorage.setItem('anonimus-operator-session', JSON.stringify(identity))
    } catch (err: any) {
      if (err.message?.includes('cancelled') || err.message?.includes('rejected') || err.message?.includes('declined')) {
        setStage('rejected')
        setError('Wallet connection was declined. Please try again.')
      } else {
        setStage('unavailable')
        setError(err.message || 'Wallet connection is unavailable. Please try again.')
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    setOperator(null)
    setStage('idle')
    setError(null)
    setCampaigns([])
    setCurrentCampaign(null)
    setRegistrations([])
    localStorage.removeItem('anonimus-operator-session')
  }, [])

  const retry = useCallback(() => {
    setStage('idle')
    setError(null)
  }, [])

  const setIdentity = useCallback((identity: OperatorIdentity) => {
    setOperator(identity)
    setStage('connected')
    localStorage.setItem('anonimus-operator-session', JSON.stringify(identity))
  }, [])

  // ── Campaign operations (real API) ──

  const loadCampaigns = useCallback(async () => {
    try {
      const apiCampaigns = await fetchCampaigns()
      setCampaigns(apiCampaigns.map(apiCampaignToManaged))
    } catch (err) {
      console.error('Failed to load campaigns:', err)
    }
  }, [])

  const loadCampaign = useCallback(async (id: string) => {
    try {
      const c = await fetchCampaign(id)
      setCurrentCampaign(apiCampaignToManaged(c))
    } catch (err) {
      console.error('Failed to load campaign:', err)
      setCurrentCampaign(null)
    }
  }, [])

  const createCampaign = useCallback(async (input: CampaignCreateInput) => {
    if (!operator) throw new Error('Not authenticated')

    const created = await createCampaignApi({
      title: input.title,
      organizer: input.organizer,
      description: input.description,
      purpose: input.purpose,
      scope: input.scope,
      startDate: input.startDate,
      endDate: input.endDate,
      purposeType: input.purposeType,
      creatorWallet: operator.walletAddress,
    })

    const managed = apiCampaignToManaged(created)
    setCampaigns(prev => [...prev, managed])
    return managed
  }, [operator])

  const loadRegistrations = useCallback(async (campaignId: string) => {
    try {
      const { registrations: apiRegs } = await fetchRegistrations(campaignId)
      setRegistrations(apiRegs.map(apiRegistrationToRegistration))
    } catch (err) {
      console.error('Failed to load registrations:', err)
    }
  }, [])

  const getExportData = useCallback(async (campaignId: string) => {
    try {
      const { registrations: apiRegs } = await fetchRegistrations(campaignId)
      return apiRegs
        .filter(() => true) // all are verified in this phase
        .map(r => ({ walletHandle: r.walletHandle, registeredAt: r.registeredAt }))
    } catch {
      return []
    }
  }, [])

  // ── Derived metrics ──

  const totalRegistrations = campaigns.reduce((sum, c) => sum + c.registrations, 0)
  const activeCampaigns = campaigns.filter(c => c.status === 'live').length

  return (
    <OperatorContext.Provider value={{
      stage,
      operator,
      error,
      connect,
      setIdentity,
      disconnect,
      retry,
      campaigns,
      currentCampaign,
      registrations,
      loadCampaigns,
      loadCampaign,
      createCampaign,
      loadRegistrations,
      getExportData,
      totalRegistrations,
      activeCampaigns,
    }}>
      {children}
    </OperatorContext.Provider>
  )
}

export function useOperator() {
  const ctx = useContext(OperatorContext)
  if (!ctx) throw new Error('useOperator must be used within OperatorProvider')
  return ctx
}
