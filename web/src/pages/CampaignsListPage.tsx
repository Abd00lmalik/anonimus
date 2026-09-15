import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchCampaigns, type ApiCampaign } from '../lib/api'
import { CampaignCard } from '../components/ui/CampaignCard'
import type { Campaign } from '../types'

function apiToCampaign(c: ApiCampaign): Campaign {
  return {
    id: c.id,
    title: c.title,
    organizer: c.organizer,
    purpose: c.purpose,
    status: c.status === 'live' ? 'live' : 'ended',
    uniqueness: 'campaign-scoped',
    requirement: 'Personhood attestation required',
    deadline: c.endDate,
    description: c.description,
  }
}

export function CampaignsListPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
      .then(apiCampaigns => setCampaigns(apiCampaigns.map(apiToCampaign)))
      .catch(err => console.error('Failed to load campaigns:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ marginBottom: 'var(--space-12)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
            lineHeight: 1.1,
          }}>
            Active Campaigns
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            maxWidth: 520,
            lineHeight: 1.6,
          }}>
            Join a campaign to verify your personhood. Each verification is unique to the campaign scope. Your identity stays private.
          </p>
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-16)',
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto var(--space-4)',
            }} />
            <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading campaigns...
            </p>
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-16)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>
              No campaigns yet. Create one from the operator workspace.
            </p>
            <button
              onClick={() => navigate('/operator')}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.875rem',
                padding: '10px 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-6)',
          }}>
            {campaigns.map((campaign, i) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  style={{ height: '100%', cursor: 'pointer' }}
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/campaigns/${campaign.id}`)}
                >
                  <CampaignCard campaign={campaign} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
