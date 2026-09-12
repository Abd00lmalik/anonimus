import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDeveloper } from '../contexts/DeveloperContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const statusVariant: Record<string, 'success' | 'warning' | 'muted' | 'accent'> = {
  active: 'success',
  paused: 'warning',
  expired: 'muted',
  draft: 'accent',
}

export function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentRequest, loadRequest, toggleStatus, deleteRequest } = useDeveloper()
  const [copied, setCopied] = useState<'key' | 'url' | null>(null)

  useEffect(() => {
    if (id) loadRequest(id)
  }, [id, loadRequest])

  if (!currentRequest) {
    return (
      <div style={{
        maxWidth: 560,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
          }}>Request not found</h1>
          <Button variant="secondary" onClick={() => navigate('/developers/workspace')}>
            Back to Workspace
          </Button>
        </motion.div>
      </div>
    )
  }

  const embedUrl = `https://verify.anonimus.network/dapp/verify?req=${currentRequest.id}&scope=${currentRequest.scope}`

  const handleCopy = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = () => {
    if (window.confirm('Delete this verification request? This cannot be undone.')) {
      deleteRequest(currentRequest.id)
      navigate('/developers/workspace')
    }
  }

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}>{currentRequest.appName}</h1>
            <Badge variant={statusVariant[currentRequest.status]}>
              {currentRequest.status}
            </Badge>
          </div>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            {currentRequest.description}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}>
          {[
            { label: 'Verifications', value: currentRequest.verifications.toLocaleString(), color: 'var(--accent)' },
            { label: 'Limit', value: currentRequest.maxVerifications ? currentRequest.maxVerifications.toLocaleString() : 'Unlimited', color: 'var(--text-primary)' },
            { label: 'Scope', value: currentRequest.scope, color: 'var(--text-secondary)', mono: true },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
              }}
            >
              <div style={{
                fontFamily: metric.mono ? 'var(--font-mono)' : 'var(--font-display)',
                fontSize: metric.mono ? '0.75rem' : 'clamp(1.25rem, 2.5vw, 1.5rem)',
                color: metric.color,
                lineHeight: 1,
                marginBottom: 'var(--space-1)',
                wordBreak: 'break-all',
              }}>{metric.value}</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>{metric.label}</div>
            </motion.div>
          ))}
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
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <div style={{
              flex: 1,
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
            <Button variant="ghost" size="sm" onClick={() => handleCopy(currentRequest.apiKey, 'key')}>
              {copied === 'key' ? 'Copied' : 'Copy'}
            </Button>
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
          }}>Embed URL</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <div style={{
              flex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3) var(--space-4)',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              {embedUrl}
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(embedUrl, 'url')}>
              {copied === 'url' ? 'Copied' : 'Copy'}
            </Button>
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
          }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Return URL', value: currentRequest.returnUrl },
              { label: 'Claims', value: currentRequest.requestedClaims.join(', ') },
              { label: 'Created', value: new Date(currentRequest.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Expires', value: new Date(currentRequest.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  textAlign: 'right',
                  wordBreak: 'break-all',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <Button
            variant={currentRequest.status === 'active' ? 'secondary' : 'primary'}
            size="md"
            onClick={() => toggleStatus(currentRequest.id)}
          >
            {currentRequest.status === 'active' ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="ghost" size="md" onClick={handleDelete} style={{ color: 'var(--error)' }}>
            Delete
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="md" onClick={() => navigate('/developers/workspace')}>
            Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
