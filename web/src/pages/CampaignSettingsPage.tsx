import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaign } from '../contexts/CampaignContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export function CampaignSettingsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { currentCampaign, loadCampaign } = useCampaign()

  useEffect(() => {
    if (id) loadCampaign(id).catch(() => {})
  }, [id, loadCampaign])

  if (!currentCampaign) {
    return (
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8)',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Campaign not found.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 580,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => navigate(`/campaigns/${id}/dashboard`)}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </button>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-8)',
        }}>Campaign Settings</h1>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {[
              { label: 'Campaign name', value: currentCampaign.title },
              { label: 'Organizer', value: currentCampaign.organizer },
              { label: 'Scope', value: currentCampaign.scope, mono: true, locked: true },
              { label: 'Status', value: currentCampaign.status, badge: true },
              { label: 'Start date', value: new Date(currentCampaign.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: 'End date', value: new Date(currentCampaign.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: 'Purpose type', value: currentCampaign.purposeType },
              { label: 'Registrations', value: currentCampaign.registrations.toLocaleString() },
              { label: 'Created', value: new Date(currentCampaign.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}>{row.label}</span>
                {row.badge ? (
                  <Badge variant={currentCampaign.status === 'live' ? 'success' : 'muted'}>
                    {currentCampaign.status === 'live' ? 'Open' : currentCampaign.status}
                  </Badge>
                ) : (
                  <span style={{
                    fontFamily: row.mono ? 'var(--font-mono)' : 'var(--font-ui)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                  }}>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(198, 163, 90, 0.06)',
          border: '1px solid rgba(198, 163, 90, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            margin: 0,
          }}>
            Scope cannot be changed after registrations begin. Changing the uniqueness boundary after participants register could create confusing or unsafe semantics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/campaigns/${id}/dashboard`)}
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
