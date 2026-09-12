import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOperator, type OperatorAuthStage } from '../contexts/OperatorContext'
import { Button } from '../components/ui/Button'

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

function ConnectingState({ provider }: { provider: string }) {
  const wallet = WALLETS.find(w => w.id === provider)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center' }}
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
      }}>Connecting to {wallet?.name || provider}</h2>
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.9375rem',
        color: 'var(--text-muted)',
      }}>
        Confirm the connection in your wallet extension.
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

function RejectedState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center' }}
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
        {error}
      </p>
      <Button variant="primary" size="md" onClick={onRetry}>
        Try again
      </Button>
    </motion.div>
  )
}

function UnavailableState({ error }: { error: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center' }}
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
        {error}
      </p>
    </motion.div>
  )
}

function IdleState({ onConnect, connectingProvider }: { onConnect: (id: string) => void; connectingProvider: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
        {/* Signet token mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ marginBottom: 'var(--space-8)' }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke="#C6A35A" strokeWidth="1.2" strokeDasharray="180 22" />
            <circle cx="40" cy="40" r="28" stroke="#C6A35A" strokeWidth="0.5" opacity="0.3" />
          </svg>
        </motion.div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 400,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-4)',
          letterSpacing: '-0.01em',
        }}>
          Build with Anonimus
        </h1>
        <p style={{
          fontSize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
          color: 'var(--text-muted)',
          maxWidth: 480,
          lineHeight: 1.7,
          margin: '0 auto',
        }}>
          Create verification campaigns and let people prove they are human
          without exposing their identity.
        </p>
      </div>

      {/* How it works */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-10)',
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
            { step: '3', text: 'People prove humanity privately — you receive proof of uniqueness' },
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

      {/* Privacy guarantee */}
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
            You receive proof of uniqueness — nothing more.
          </p>
        </div>
      </div>

      {/* Wallet selection */}
      <h3 style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.9375rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-4)',
      }}>Connect your wallet</h3>
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
              padding: 'var(--space-5) var(--space-6)',
              background: 'var(--bg-surface)',
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
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

export function OperatorEntryPage() {
  const navigate = useNavigate()
  const { stage, operator, error, connect, retry } = useOperator()
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  // Redirect to workspace if already connected
  if (stage === 'connected' && operator) {
    navigate('/operator/workspace', { replace: true })
    return null
  }

  const handleConnect = async (provider: string) => {
    setSelectedWallet(provider)
    await connect(provider)
    // If connection succeeded, navigate will happen via the stage check above
  }

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      {stage === 'connecting' ? (
        <ConnectingState provider={selectedWallet || ''} />
      ) : stage === 'rejected' || stage === 'session-expired' ? (
        <RejectedState error={error || 'Connection was declined.'} onRetry={retry} />
      ) : stage === 'unavailable' ? (
        <UnavailableState error={error || 'Wallet connection is unavailable.'} />
      ) : (
        <IdleState onConnect={handleConnect} connectingProvider={stage === 'connecting' ? selectedWallet : null} />
      )}
    </div>
  )
}
