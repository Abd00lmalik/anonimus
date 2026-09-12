import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDeveloper } from '../contexts/DeveloperContext'
import { Button } from '../components/ui/Button'

export function RequestCreatedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRequest, loadRequest } = useDeveloper()

  useEffect(() => {
    if (id) loadRequest(id)
  }, [id, loadRequest])

  if (!currentRequest) return null

  const embedUrl = `https://verify.anonimus.network/dapp/verify?req=${currentRequest.id}&scope=${currentRequest.scope}`

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
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="var(--success)" strokeWidth="1.5" />
              <path d="M22 32L28 38L42 24" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            Request created
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            Your verification request for <strong style={{ color: 'var(--text-primary)' }}>{currentRequest.appName}</strong> is active.
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
          }}>API Key</h3>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--accent)',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            wordBreak: 'break-all',
          }}>
            {currentRequest.apiKey}
          </div>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-3)',
            lineHeight: 1.5,
          }}>
            Use this key to verify receipts server-side. Do not expose it in client-side code.
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
          }}>Embed URL</h3>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            wordBreak: 'break-all',
            lineHeight: 1.6,
          }}>
            {embedUrl}
          </div>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-3)',
            lineHeight: 1.5,
          }}>
            Redirect users to this URL to initiate verification. They will be returned to your callback URL with a signed receipt.
          </p>
        </div>

        <div style={{
          background: 'rgba(198, 163, 90, 0.06)',
          border: '1px solid rgba(198, 163, 90, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M8 2L14 13H2L8 2Z" stroke="var(--accent)" strokeWidth="1" fill="none" />
              <path d="M8 6V9M8 11V11.5" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>
                Next steps
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                1. Embed the URL in your DApp<br />
                2. Users verify and return to your callback<br />
                3. Verify the signed receipt using the Anonimus public key
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="primary" size="lg" onClick={() => navigate('/developers/workspace')} style={{ flex: 1 }}>
            View Workspace
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate(`/developers/requests/${currentRequest.id}`)} style={{ flex: 1 }}>
            View Request
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
