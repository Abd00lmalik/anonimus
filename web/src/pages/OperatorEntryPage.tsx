import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperator } from '../contexts/OperatorContext'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

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
  if (!midnight || typeof midnight !== 'object') {
    console.log('[anonimus] window.midnight is missing — no wallet extension detected')
    return []
  }

  console.log('[anonimus] window.midnight keys:', Object.keys(midnight))

  const wallets: DetectedWallet[] = []
  const seen = new Set<string>()

  // 1. Try friendly keys first
  for (const key of ['mnLace', 'lace', '1am']) {
    const api = midnight[key]
    if (api && typeof api === 'object' && typeof api.connect === 'function' && !seen.has(key)) {
      const fallback = FALLBACK_WALLETS[key] || FALLBACK_WALLETS['lace']
      wallets.push({
        key,
        name: api.name || fallback.name,
        icon: api.icon || fallback.icon,
        api,
        installUrl: fallback.installUrl,
      })
      seen.add(key)
    }
  }

  // 2. Scan all values for unknown wallets
  for (const [key, api] of Object.entries(midnight)) {
    if (seen.has(key)) continue
    const a = api as any
    if (a && typeof a === 'object' && typeof a.connect === 'function' && a.name) {
      wallets.push({
        key,
        name: a.name,
        icon: a.icon || `/wallets/${key}.svg`,
        api: a,
        installUrl: '#',
      })
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
    if (open) {
      setWallets(discoverWallets())
    }
  }, [open])

  return (
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
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: 440,
              width: '100%',
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
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-2)',
              }}>
                Sign in
              </h2>
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}>
                Your wallet is a handle for this project. It is not your name.
              </p>
            </div>

            {wallets.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-8) 0',
              }}>
                <p style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-4)',
                }}>
                  No Midnight wallet found
                </p>
                <p style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-6)',
                  lineHeight: 1.5,
                }}>
                  Install a wallet extension to sign in.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {Object.entries(FALLBACK_WALLETS).map(([key, fb]) => (
                    <a
                      key={key}
                      href={fb.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4) var(--space-5)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        transition: 'all var(--duration-fast) var(--ease-out)',
                      }}
                    >
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4) var(--space-5)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: connectingKey ? 'not-allowed' : 'pointer',
                        opacity: connectingKey && !isConnecting ? 0.4 : 1,
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all var(--duration-fast) var(--ease-out)',
                      }}
                    >
                      <img
                        src={w.icon}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: 6 }}
                        onError={(e) => {
                          // If icon URL fails, try fallback
                          const fb = FALLBACK_WALLETS[w.key] || FALLBACK_WALLETS['lace']
                          if (fb && e.currentTarget.src !== fb.icon) {
                            e.currentTarget.src = fb.icon
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {w.name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Midnight wallet
                        </div>
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
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--error)',
                textAlign: 'center',
                marginTop: 'var(--space-4)',
                lineHeight: 1.5,
              }}>
                {error}
              </p>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OperatorEntryPage() {
  const navigate = useNavigate()
  const { stage, operator, connect } = useOperator()
  const [modalOpen, setModalOpen] = useState(false)
  const [connectingKey, setConnectingKey] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  if (stage === 'connected' && operator) {
    navigate('/operator/workspace', { replace: true })
    return null
  }

  const handleConnect = useCallback(async (wallet: DetectedWallet) => {
    setConnectingKey(wallet.key)
    setModalError(null)

    try {
      // connect() is the FIRST statement — no await before it
      const connectedApi = await wallet.api.connect(NETWORK_ID)
      const status = await connectedApi.getConnectionStatus()
      if (status.status !== 'connected') {
        throw new Error('Wallet connection was rejected')
      }

      setConnectingKey(null)
      setModalOpen(false)

      // Use the context's connect which will handle state + storage
      await connect(wallet.key)
    } catch (err: any) {
      setConnectingKey(null)
      if (err?.message?.includes('cancelled') || err?.message?.includes('rejected') || err?.message?.includes('declined')) {
        setModalError('Connection was declined. Please try again.')
      } else {
        setModalError(err?.message || 'Connection failed. Please try again.')
      }
    }
  }, [connect])

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      {/* Idle state: sign-in gate */}
      {stage === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ marginBottom: 'var(--space-6)' }}
            >
              <Logo size={64} />
            </motion.div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 400,
              lineHeight: 1.1,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-4)',
              letterSpacing: '-0.01em',
            }}>
              Operator Dashboard
            </h1>
            <p style={{
              fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
              color: 'var(--text-muted)',
              maxWidth: 440,
              lineHeight: 1.7,
              margin: '0 auto',
            }}>
              Create verification campaigns and let people prove they are human,
              without exposing their identity.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-8)',
            marginBottom: 'var(--space-6)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-6)',
            }}>How it works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {[
                { step: '1', text: 'Connect your Midnight wallet to establish your project identity' },
                { step: '2', text: 'Create a verification scope for your community' },
                { step: '3', text: 'People prove humanity privately, you receive proof of uniqueness' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--accent)',
                    background: 'var(--accent-muted)',
                    borderRadius: 'var(--radius-sm)',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 500,
                  }}>
                    {item.step}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.9375rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    paddingTop: 2,
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(143, 191, 154, 0.04)',
            border: '1px solid rgba(143, 191, 154, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6" stroke="var(--success)" strokeWidth="1" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--success)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Verified does not mean identified.</strong>{' '}
                You will never see participant names, biometrics, or identities.
                You receive proof of uniqueness, nothing more.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Button size="lg" onClick={() => { setModalOpen(true); setModalError(null) }}>
              Sign in with Midnight
            </Button>
          </div>
        </motion.div>
      )}

      {/* Connecting */}
      {stage === 'connecting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', paddingTop: 'var(--space-24)' }}
        >
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto var(--space-6)',
            borderRadius: '50%',
            background: 'var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
              <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="50 14" />
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}>Connecting to wallet</h2>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-muted)',
          }}>
            Confirm the connection in your wallet extension.
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}

      {/* Rejected */}
      {(stage === 'rejected' || stage === 'session-expired') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', paddingTop: 'var(--space-24)' }}
        >
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto var(--space-6)',
            borderRadius: '50%',
            background: 'rgba(201, 122, 114, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="var(--error)" strokeWidth="1.5" />
              <path d="M10 10L18 18M18 10L10 18" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}>Connection declined</h2>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-6)',
            maxWidth: 400,
            margin: '0 auto var(--space-6)',
            lineHeight: 1.6,
          }}>
            Connection was declined. Please try again.
          </p>
          <Button variant="primary" size="md" onClick={() => { setModalOpen(true); setModalError(null) }}>
            Try again
          </Button>
        </motion.div>
      )}

      {/* Unavailable */}
      {stage === 'unavailable' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', paddingTop: 'var(--space-24)' }}
        >
          <div style={{
            width: 64,
            height: 64,
            margin: '0 auto var(--space-6)',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M14 9V15" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="14" cy="18" r="1" fill="var(--text-muted)" />
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}>Connection unavailable</h2>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-muted)',
            maxWidth: 400,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Wallet connection is unavailable. Please install a Midnight wallet.
          </p>
        </motion.div>
      )}

      <WalletModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalError(null) }}
        onConnect={handleConnect}
        connectingKey={connectingKey}
        error={modalError}
      />
    </div>
  )
}
