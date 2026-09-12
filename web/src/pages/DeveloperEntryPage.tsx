import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOperator } from '../contexts/OperatorContext'
import { Button } from '../components/ui/Button'

function ApiKeyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="18" width="32" height="12" rx="3" stroke="#C6A35A" strokeWidth="1.2" fill="none" />
      <circle cx="20" cy="24" r="2" stroke="#C6A35A" strokeWidth="0.8" />
      <circle cx="28" cy="24" r="2" stroke="#C6A35A" strokeWidth="0.8" />
      <circle cx="36" cy="24" r="1.5" stroke="#C6A35A" strokeWidth="0.8" />
      <path d="M24 10V18M24 10L20 14M24 10L28 14" stroke="#C6A35A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DeveloperEntryPage() {
  const navigate = useNavigate()
  const { stage, operator } = useOperator()

  if (stage === 'connected' && operator) {
    navigate('/developers/workspace', { replace: true })
    return null
  }

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
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
            style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'center' }}
          >
            <ApiKeyIcon />
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
            Developer Workspace
          </h1>
          <p style={{
            fontSize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
            color: 'var(--text-muted)',
            maxWidth: 480,
            lineHeight: 1.7,
            margin: '0 auto',
          }}>
            Create verification requests for your DApp. Users verify their humanity
            privately — you receive a signed receipt proving uniqueness.
          </p>
        </div>

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
          }}>How integration works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {[
              { step: '1', text: 'Create a verification request with your scope and return URL' },
              { step: '2', text: 'Embed the Anonimus verification link in your DApp' },
              { step: '3', text: 'Users verify privately — you receive a signed cryptographic receipt' },
              { step: '4', text: 'Verify the receipt server-side using the Anonimus public key' },
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
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--success)', marginBottom: 'var(--space-1)' }}>
                Privacy by design
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                You will never see participant identities, biometrics, or wallet private keys.
                You receive proof of uniqueness — nothing more.
              </p>
            </div>
          </div>
        </div>

        {stage !== 'connected' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-4)',
            }}>
              Connect your project wallet first.
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/operator')} style={{ width: '100%' }}>
              Connect Wallet
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" onClick={() => navigate('/developers/workspace')} style={{ width: '100%' }}>
            Enter Workspace
          </Button>
        )}
      </motion.div>
    </div>
  )
}
