import type { Campaign, ManagedCampaign, Registration, CampaignCreateInput } from '../types'

// ── Mock Managed Campaigns ──

export const managedCampaigns: ManagedCampaign[] = [
  {
    id: 'anonimus-genesis',
    title: 'Anonimus Genesis',
    organizer: 'Anonimus DAO',
    purpose: 'Access to the private governance forum. One vote per verified human.',
    status: 'live',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: '2026-12-31',
    featured: true,
    description: 'The foundational governance round for Anonimus DAO.',
    whyRequired: 'Sybil resistance ensures fair governance.',
    eligibility: ['Must hold a Midnight wallet', 'Personhood attestation required'],
    scope: 'anonimus-genesis-v1',
    startDate: '2026-09-01',
    registrations: 1284,
    createdAt: '2026-08-15T10:00:00Z',
    purposeType: 'community',
  },
  {
    id: 'privacy-grants',
    title: 'Privacy Grants Round 1',
    organizer: 'Anonimus Foundation',
    purpose: 'Apply for grants to build privacy-preserving tools on Midnight.',
    status: 'live',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: '2026-11-15',
    description: 'The first round of privacy-focused grants.',
    whyRequired: 'Grants must go to verified humans.',
    eligibility: ['Must hold a Midnight wallet', 'Personhood attestation required'],
    scope: 'privacy-grants-r1',
    startDate: '2026-09-10',
    registrations: 423,
    createdAt: '2026-09-01T14:30:00Z',
    purposeType: 'airdrop',
  },
]

// ── Mock Registrations ──

const generateRegistrations = (campaignId: string, count: number): Registration[] => {
  return Array.from({ length: count }, (_, i) => {
    const addr = `addr_test1q${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursAgo = Math.floor(Math.random() * 24)
    return {
      id: `reg-${campaignId}-${i + 1}`,
      campaignId,
      walletHandle: addr,
      registeredAt: new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString(),
      verificationStatus: Math.random() > 0.05 ? 'verified' : Math.random() > 0.5 ? 'pending' : 'failed',
      commitmentRef: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    }
  })
}

let registrationsStore: Registration[] = [
  ...generateRegistrations('anonimus-genesis', 1284),
  ...generateRegistrations('privacy-grants', 423),
]

// ── Operations ──

export function getManagedCampaigns(): ManagedCampaign[] {
  return managedCampaigns
}

export function getManagedCampaignById(id: string): ManagedCampaign | undefined {
  return managedCampaigns.find(c => c.id === id)
}

export function createManagedCampaign(input: CampaignCreateInput): ManagedCampaign {
  const id = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const newCampaign: ManagedCampaign = {
    id,
    title: input.title,
    organizer: input.organizer,
    description: input.description,
    purpose: input.purpose,
    status: 'live',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: input.endDate,
    scope: input.scope,
    startDate: input.startDate,
    registrations: 0,
    createdAt: new Date().toISOString(),
    purposeType: input.purposeType,
  }

  managedCampaigns.push(newCampaign)
  return newCampaign
}

export function getCampaignRegistrations(campaignId: string): Registration[] {
  return registrationsStore.filter(r => r.campaignId === campaignId)
}

export function getRegistrationCount(campaignId: string): number {
  return registrationsStore.filter(r => r.campaignId === campaignId && r.verificationStatus === 'verified').length
}

export function exportWalletHandles(campaignId: string): { walletHandle: string; registeredAt: string }[] {
  return registrationsStore
    .filter(r => r.campaignId === campaignId && r.verificationStatus === 'verified')
    .map(r => ({ walletHandle: r.walletHandle, registeredAt: r.registeredAt }))
}

export function campaignToManaged(campaign: Campaign): ManagedCampaign {
  const managed = managedCampaigns.find(c => c.id === campaign.id)
  if (managed) return managed
  return {
    ...campaign,
    scope: `${campaign.id}-scope`,
    startDate: '2026-09-01',
    registrations: 0,
    createdAt: new Date().toISOString(),
    purposeType: 'community',
  }
}
