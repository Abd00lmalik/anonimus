import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperator } from '../../contexts/OperatorContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Logo } from '../ui/Logo'

const NETWORK_ID = 'preprod'

const FALLBACK_WALLETS: Record<string, { name: string; icon: string; installUrl: string }> = {
  lace: { name: 'Lace', icon: '/wallets/lace.svg', installUrl: 'https://chromewebstore.google.com/detail/lace-beta/hgeekaiplokcnmakghbdfbgnlfheichg' },
  '1am': { name: '1AM Wallet', icon: '/wallets/1am.svg', installUrl: 'https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp' },
}

interface DetectedWallet {
  key: string
  name: string
  icon: string
  api: any
  installUrl: string
}

function discoverWallets(): DetectedWallet[] {
  const midnight = (window as any).midnight
  if (!midnight || typeof midnight !== 'object') return []

  const wallets: DetectedWallet[] = []
  const seen = new Set<string>()

  for (const key of ['mnLace', 'lace', '1am']) {
    const api = midnight[key]
    if (api && typeof api === 'object' && typeof api.connect === 'function' && !seen.has(key)) {
      const fallback = FALLBACK_WALLETS[key] || FALLBACK_WALLETS['lace']
      wallets.push({ key, name: api.name || fallback.name, icon: api.icon || fallback.icon, api, installUrl: fallback.installUrl })
      seen.add(key)
    }
  }

  for (const [key, api] of Object.entries(midnight)) {
    if (seen.has(key)) continue
    const a = api as any
    if (a && typeof a === 'object' && typeof a.connect === 'function' && a.name) {
      wallets.push({ key, name: a.name, icon: a.icon || `/wallets/${key}.svg`, api: a, installUrl: '#' })
      seen.add(key)
    }
  }

  return wallets
}

