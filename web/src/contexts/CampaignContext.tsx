import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
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
// CampaignContext — campaign CRUD via real backend API
// ============================================================================

interface CampaignContextType {
  campaigns: ManagedCampaign[]
  currentCampaign: ManagedCampaign | null
  registrations: Registration[]
  loadCampaigns: () => Promise<void>
  loadCampaign: (id: string) => Promise<void>
  createCampaign: (input: CampaignCreateInput) => Promise<ManagedCampaign>
  loadRegistrations: (campaignId: string) => Promise<void>
  getExportData: (campaignId: string) => Promise<{ walletHandle: string; registeredAt: string }[]>
}

const CampaignContext = createContext<CampaignContextType | null>(null)

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

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<ManagedCampaign[]>([])
  const [currentCampaign, setCurrentCampaign] = useState<ManagedCampaign | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])

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
    // Need creator wallet — get from operator session or use default
    const session = localStorage.getItem('anonimus-operator-session')
    const creatorWallet = session
      ? JSON.parse(session).walletAddress
      : 'mn_shielded_test1...default'

    const created = await createCampaignApi({
      title: input.title,
      organizer: input.organizer,
      description: input.description,
      purpose: input.purpose,
      scope: input.scope,
      startDate: input.startDate,
      endDate: input.endDate,
      purposeType: input.purposeType,
      creatorWallet,
    })

    const managed = apiCampaignToManaged(created)
    setCampaigns(prev => [...prev, managed])
    return managed
  }, [])

  const loadRegistrations = useCallback(async (campaignId: string) => {
    try {
      const { registrations: apiRegs } = await fetchRegistrations(campaignId)
      setRegistrations(apiRegs.map(r => ({
        id: r.id,
        campaignId: r.campaignId,
        walletHandle: r.walletHandle,
        registeredAt: r.registeredAt,
        verificationStatus: 'verified' as const,
        commitmentRef: r.commitmentRef,
      })))
    } catch (err) {
      console.error('Failed to load registrations:', err)
    }
  }, [])

  const getExportData = useCallback(async (campaignId: string) => {
    try {
      const { registrations: apiRegs } = await fetchRegistrations(campaignId)
      return apiRegs.map(r => ({ walletHandle: r.walletHandle, registeredAt: r.registeredAt }))
    } catch {
      return []
    }
  }, [])

  return (
    <CampaignContext.Provider value={{
      campaigns,
      currentCampaign,
      registrations,
      loadCampaigns,
      loadCampaign,
      createCampaign,
      loadRegistrations,
      getExportData,
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider')
  return ctx
}
