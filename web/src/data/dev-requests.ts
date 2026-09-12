import type { DevRequest, DevRequestCreateInput } from '../types'

export const mockDevRequests: DevRequest[] = [
  {
    id: 'dev-req-001',
    appId: 'midnight-governance',
    appName: 'Midnight Governance',
    scope: 'midnight-governance-v1',
    description: 'Verify unique human participants for governance voting.',
    returnUrl: 'https://governance.midnight.network/verify-callback',
    requestedClaims: ['Verified human', 'Unique within this scope'],
    apiKey: 'dev_pk_governance_a1b2c3d4e5f6',
    status: 'active',
    verifications: 847,
    maxVerifications: 10000,
    createdAt: '2026-08-20T10:00:00Z',
    expiresAt: '2027-02-20T10:00:00Z',
  },
  {
    id: 'dev-req-002',
    appId: 'privacy-grants',
    appName: 'Privacy Grants Portal',
    scope: 'privacy-grants-round2',
    description: 'Unique applicant verification for the second grants round.',
    returnUrl: 'https://grants.midnight.network/auth/complete',
    requestedClaims: ['Verified human', 'Unique within this scope'],
    apiKey: 'dev_pk_grants_x7y8z9w0',
    status: 'active',
    verifications: 213,
    maxVerifications: null,
    createdAt: '2026-09-01T14:30:00Z',
    expiresAt: '2026-12-01T14:30:00Z',
  },
  {
    id: 'dev-req-003',
    appId: 'midnight-alpha',
    appName: 'Midnight Alpha',
    scope: 'alpha-tester-v2',
    description: 'Verify alpha testers before granting early access.',
    returnUrl: 'https://alpha.midnight.network/callback',
    requestedClaims: ['Verified human'],
    apiKey: 'dev_pk_alpha_m3n4o5p6',
    status: 'paused',
    verifications: 312,
    maxVerifications: 500,
    createdAt: '2026-07-15T08:00:00Z',
    expiresAt: '2026-10-15T08:00:00Z',
  },
]

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const id = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `dev_pk_${id}`
}

function generateAppId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
}

export function getDevRequests(): DevRequest[] {
  return mockDevRequests
}

export function getDevRequestById(id: string): DevRequest | undefined {
  return mockDevRequests.find(r => r.id === id)
}

export function createDevRequest(input: DevRequestCreateInput): DevRequest {
  const id = `dev-req-${Date.now().toString(36)}`
  const appId = generateAppId(input.appName)
  const apiKey = generateApiKey()

  const request: DevRequest = {
    id,
    appId,
    appName: input.appName,
    scope: input.scope,
    description: input.description,
    returnUrl: input.returnUrl,
    requestedClaims: input.requestedClaims,
    apiKey,
    status: 'active',
    verifications: 0,
    maxVerifications: input.maxVerifications,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + input.expiresInDays * 86400000).toISOString(),
  }

  mockDevRequests.push(request)
  return request
}

export function updateDevRequestStatus(id: string, status: DevRequest['status']): DevRequest | undefined {
  const request = mockDevRequests.find(r => r.id === id)
  if (request) request.status = status
  return request
}

export function deleteDevRequest(id: string): boolean {
  const idx = mockDevRequests.findIndex(r => r.id === id)
  if (idx === -1) return false
  mockDevRequests.splice(idx, 1)
  return true
}
