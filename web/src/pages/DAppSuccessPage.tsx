import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../contexts/DAppVerificationContext'
import { Button } from '../components/ui/Button'

function BlankSignet() {
  return (
    <div style={{ width: 120, height: 120, margin: '0 auto' }}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="dapp-signet-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C6A35A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C6A35A" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="url(#dapp-signet-fill)" stroke="#C6A35A" strokeWidth="1" />
        <circle cx="60" cy="60" r="40" stroke="#C6A35A" strokeWidth="0.5" strokeDasharray="50 5" opacity="0.4" />
        <circle cx="60" cy="60" r="54" stroke="#C6A35A" strokeWidth="0.5" opacity="0.2" />
      </svg>
    </div>
  )
}

export function DAppSuccessPage() {
  const navigate = useNavigate()
  const { request, receipt } = useDAppVerification()

  useEffect(() => {
    if (!request || !receipt) {
      navigate('/dapp/verify')
    }
  }, [request, receipt, navigate])

  if (!request || !receipt) return null

  const shortNullifier = `${receipt.nullifier.slice(0, 10)}...${receipt.nullifier.slice(-8)}`

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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 'var(--space-6)' }}
          >
            <BlankSignet />
          </motion.div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 'var(--space-3)',
          }}>
            Verified for
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            {request.appName}
          </h1>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ margin: '0 auto var(--space-2)' }}>
                <circle cx="10" cy="10" r="8" stroke="var(--success)" strokeWidth="1.5" />
                <path d="M7 10L9 12L13 8" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Verified human
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ margin: '0 auto var(--space-2)' }}>
                <circle cx="10" cy="10" r="8" stroke="var(--success)" strokeWidth="1.5" />
                <path d="M7 10L9 12L13 8" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Unique within scope
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ margin: '0 auto var(--space-2)' }}>
                <circle cx="10" cy="10" r="8" stroke="var(--success)" strokeWidth="1.5" />
                <path d="M7 10L9 12L13 8" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Verification confirmed
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Verification Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Status', value: 'Verified', color: 'var(--success)' },
              { label: 'Request', value: request.id, mono: true },
              { label: 'Scope', value: receipt.scope },
              { label: 'Time', value: new Date(receipt.issuedAt).toLocaleString() },
              { label: 'Expires', value: new Date(receipt.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Nullifier', value: shortNullifier, mono: true },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: row.mono ? 'var(--font-mono)' : 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  color: row.color || 'var(--text-primary)',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(143, 191, 154, 0.06)',
          border: '1px solid rgba(143, 191, 154, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="8" cy="8" r="6" stroke="var(--success)" strokeWidth="1" />
              <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--success)', marginBottom: 'var(--space-1)' }}>
                Returning to {request.appName}
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your verification receipt will be sent to {request.appName}. They can verify it using the Anonimus public key without learning your identity.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            if (request.returnUrl && request.returnUrl !== '#') {
              window.location.href = request.returnUrl
            } else {
              navigate('/')
            }
          }}
          style={{ width: '100%' }}
        >
          Return to {request.appName}
        </Button>
      </motion.div>
    </div>
  )
}
