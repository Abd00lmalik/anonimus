import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useOperator } from '../../contexts/OperatorContext'
import { Logo } from '../ui/Logo'

const WALLETS = [
  {
    id: 'lace',
    name: 'Lace',
    description: 'Lightweight wallet for Midnight',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1a1a2e" />
        <circle cx="16" cy="16" r="10" stroke="#C6A35A" strokeWidth="1.5" />
        <path d="M12 16L16 12L20 16L16 20Z" stroke="#C6A35A" strokeWidth="1" fill="none" />
      </svg>
    ),
  },
  {
    id: '1am',
    name: '1AM Wallet',
    description: 'Privacy-first Midnight wallet',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1a1a2e" />
        <text x="16" y="20" textAnchor="middle" fill="#C6A35A" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">1A</text>
      </svg>
    ),
  },
]

function WalletModal({ open, onClose, onConnect, connectingProvider }: {
  open: boolean
  onClose: () => void
  onConnect: (id: string) => void
  connectingProvider: string | null
}) {
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {WALLETS.map(wallet => (
                <motion.button
                  key={wallet.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onConnect(wallet.id)}
                  disabled={connectingProvider !== null}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: connectingProvider ? 'not-allowed' : 'pointer',
                    opacity: connectingProvider && connectingProvider !== wallet.id ? 0.4 : 1,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all var(--duration-fast) var(--ease-out)',
                  }}
                >
                  {wallet.icon}
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {wallet.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {wallet.description}
                    </div>
                  </div>
                  {connectingProvider === wallet.id && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }}>
                      <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="28 8" />
                    </svg>
                  )}
                </motion.button>
              ))}
            </div>

            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: 'var(--space-6)',
              lineHeight: 1.5,
            }}>
              No Midnight wallet found?{' '}
              <a
                href="https://docs.midnight.network/wallets"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationColor: 'var(--accent-muted)' }}
              >
                Install one
              </a>
            </p>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OperatorNav() {
  const navigate = useNavigate()
  const { operator, stage, connect } = useOperator()
  const [modalOpen, setModalOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  const handleConnect = async (provider: string) => {
    setConnectingProvider(provider)
    await connect(provider)
    setConnectingProvider(null)
    setModalOpen(false)
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        background: 'rgba(7, 8, 10, 0.5)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--space-8)',
        height: 'var(--nav-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Logo size={28} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
          }}>
            ANONIMUS
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }} className="operator-nav-links">
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Home
          </Link>

          {stage === 'connected' && operator ? (
            <>
              <Link
                to="/operator/workspace"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  transition: 'color var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Dashboard
              </Link>
              <button
                onClick={() => navigate('/campaigns/create')}
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  transition: 'color var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Create Campaign
              </button>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.02em',
              }}>
                {operator.walletAddress.slice(0, 6)}...{operator.walletAddress.slice(-4)}
              </span>
            </>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                height: 44,
                padding: '0 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid rgba(243, 238, 228, 0.16)',
                color: 'var(--text-primary)',
                transition: 'all var(--duration-fast) var(--ease-out)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243, 238, 228, 0.16)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Sign in
            </button>
          )}
        </div>

        <button
          className="operator-mobile-btn"
          style={{
            display: 'none',
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? (
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnect={handleConnect}
        connectingProvider={connectingProvider}
      />

      <style>{`
        @media (max-width: 768px) {
          .operator-nav-links { display: none !important; }
          .operator-mobile-btn { display: flex !important; }
        }
      `}</style>
    </motion.nav>
  )
}
