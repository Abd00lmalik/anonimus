import type { DAppRequest } from '../types'

export const mockDAppRequests: DAppRequest[] = [
  {
    id: 'req-governance-001',
    appName: 'Midnight Governance',
    appId: 'midnight-governance',
    scope: 'midnight-governance-v1',
    requestedClaims: ['Verified human', 'Unique within this scope'],
    returnUrl: 'https://governance.midnight.network/verify-callback',
    sessionId: 'sess-gov-abc123',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-grants-002',
    appName: 'Privacy Grants Portal',
    appId: 'privacy-grants',
    scope: 'privacy-grants-round1',
    requestedClaims: ['Verified human', 'Unique within this scope'],
    returnUrl: 'https://grants.midnight.network/auth/complete',
    sessionId: 'sess-grant-def456',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'req-alpha-003',
    appName: 'Midnight Alpha',
    appId: 'midnight-alpha',
    scope: 'alpha-tester-access',
    requestedClaims: ['Verified human', 'Unique within this scope'],
    returnUrl: 'https://alpha.midnight.network/callback',
    sessionId: 'sess-alpha-ghi789',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  },
]

export function getDAppRequest(id: string): DAppRequest | undefined {
  return mockDAppRequests.find(r => r.id === id)
}

export function getDAppRequestByScope(scope: string): DAppRequest | undefined {
  return mockDAppRequests.find(r => r.scope === scope)
}
