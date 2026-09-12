import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { HomePage } from './pages/HomePage'
import { CampaignsListPage } from './pages/CampaignsListPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { JoinWalletPage } from './pages/JoinWalletPage'
import { DisclosureReviewPage } from './pages/DisclosureReviewPage'
import { VerificationPage } from './pages/VerificationPage'
import { SuccessPage } from './pages/SuccessPage'
import { CreateCampaignPage } from './pages/CreateCampaignPage'
import { CampaignCreatedPage } from './pages/CampaignCreatedPage'
import { CampaignDashboardPage } from './pages/CampaignDashboardPage'
import { CampaignManageListPage } from './pages/CampaignManageListPage'
import { RegistrationsPage } from './pages/RegistrationsPage'
import { CampaignSettingsPage } from './pages/CampaignSettingsPage'
import { DAppRequestPage } from './pages/DAppRequestPage'
import { DAppWalletPage } from './pages/DAppWalletPage'
import { DAppDisclosurePage } from './pages/DAppDisclosurePage'
import { DAppVerificationPage } from './pages/DAppVerificationPage'
import { DAppSuccessPage } from './pages/DAppSuccessPage'
import { DAppErrorPage } from './pages/DAppErrorPage'
import { Navigation } from './components/layout/Navigation'
import { DAppNav } from './components/layout/DAppNav'
import { OperatorNav } from './components/layout/OperatorNav'
import { LivingBackground } from './components/three/LivingBackground'
import { CursorTorch } from './components/three/CursorTorch'
import { WalletProvider } from './contexts/WalletContext'
import { VerificationProvider } from './contexts/VerificationContext'
import { DAppVerificationProvider } from './contexts/DAppVerificationContext'
import { OperatorProvider } from './contexts/OperatorContext'
import { CampaignProvider } from './contexts/CampaignContext'
import { OperatorEntryPage } from './pages/OperatorEntryPage'
import { OperatorWorkspacePage } from './pages/OperatorWorkspacePage'
import { DeveloperEntryPage } from './pages/DeveloperEntryPage'
import { DeveloperWorkspacePage } from './pages/DeveloperWorkspacePage'
import { CreateVerificationRequestPage } from './pages/CreateVerificationRequestPage'
import { RequestCreatedPage } from './pages/RequestCreatedPage'
import { RequestDetailsPage } from './pages/RequestDetailsPage'
import { DeveloperNav } from './components/layout/DeveloperNav'
import { DeveloperProvider } from './contexts/DeveloperContext'

function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => lenis.destroy()
  }, [])

  return <>{children}</>
}

function DAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DAppVerificationProvider>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <LivingBackground />
        <DAppNav />
        <main style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </div>
    </DAppVerificationProvider>
  )
}

function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorProvider>
      <CampaignProvider>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <LivingBackground />
          <OperatorNav />
          <main style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </main>
        </div>
      </CampaignProvider>
    </OperatorProvider>
  )
}

function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorProvider>
      <DeveloperProvider>
        <div style={{ position: 'relative', minHeight: '100vh' }}>
          <LivingBackground />
          <DeveloperNav />
          <main style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </main>
        </div>
      </DeveloperProvider>
    </OperatorProvider>
  )
}

function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <LivingBackground />
      <CursorTorch />
      <Navigation />
      <main style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}

const OPERATOR_PATHS = ['/operator', '/campaigns/create', '/campaigns/manage']

function isOperatorRoute(pathname: string) {
  if (OPERATOR_PATHS.some(p => pathname.startsWith(p))) return true
  const match = pathname.match(/^\/campaigns\/[^/]+\/(dashboard|registrations|settings)$/)
  return !!match
}

function isDeveloperRoute(pathname: string) {
  return pathname.startsWith('/developers')
}

export default function App() {
  const location = useLocation()
  const isDAppFlow = location.pathname.startsWith('/dapp')
  const isDeveloper = !isDAppFlow && isDeveloperRoute(location.pathname)
  const isOperator = !isDAppFlow && !isDeveloper && isOperatorRoute(location.pathname)

  return (
    <SmoothScroll>
      <WalletProvider>
        <VerificationProvider>
          {isDAppFlow ? (
            <DAppLayout>
              <Routes>
                <Route path="/dapp/verify" element={<DAppRequestPage />} />
                <Route path="/dapp/:id/wallet" element={<DAppWalletPage />} />
                <Route path="/dapp/:id/disclosure" element={<DAppDisclosurePage />} />
                <Route path="/dapp/:id/verify" element={<DAppVerificationPage />} />
                <Route path="/dapp/:id/success" element={<DAppSuccessPage />} />
                <Route path="/dapp/:id/error" element={<DAppErrorPage />} />
              </Routes>
            </DAppLayout>
          ) : isDeveloper ? (
            <DeveloperLayout>
              <Routes>
                <Route path="/developers" element={<DeveloperEntryPage />} />
                <Route path="/developers/workspace" element={<DeveloperWorkspacePage />} />
                <Route path="/developers/requests/create" element={<CreateVerificationRequestPage />} />
                <Route path="/developers/requests/:id/created" element={<RequestCreatedPage />} />
                <Route path="/developers/requests/:id" element={<RequestDetailsPage />} />
              </Routes>
            </DeveloperLayout>
          ) : isOperator ? (
            <OperatorLayout>
              <Routes>
                <Route path="/operator" element={<OperatorEntryPage />} />
                <Route path="/operator/workspace" element={<OperatorWorkspacePage />} />
                <Route path="/campaigns/create" element={<CreateCampaignPage />} />
                <Route path="/campaigns/created/:id" element={<CampaignCreatedPage />} />
                <Route path="/campaigns/manage" element={<CampaignManageListPage />} />
                <Route path="/campaigns/:id/dashboard" element={<CampaignDashboardPage />} />
                <Route path="/campaigns/:id/registrations" element={<RegistrationsPage />} />
                <Route path="/campaigns/:id/settings" element={<CampaignSettingsPage />} />
              </Routes>
            </OperatorLayout>
          ) : (
            <MarketingLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/how-it-works" element={<HomePage />} />
                <Route path="/campaigns" element={<CampaignsListPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="/campaigns/:id/join" element={<JoinWalletPage />} />
                <Route path="/campaigns/:id/disclosure" element={<DisclosureReviewPage />} />
                <Route path="/campaigns/:id/verify" element={<VerificationPage />} />
                <Route path="/campaigns/:id/success" element={<SuccessPage />} />
              </Routes>
            </MarketingLayout>
          )}
        </VerificationProvider>
      </WalletProvider>
    </SmoothScroll>
  )
}
