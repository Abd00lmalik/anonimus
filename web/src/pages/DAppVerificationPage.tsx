import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDAppVerification } from '../contexts/DAppVerificationContext'
import { useWallet } from '../contexts/WalletContext'

function VerificationStep({ label, status, delay }: { label: string; status: 'pending' | 'active' | 'done' | 'error'; delay?: number }) {
  const colors = {
    pending: 'var(--text-muted)',
    active: 'var(--accent)',
    done: 'var(--success)',
    error: 'var(--error)',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay || 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `1.5px solid ${colors[status]}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: status === 'done' ? 'rgba(143, 191, 154, 0.1)' : status === 'active' ? 'rgba(198, 163, 90, 0.1)' : 'transparent',
      }}>
        {status === 'done' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 6L5 8L9 4" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === 'active' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1.5s linear infinite' }}>
            <circle cx="6" cy="6" r="4" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="20 5" />
          </svg>
        )}
        {status === 'error' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 4L8 8M8 4L4 8" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.875rem',
        color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
        fontWeight: status === 'active' ? 500 : 400,
      }}>
        {label}
      </span>
    </motion.div>
  )
}

function VeiledCore() {
  return (
    <div style={{
      width: 200,
      height: 200,
      position: 'relative',
      margin: '0 auto',
    }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        <defs>
          <radialGradient id="dapp-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="80" fill="url(#dapp-core-glow)" />

        <g style={{ animation: 'spin 20s linear infinite', transformOrigin: '100px 100px' }}>
          <polygon
            points="100,30 160,70 160,130 100,170 40,130 40,70"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.4"
          />
          <polygon
            points="100,50 140,75 140,125 100,150 60,125 60,75"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.5"
            opacity="0.25"
          />
        </g>

        <g style={{ animation: 'spin 12s linear infinite reverse', transformOrigin: '100px 100px' }}>
          <polygon
            points="100,45 150,72 150,128 100,155 50,128 50,72"
            fill="none"
            stroke="var(--accent-hover)"
            strokeWidth="0.8"
            opacity="0.3"
            strokeDasharray="4 6"
          />
        </g>

        <circle cx="100" cy="100" r="6" fill="var(--accent)" opacity="0.6">
          <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
        </circle>

        <circle cx="100" cy="100" r="18" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.2" strokeDasharray="2 4">
          <animateTransform attributeName="transform" type="rotate" values="0 100 100;360 100 100" dur="25s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

export function DAppVerificationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stage, request, startVerification } = useDAppVerification()
  const { wallet } = useWallet()

  useEffect(() => {
    if (!request) {
      navigate('/dapp/verify')
      return
    }
    if (stage === 'wallet-connected' || stage === 'disclosure-review') {
      startVerification()
    }
  }, [stage, request, navigate, startVerification])

  if (!request) return null

  const steps = [
    { label: 'Preparing credential', key: 'preparing' },
    { label: 'Generating zero-knowledge proof', key: 'generating-proof' },
    { label: 'Checking attestation validity', key: 'checking-attestation' },
    { label: 'Verifying uniqueness', key: 'checking-uniqueness' },
    { label: 'Registering on-chain', key: 'registering' },
  ]

  const stageOrder = ['preparing', 'generating-proof', 'checking-attestation', 'checking-uniqueness', 'registering', 'success']
  const currentIdx = stageOrder.indexOf(stage)

  if (stage === 'success') {
    navigate(`/dapp/${id}/success`)
    return null
  }

  if (stage === 'error' || stage === 'attestation-failure' || stage === 'network-error') {
    return (
      <div style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--error)',
            marginBottom: 'var(--space-4)',
          }}>
            {stage === 'attestation-failure'
              ? 'Attestation check failed'
              : stage === 'network-error'
                ? 'Transaction failed'
                : 'Verification failed'}
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-8)',
            lineHeight: 1.6,
          }}>
            {stage === 'attestation-failure'
              ? 'The personhood attestation could not be checked.'
              : stage === 'network-error'
                ? 'The commitment could not be registered on-chain.'
                : 'Something went wrong during verification.'}
          </p>
          <button
            onClick={() => navigate(`/dapp/${id}/wallet`)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              padding: '12px 24px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 'var(--space-3)',
          }}>
            Step 3 of 4, Generating Proof
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            Verifying your personhood
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-2)',
          }}>
            This may take a moment. Your proof is being generated locally.
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            Verifying for <span style={{ color: 'var(--text-primary)' }}>{request.appName}</span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-8)',
          marginBottom: 'var(--space-8)',
        }}>
          <VeiledCore />
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5) var(--space-6)',
        }}>
          <AnimatePresence mode="wait">
            {steps.map((step, i) => {
              const stepIdx = stageOrder.indexOf(step.key)
              let status: 'pending' | 'active' | 'done' = 'pending'
              if (currentIdx > stepIdx) status = 'done'
              else if (currentIdx === stepIdx || (currentIdx === -1 && i === 0)) status = 'active'

              return (
                <VerificationStep
                  key={step.key}
                  label={step.label}
                  status={status}
                  delay={i * 0.05}
                />
              )
            })}
          </AnimatePresence>
        </div>

        {wallet.connected && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-6)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" fill="var(--success)" />
            </svg>
            Wallet: {wallet.address}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
