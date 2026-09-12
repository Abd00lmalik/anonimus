import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DevRequest, DevRequestCreateInput, DevRequestStatus } from '../types'
import {
  mockDevRequests,
  getDevRequests,
  getDevRequestById,
  createDevRequest,
  updateDevRequestStatus,
  deleteDevRequest,
} from '../data/dev-requests'

interface DeveloperContextType {
  requests: DevRequest[]
  currentRequest: DevRequest | null
  loadRequests: () => void
  loadRequest: (id: string) => void
  createRequest: (input: DevRequestCreateInput) => DevRequest
  toggleStatus: (id: string) => void
  deleteRequest: (id: string) => void

  // Derived metrics
  totalVerifications: number
  activeRequests: number
  totalRequests: number
}

const DeveloperContext = createContext<DeveloperContextType | null>(null)

export function DeveloperProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<DevRequest[]>([])
  const [currentRequest, setCurrentRequest] = useState<DevRequest | null>(null)

  const loadRequests = useCallback(() => {
    setRequests(getDevRequests())
  }, [])

  const loadRequest = useCallback((id: string) => {
    setCurrentRequest(getDevRequestById(id) || null)
  }, [])

  const createRequest = useCallback((input: DevRequestCreateInput) => {
    const created = createDevRequest(input)
    setRequests(prev => [...prev, created])
    return created
  }, [])

  const toggleStatus = useCallback((id: string) => {
    const req = mockDevRequests.find(r => r.id === id)
    if (!req) return
    const next: DevRequestStatus = req.status === 'active' ? 'paused' : 'active'
    updateDevRequestStatus(id, next)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: next } : r))
    setCurrentRequest(prev => prev?.id === id ? { ...prev, status: next } : prev)
  }, [])

  const deleteRequest = useCallback((id: string) => {
    deleteDevRequest(id)
    setRequests(prev => prev.filter(r => r.id !== id))
    setCurrentRequest(prev => prev?.id === id ? null : prev)
  }, [])

  const totalVerifications = requests.reduce((sum, r) => sum + r.verifications, 0)
  const activeRequests = requests.filter(r => r.status === 'active').length
  const totalRequests = requests.length

  return (
    <DeveloperContext.Provider value={{
      requests,
      currentRequest,
      loadRequests,
      loadRequest,
      createRequest,
      toggleStatus,
      deleteRequest,
      totalVerifications,
      activeRequests,
      totalRequests,
    }}>
      {children}
    </DeveloperContext.Provider>
  )
}

export function useDeveloper() {
  const ctx = useContext(DeveloperContext)
  if (!ctx) throw new Error('useDeveloper must be used within DeveloperProvider')
  return ctx
}
