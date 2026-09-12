import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchCampaign, type ApiCampaign } from '../lib/api'
import { useVerification } from '../contexts/VerificationContext'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
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
    whyRequired: c.description,
    eligibility: [
      'Must hold a Midnight wallet (Lace or 1AM)',
      'Personhood attestation required',
      'Not previously registered in this campaign',
    ],
  }
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setCampaign: selectCampaign } = useVerification()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchCampaign(id)
      .then(c => setCampaign(apiToCampaign(c)))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
          Campaign not found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
          The campaign you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="secondary" onClick={() => navigate('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  const handleJoin = () => {
    selectCampaign(campaign)
    navigate(`/campaigns/${campaign.id}/join`)
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
        <button
          onClick={() => navigate('/campaigns')}
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
            marginBottom: 'var(--space-8)',
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All Campaigns
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-12)', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <StatusBadge status={campaign.status} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                {campaign.uniqueness}
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
              lineHeight: 1.15,
            }}>
              {campaign.title}
            </h1>

            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-8)',
            }}>
              by {campaign.organizer}
            </p>

            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: 'var(--space-8)',
            }}>
              {campaign.description || campaign.purpose}
            </p>

            {campaign.whyRequired && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-8)',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-3)',
                }}>
                  Why is verification required?
                </h3>
                <p style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}>
                  {campaign.whyRequired}
                </p>
              </div>
            )}

            {campaign.eligibility && (
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <h3 style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-4)',
                }}>
                  Eligibility requirements
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {campaign.eligibility.map((req, i) => (
                    <li key={i} style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                        <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1" />
                        <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              position: 'sticky',
              top: 'calc(var(--nav-height) + var(--space-6))',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
                  Deadline
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {new Date(campaign.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
                  Requirement
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {campaign.requirement}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleJoin}
              disabled={campaign.status === 'ended'}
              style={{ width: '100%' }}
            >
              {campaign.status === 'ended' ? 'Campaign Ended' : 'Join Campaign'}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 900px) {
          .campaign-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
