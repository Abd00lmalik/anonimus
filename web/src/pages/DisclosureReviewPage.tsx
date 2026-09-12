import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchCampaign } from '../lib/api'
import { useVerification } from '../contexts/VerificationContext'
import { useWallet } from '../contexts/WalletContext'
import { Button } from '../components/ui/Button'
import type { Campaign } from '../types'

const DISCLOSURE_ITEMS = [
  {
    label: 'Campaign ID',
    value: 'scope',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--accent)" strokeWidth="1" />
        <path d="M5 8H11M8 5V11" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    description: 'The campaign you are joining is included in the proof.',
  },
  {
    label: 'Wallet address (nullifier)',
    value: 'nullifier',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1" />
        <path d="M8 5V8L10 10" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    description: 'A unique, non-linkable nullifier derived from your wallet. Cannot be traced back to your address.',
  },
  {
    label: 'Attestation validity',
    value: 'attestation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 8L7 11L12 5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: 'The verifier checks that your personhood attestation is valid and not expired.',
  },
  {
    label: 'Uniqueness',
    value: 'uniqueness',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="var(--accent)" strokeWidth="1" />
        <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 2" />
      </svg>
    ),
    description: 'The contract checks that no nullifier for this campaign already exists on-chain.',
  },
]

export function DisclosureReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { reviewDisclosure } = useVerification()
  const { wallet } = useWallet()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchCampaign(id)
      .then(c => {
        setCampaign({
          id: c.id, title: c.title, organizer: c.organizer, purpose: c.purpose,
          status: c.status === 'live' ? 'live' : 'ended', uniqueness: 'campaign-scoped',
          requirement: 'Personhood attestation required', deadline: c.endDate,
        })
      })
      .catch(() => navigate('/campaigns'))
  }, [id, navigate])

  if (!campaign) {
    return (
      <div style={{
        maxWidth: 520, margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 32, height: 32, border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const handleContinue = () => {
    if (!acknowledged) return
    reviewDisclosure()
    navigate(`/campaigns/${campaign.id}/verify`)
  }

  return (
    <div style={{
      maxWidth: 520, margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}/join`)}
          style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            marginBottom: 'var(--space-8)', padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-3)',
          }}>
            Step 2 of 4 — Review Disclosure
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.2,
          }}>
            What gets disclosed?
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.9375rem',
            color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            Review exactly what data is included in the zero-knowledge proof. Nothing more is revealed to the verifier.
          </p>
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-6)',
        }}>
          {DISCLOSURE_ITEMS.map((item, i) => (
            <div
              key={item.value}
              style={{
                padding: 'var(--space-5) var(--space-6)',
                borderBottom: i < DISCLOSURE_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                {item.icon}
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)',
                }}>
                  {item.label}
                </span>
              </div>
              <p style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)',
                lineHeight: 1.5, marginLeft: 28,
              }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(198, 163, 90, 0.06)', border: '1px solid rgba(198, 163, 90, 0.15)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M8 2L14 13H2L8 2Z" stroke="var(--accent)" strokeWidth="1" fill="none" />
              <path d="M8 6V9M8 11V11.5" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--accent)', marginBottom: 'var(--space-1)' }}>
                Not disclosed
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your real wallet address, name, IP address, or any biometric data are never included in the proof.
              </p>
            </div>
          </div>
        </div>

        {wallet.connected && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" fill="var(--success)" />
            </svg>
            Connected: {wallet.address}
          </div>
        )}

        <label
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer',
            marginBottom: 'var(--space-6)', padding: 'var(--space-4)',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ accentColor: 'var(--accent)', marginTop: 2 }}
          />
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem',
            color: 'var(--text-secondary)', lineHeight: 1.5,
          }}>
            I have reviewed the disclosure and understand what data is included in the proof.
          </span>
        </label>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!acknowledged}
          style={{ width: '100%' }}
        >
          Continue to Verification
        </Button>
      </motion.div>
    </div>
  )
}
