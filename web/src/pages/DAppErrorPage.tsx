import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../contexts/DAppVerificationContext'
import { Button } from '../components/ui/Button'

type ErrorType = 'wallet-rejected' | 'wallet-unavailable' | 'proof-server' | 'expired' | 'invalid' | 'attestation' | 'network' | 'dapp-unavailable'

const ERROR_CONFIG: Record<ErrorType, { title: string; description: string; cta: string; action: 'retry' | 'install' | 'home' }> = {
  'wallet-rejected': {
    title: 'Connection declined',
    description: 'Wallet connection was rejected or timed out.',
    cta: 'Try again',
    action: 'retry',
  },
  'wallet-unavailable': {
    title: 'No Midnight wallet found',
    description: 'You need a Midnight wallet to complete this verification.',
    cta: 'Install Lace',
    action: 'install',
  },
  'proof-server': {
    title: 'Proof server unavailable',
    description: 'Lace needs a local proof server to generate zero-knowledge proofs.',
    cta: 'Open guide',
    action: 'home',
  },
  expired: {
    title: 'Request expired',
    description: 'This verification request is no longer valid.',
    cta: 'Start again',
    action: 'home',
  },
  invalid: {
    title: 'Invalid request',
    description: 'This verification request could not be trusted.',
    cta: 'Return Home',
    action: 'home',
  },
  attestation: {
    title: 'Attestation check failed',
    description: 'The personhood attestation could not be checked.',
    cta: 'Retry',
    action: 'retry',
  },
  network: {
    title: 'Transaction failed',
    description: 'The commitment could not be registered on-chain.',
    cta: 'Retry',
    action: 'retry',
  },
  'dapp-unavailable': {
    title: 'Application unavailable',
    description: 'Verification is complete, but the requesting application could not be reached.',
    cta: 'Return Home',
    action: 'home',
  },
}

export function DAppErrorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stage, request, receipt } = useDAppVerification()

  const errorType: ErrorType = (() => {
    if (stage === 'wallet-rejected') return 'wallet-rejected'
    if (stage === 'wallet-unavailable') return 'wallet-unavailable'
    if (stage === 'proof-server-unavailable') return 'proof-server'
    if (stage === 'request-expired') return 'expired'
    if (stage === 'request-invalid') return 'invalid'
    if (stage === 'attestation-failure') return 'attestation'
    if (stage === 'network-error') return 'network'
    if (stage === 'dapp-unavailable') return 'dapp-unavailable'
    return 'wallet-rejected'
  })()

  const config = ERROR_CONFIG[errorType]

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(201, 122, 114, 0.08)',
            border: '1px solid rgba(201, 122, 114, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-6)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 8V12M12 16V16.01" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="10" stroke="var(--error)" strokeWidth="1.5" />
          </svg>
        </motion.div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-3)',
        }}>
          {config.title}
        </h1>

        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.9375rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-4)',
        }}>
          {config.description}
        </p>

        {request && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-8)',
          }}>
            Requesting application: {request.appName}
          </p>
        )}

        {receipt && (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-6)',
            textAlign: 'left',
          }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Verification receipt
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {receipt.nullifier.slice(0, 20)}...
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              if (config.action === 'retry') {
                navigate(`/dapp/${id}/wallet`)
              } else if (config.action === 'install') {
                window.open('https://lace.io', '_blank')
              } else {
                navigate('/')
              }
            }}
            style={{ width: '100%' }}
          >
            {config.cta}
          </Button>

          {config.action !== 'retry' && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/')}
              style={{ width: '100%' }}
            >
              Return Home
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
