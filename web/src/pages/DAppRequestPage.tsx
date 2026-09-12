import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../contexts/DAppVerificationContext'
import { getDAppRequest } from '../data/dapp-requests'
import { Button } from '../components/ui/Button'

function AppIcon({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2)
  return (
    <div style={{
      width: 56,
      height: 56,
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: '1.125rem',
      fontWeight: 600,
      color: 'var(--accent)',
      letterSpacing: '0.04em',
    }}>
      {initials}
    </div>
  )
}

export function DAppRequestPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { stage, request, loadRequest, error } = useDAppVerification()

  useEffect(() => {
    const reqId = searchParams.get('req') || searchParams.get('request')
    if (reqId) {
      const found = getDAppRequest(reqId)
      if (found) {
        loadRequest(found)
      } else {
        loadRequest({
          id: reqId,
          appName: 'External Application',
          appId: reqId,
          scope: `dapp-${reqId}`,
          requestedClaims: ['Verified human', 'Unique within this scope'],
          returnUrl: '#',
          sessionId: `sess-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
      }
    } else {
      const found = getDAppRequest('req-governance-001')
      if (found) loadRequest(found)
    }
  }, [searchParams, loadRequest])

  useEffect(() => {
    if (stage === 'wallet-required' && request) {
      navigate(`/dapp/${request.id}/wallet`)
    }
  }, [stage, request, navigate])

  if (stage === 'request-expired') {
    return (
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Request expired
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-8)',
          }}>
            This verification request is no longer valid. Please return to the application and try again.
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </motion.div>
      </div>
    )
  }

  if (!request) {
    return (
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Invalid request
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-8)',
          }}>
            This verification request could not be trusted.
          </p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Return Home
          </Button>
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
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}
          >
            <AppIcon name={request.appName} />
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            lineHeight: 1.2,
          }}>
            Verify for{' '}
            <span style={{ color: 'var(--accent)' }}>{request.appName}</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            {request.appName} wants to verify that you are a human.
          </p>
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
            This request will establish
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {request.requestedClaims.map((claim, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1" />
                  <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}>
                  {claim}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(198, 163, 90, 0.06)',
          border: '1px solid rgba(198, 163, 90, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M8 2L14 13H2L8 2Z" stroke="var(--accent)" strokeWidth="1" fill="none" />
              <path d="M8 6V9M8 11V11.5" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>
                Privacy boundary
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Anonimus verifies the request without exposing your identity. Your wallet is used only as a session handle.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
          Scope: {request.scope}
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--error)',
            background: 'rgba(201, 122, 114, 0.08)',
            border: '1px solid rgba(201, 122, 114, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/dapp/${request.id}/wallet`)}
            style={{ flex: 1 }}
          >
            Continue
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              if (request.returnUrl && request.returnUrl !== '#') {
                window.location.href = request.returnUrl
              } else {
                navigate('/')
              }
            }}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
