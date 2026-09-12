import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchCampaign } from '../lib/api'
import { useVerification } from '../contexts/VerificationContext'
import { Button } from '../components/ui/Button'
import type { Campaign } from '../types'

function BlankSignet() {
  return (
    <div style={{ width: 120, height: 120, margin: '0 auto' }}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        <defs>
          <linearGradient id="signet-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C6A35A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#C6A35A" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="url(#signet-fill)" stroke="#C6A35A" strokeWidth="1" />
        <circle cx="60" cy="60" r="40" stroke="#C6A35A" strokeWidth="0.5" strokeDasharray="50 5" opacity="0.4" />
        <circle cx="60" cy="60" r="54" stroke="#C6A35A" strokeWidth="0.5" opacity="0.2" />
      </svg>
    </div>
  )
}

export function SuccessPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { receipt } = useVerification()
  const [campaignData, setCampaignData] = useState<Campaign | null>(null)

  useEffect(() => {
    if (!id) return
    fetchCampaign(id)
      .then(c => {
        setCampaignData({
          id: c.id, title: c.title, organizer: c.organizer, purpose: c.purpose,
          status: c.status === 'live' ? 'live' : 'ended', uniqueness: 'campaign-scoped',
          requirement: 'Personhood attestation required', deadline: c.endDate,
        })
      })
      .catch(() => navigate('/campaigns'))
  }, [id, navigate])

  if (!campaignData || !receipt) {
    return (
      <div style={{
        maxWidth: 520, margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
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

  const shortNullifier = `${receipt.nullifier.slice(0, 10)}...${receipt.nullifier.slice(-8)}`

  return (
    <div style={{
      maxWidth: 520, margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 'var(--space-6)' }}
          >
            <BlankSignet />
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)', marginBottom: 'var(--space-3)',
          }}>
            Verification complete
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.9375rem',
            color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            You have been verified for <strong style={{ color: 'var(--text-primary)' }}>{campaignData.title}</strong>. Your nullifier is now registered on-chain.
          </p>
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-6)', marginBottom: 'var(--space-6)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 'var(--space-4)',
          }}>
            Verification Receipt
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Nullifier', value: shortNullifier, mono: true },
              { label: 'Scope', value: receipt.scope },
              { label: 'Session', value: receipt.sessionId, mono: true },
              { label: 'Issued', value: new Date(receipt.issuedAt).toLocaleString() },
              { label: 'Expires', value: new Date(receipt.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontFamily: row.mono ? 'var(--font-mono)' : 'var(--font-ui)',
                  fontSize: '0.8125rem', color: 'var(--text-primary)',
                }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(143, 191, 154, 0.06)', border: '1px solid rgba(143, 191, 154, 0.15)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', marginBottom: 'var(--space-8)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="8" cy="8" r="6" stroke="var(--success)" strokeWidth="1" />
              <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--success)', marginBottom: 'var(--space-1)' }}>
                What now?
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your verification is active. Use this nullifier to access {campaignData.title} features. The verifier cannot link this nullifier back to your wallet address.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button variant="primary" size="lg" onClick={() => navigate('/')} style={{ flex: 1 }}>
            Return Home
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/campaigns')} style={{ flex: 1 }}>
            Browse Campaigns
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
