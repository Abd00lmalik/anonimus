import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOperator } from '../contexts/OperatorContext'
import { useDeveloper } from '../contexts/DeveloperContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

const statusVariant: Record<string, 'success' | 'warning' | 'muted' | 'accent'> = {
  active: 'success',
  paused: 'warning',
  expired: 'muted',
  draft: 'accent',
}

export function DeveloperWorkspacePage() {
  const navigate = useNavigate()
  const { stage, operator } = useOperator()
  const { requests, loadRequests, totalVerifications, activeRequests, totalRequests } = useDeveloper()

  useEffect(() => {
    if (stage === 'connected') {
      loadRequests()
    }
  }, [stage, loadRequests])

  if (stage !== 'connected' || !operator) {
    navigate('/developers', { replace: true })
    return null
  }

  return (
    <div style={{
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
            lineHeight: 1.15,
          }}>
            Developer Workspace
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{operator.projectName}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{operator.walletAddress}</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-10)',
        }}>
          {[
            { label: 'Active requests', value: activeRequests, color: 'var(--success)' },
            { label: 'Total requests', value: totalRequests, color: 'var(--text-primary)' },
            { label: 'Total verifications', value: totalVerifications.toLocaleString(), color: 'var(--accent)' },
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
                padding: 'var(--space-6)',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: metric.color,
                lineHeight: 1,
                marginBottom: 'var(--space-1)',
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

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>Verification requests</h2>
            <Button variant="primary" size="sm" onClick={() => navigate('/developers/requests/create')}>
              New Request
            </Button>
          </div>

          {requests.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-16)',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                No verification requests
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)', maxWidth: 400, margin: '0 auto var(--space-6)', lineHeight: 1.5 }}>
                Create a verification request to let your DApp verify unique humans.
              </div>
              <Button variant="primary" size="md" onClick={() => navigate('/developers/requests/create')}>
                New Request
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {requests.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                >
                  <div
                    onClick={() => navigate(`/developers/requests/${req.id}`)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-5) var(--space-6)',
                      cursor: 'pointer',
                      transition: 'all var(--duration-fast) var(--ease-out)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-4)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--border-hover)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                        <span style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '0.9375rem',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}>{req.appName}</span>
                        <Badge variant={statusVariant[req.status]}>
                          {req.status}
                        </Badge>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        gap: 'var(--space-4)',
                        flexWrap: 'wrap',
                      }}>
                        <span>{req.verifications.toLocaleString()} verifications</span>
                        <span>Scope: {req.scope}</span>
                        <span>Expires: {new Date(req.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
