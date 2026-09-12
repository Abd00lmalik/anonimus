import type { Campaign } from '../types'

export const campaigns: Campaign[] = [
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
    description: 'The foundational governance round for Anonimus DAO. Verified humans can propose and vote on treasury allocations, protocol upgrades, and community initiatives.',
    whyRequired: 'Sybil resistance ensures fair governance. Each verified human gets exactly one vote, preventing whale dominance and bot-driven manipulation.',
    eligibility: [
      'Must hold a Midnight wallet (Lace or 1AM)',
      'Personhood attestation required (freshness < 6 months)',
      'Not previously registered in this campaign',
    ],
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
    description: 'The first round of privacy-focused grants. Build tools, protocols, or applications that enhance user privacy on the Midnight network.',
    whyRequired: 'Grants must go to verified humans to prevent sybil draining of the fund. Each applicant can submit one proposal.',
    eligibility: [
      'Must hold a Midnight wallet (Lace or 1AM)',
      'Personhood attestation required',
      'Must submit a project proposal',
    ],
  },
  {
    id: 'midnight-alpha',
    title: 'Midnight Alpha Testers',
    organizer: 'Midnight Labs',
    purpose: 'Early access to unreleased Midnight features. Test and provide feedback.',
    status: 'ending-soon',
    uniqueness: 'application-scoped',
    requirement: 'Personhood attestation + invite code',
    deadline: '2026-10-01',
    description: 'Join the alpha testing program for upcoming Midnight features. Test new capabilities before they go live and shape the roadmap with your feedback.',
    whyRequired: 'Alpha access is limited to verified humans to ensure quality feedback and prevent automated scraping of unreleased features.',
    eligibility: [
      'Must hold a Midnight wallet (Lace or 1AM)',
      'Personhood attestation required',
      'Invite code required',
    ],
  },
  {
    id: 'community-rsvp',
    title: 'Community Town Hall',
    organizer: 'Anonimus Community',
    purpose: 'RSVP for the monthly community town hall. One seat per human.',
    status: 'live',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: '2026-09-30',
    description: 'Monthly community call where verified humans discuss progress, vote on priorities, and coordinate community initiatives.',
    whyRequired: 'Prevents bot-driven RSVPs that could overwhelm the venue capacity. One human = one seat.',
    eligibility: [
      'Must hold a Midnight wallet (Lace or 1AM)',
      'Personhood attestation required',
    ],
  },
]

export function getCampaignById(id: string): Campaign | undefined {
  return campaigns.find(c => c.id === id)
}
