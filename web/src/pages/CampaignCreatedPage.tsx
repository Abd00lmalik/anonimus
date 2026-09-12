import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaign } from '../contexts/CampaignContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

function BlankSignet() {
  return (
    <div style={{ width: 100, height: 100, margin: '0 auto' }}>
      <svg viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <linearGradient id="created-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C6A35A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C6A35A" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="url(#created-fill)" stroke="#C6A35A" strokeWidth="1" />
        <circle cx="50" cy="50" r="34" stroke="#C6A35A" strokeWidth="0.5" strokeDasharray="40 4" opacity="0.4" />
        <circle cx="50" cy="50" r="45" stroke="#C6A35A" strokeWidth="0.5" opacity="0.2" />
      </svg>
    </div>
  )
}

export function CampaignCreatedPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { currentCampaign, loadCampaign } = useCampaign()

  // Load campaign if not already loaded
  useEffect(() => {
    if (!currentCampaign && id) {
      loadCampaign(id).catch(() => {})
    }
  }, [currentCampaign, id, loadCampaign])

  if (!currentCampaign) {
    navigate('/campaigns/manage')
    return null
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
        style={{ textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <BlankSignet />
        </motion.div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 3vw, 2rem)',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-2)',
        }}>Campaign created</h1>

        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-6)',
        }}>{currentCampaign.title}</p>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-8)',
          textAlign: 'left',
        }}>
          {[
            { label: 'Campaign ID', value: currentCampaign.id, mono: true },
            { label: 'Scope', value: currentCampaign.scope, mono: true },
            { label: 'Status', value: currentCampaign.status, badge: true },
            { label: 'Registrations', value: '0' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--space-2) 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>{row.label}</span>
              {row.badge ? (
                <Badge variant="success">Live</Badge>
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

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/campaigns/${currentCampaign.id}/dashboard`)}
            style={{ flex: 1 }}
          >
            Open Campaign Dashboard
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate(`/campaigns/${currentCampaign.id}`)}
            style={{ flex: 1 }}
          >
            View Campaign
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