function WalletModal({ open, onClose, onConnect, connectingKey, error }: {
  open: boolean
  onClose: () => void
  onConnect: (wallet: DetectedWallet) => void
  connectingKey: string | null
  error: string | null
}) {
  const [wallets, setWallets] = useState<DetectedWallet[]>([])

  useEffect(() => {
    if (open) setWallets(discoverWallets())
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(7, 8, 10, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-8)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-8)',
              maxWidth: 420,
              width: '100%',
              maxHeight: 'min(80vh, 560px)',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 'var(--space-4)',
                right: 'var(--space-4)',
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                Sign in
              </h2>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Your wallet is a handle for this project. It is not your name.
              </p>
            </div>

            {wallets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                  No Midnight wallet on this origin
                </p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
                  Install a wallet extension to sign in.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {Object.entries(FALLBACK_WALLETS).map(([key, fb]) => (
                    <a key={key} href={fb.installUrl} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                      padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      textDecoration: 'none', transition: 'all var(--duration-fast) var(--ease-out)',
                    }}>
                      <img src={fb.icon} alt="" style={{ width: 32, height: 32, borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          Install {fb.name}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)' }}>
                        <path d="M4 10L10 4M10 4H5M10 4V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {wallets.map((w) => {
                  const isConnecting = connectingKey === w.key
                  return (
                    <motion.button
                      key={w.key}
                      whileHover={connectingKey ? undefined : { scale: 1.01 }}
                      whileTap={connectingKey ? undefined : { scale: 0.99 }}
                      onClick={() => onConnect(w)}
                      disabled={connectingKey !== null}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                        padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                        cursor: connectingKey ? 'not-allowed' : 'pointer',
                        opacity: connectingKey && !isConnecting ? 0.4 : 1,
                        textAlign: 'left', width: '100%',
                        transition: 'all var(--duration-fast) var(--ease-out)',
                      }}
                    >
                      <img src={w.icon} alt="" style={{ width: 32, height: 32, borderRadius: 6 }}
                        onError={(e) => {
                          const fb = FALLBACK_WALLETS[w.key] || FALLBACK_WALLETS['lace']
                          if (fb && e.currentTarget.src !== window.location.origin + fb.icon) e.currentTarget.src = fb.icon
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>{w.name}</div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Midnight wallet</div>
                      </div>
                      {isConnecting && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="28 8" />
                        </svg>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}

            {error && (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--error)', textAlign: 'center', marginTop: 'var(--space-4)', lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function deriveProjectName(address: string): string {
  return address.slice(0, 12) + '…'
}

export function OperatorNav() {
  const navigate = useNavigate()
  const { operator, stage, setIdentity, disconnect } = useOperator()
  const { theme } = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [connectingKey, setConnectingKey] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const handleConnect = useCallback(async (wallet: DetectedWallet) => {
    setConnectingKey(wallet.key)
    setModalError(null)
    try {
      const connected = await wallet.api.connect(NETWORK_ID)
      const shieldedAddresses = await connected.getShieldedAddresses()
      const address = shieldedAddresses.shieldedAddress

      setIdentity({
        walletAddress: address,
        projectName: deriveProjectName(address),
        connectedAt: new Date().toISOString(),
        provider: wallet.key,
      })

      setConnectingKey(null)
      setModalOpen(false)
    } catch (err: any) {
      setConnectingKey(null)
      const msg = err?.message || String(err)
      if (msg.includes('cancelled') || msg.includes('rejected') || msg.includes('declined')) {
        setModalError('Connection was declined. Please try again.')
      } else if (msg.includes('network') || msg.includes('Network')) {
        setModalError(`This wallet is on a different Midnight network. ${msg}`)
      } else {
        setModalError(msg || 'Connection failed. Please try again.')
      }
    }
  }, [setIdentity])

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: 'blur(16px)',
        background: theme === 'dark' ? 'rgba(7, 8, 10, 0.5)' : 'rgba(244, 240, 232, 0.8)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 var(--space-8)',
        height: 'var(--nav-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Logo size={28} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
            ANONIMUS
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }} className="operator-nav-links">
          <Link to="/" style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 400, letterSpacing: '0.04em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            transition: 'color var(--duration-fast) var(--ease-out)',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >Home</Link>

          {stage === 'connected' && operator ? (
            <>
              <Link to="/operator/workspace" style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 400, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >Dashboard</Link>
              <button onClick={() => navigate('/campaigns/create')} style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 400, letterSpacing: '0.04em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >Create Campaign</button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
                {operator.walletAddress.slice(0, 6)}...{operator.walletAddress.slice(-4)}
              </span>
              <button onClick={() => { disconnect(); navigate('/') }} style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.75rem', fontWeight: 500, height: 32, padding: '0 12px',
                borderRadius: 'var(--radius-sm)', background: 'transparent',
                border: '1px solid var(--border)', color: 'var(--text-muted)',
                transition: 'all var(--duration-fast) var(--ease-out)', cursor: 'pointer',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >Disconnect</button>
            </>
          ) : (
            <button onClick={() => { setModalOpen(true); setModalError(null) }} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 500, height: 44, padding: '0 20px',
              borderRadius: 'var(--radius-sm)', background: 'transparent',
              border: '1px solid rgba(243, 238, 228, 0.16)', color: 'var(--text-primary)',
              transition: 'all var(--duration-fast) var(--ease-out)', letterSpacing: '0.02em', cursor: 'pointer',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(243, 238, 228, 0.16)'; e.currentTarget.style.background = 'transparent' }}
            >Sign in</button>
          )}
        </div>

        <button className="operator-mobile-btn" style={{
          display: 'none', width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
        }} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              : <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      <WalletModal open={modalOpen} onClose={() => { setModalOpen(false); setModalError(null) }}
        onConnect={handleConnect} connectingKey={connectingKey} error={modalError} />

      <style>{`
        @media (max-width: 768px) {
          .operator-nav-links { display: none !important; }
          .operator-mobile-btn { display: flex !important; }
        }
      `}</style>
    </motion.nav>
  )
}
