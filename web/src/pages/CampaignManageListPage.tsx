import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOperator } from '../contexts/OperatorContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export function CampaignManageListPage() {
  const navigate = useNavigate()
  const { stage, campaigns, loadCampaigns } = useOperator()

  useEffect(() => {
    if (stage === 'connected') {
      loadCampaigns().catch(() => {})
    }
  }, [stage, loadCampaigns])

  // Redirect to operator entry if not connected
  if (stage !== 'connected') {
    navigate('/operator', { replace: true })
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
              lineHeight: 1.15,
            }}>Your campaigns</h1>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
            }}>
              Manage verification campaigns and export registered wallets.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate('/campaigns/create')}>
            Create Campaign
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-16)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              No campaigns yet
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Create a verification campaign and give your community a privacy-preserving way to prove humanity.
            </div>
            <Button variant="primary" size="md" onClick={() => navigate('/campaigns/create')}>
              Create Campaign
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {campaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <div
                  onClick={() => navigate(`/campaigns/${campaign.id}/dashboard`)}
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
                      }}>{campaign.title}</span>
                      <Badge variant={campaign.status === 'live' ? 'success' : 'muted'}>
                        {campaign.status === 'live' ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      gap: 'var(--space-4)',
                    }}>
                      <span>{campaign.registrations.toLocaleString()} registrations</span>
                      <span>Scope: {campaign.scope}</span>
                      <span>Ends: {new Date(campaign.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
      </motion.div>
    </div>
  )
}
