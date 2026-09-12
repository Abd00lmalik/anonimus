import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchCampaign } from '../lib/api'
import { useVerification } from '../contexts/VerificationContext'
import type { Campaign } from '../types'

const WALLETS = [
  {
    id: 'lace',
    name: 'Lace',
    description: 'Lightweight wallet for Midnight',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1a1a2e" />
        <circle cx="16" cy="16" r="10" stroke="#C6A35A" strokeWidth="1.5" />
        <path d="M12 16L16 12L20 16L16 20Z" stroke="#C6A35A" strokeWidth="1" fill="none" />
      </svg>
    ),
  },
  {
    id: '1am',
    name: '1AM Wallet',
    description: 'Privacy-first Midnight wallet',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#1a1a2e" />
        <text x="16" y="20" textAnchor="middle" fill="#C6A35A" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">1A</text>
      </svg>
    ),
  },
]

export function JoinWalletPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { startWalletConnect, stage } = useVerification()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchCampaign(id)
      .then(c => {
        setCampaign({
          id: c.id,
          title: c.title,
          organizer: c.organizer,
          purpose: c.purpose,
          status: c.status === 'live' ? 'live' : 'ended',
          uniqueness: 'campaign-scoped',
          requirement: 'Personhood attestation required',
          deadline: c.endDate,
        })
      })
      .catch(() => navigate('/campaigns'))
  }, [id, navigate])

  if (!campaign) {
    return (
      <div style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto',
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const handleConnect = async (walletId: string) => {
    setSelectedWallet(walletId)
    setError(null)
    try {
      await startWalletConnect(walletId)
      navigate(`/campaigns/${campaign.id}/disclosure`)
    } catch {
      setError('Connection failed. Please try again.')
    }
  }

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
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
            Step 1 of 4
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.2,
          }}>
            Connect your wallet
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.9375rem',
            color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            Connect a Midnight wallet to join <strong style={{ color: 'var(--text-primary)' }}>{campaign.title}</strong>. Your wallet address will be used to generate a unique nullifier.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {WALLETS.map(wallet => (
            <motion.button
              key={wallet.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleConnect(wallet.id)}
              disabled={stage === 'wallet-connecting'}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-5) var(--space-6)',
                background: selectedWallet === wallet.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                border: `1px solid ${selectedWallet === wallet.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: stage === 'wallet-connecting' ? 'not-allowed' : 'pointer',
                opacity: stage === 'wallet-connecting' && selectedWallet !== wallet.id ? 0.4 : 1,
                textAlign: 'left', width: '100%',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
            >
              {wallet.icon}
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {wallet.name}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {wallet.description}
                </div>
              </div>
              {stage === 'wallet-connecting' && selectedWallet === wallet.id && (
                <div style={{ marginLeft: 'auto' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="10" cy="10" r="8" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="40 10" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {error && (
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--error)',
            background: 'rgba(201, 122, 114, 0.08)', border: '1px solid rgba(201, 122, 114, 0.2)',
            borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-5)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 600,
            color: 'var(--text-primary)', marginBottom: 'var(--space-3)',
          }}>
            What happens next?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              'Review what data is disclosed during verification',
              'Verify your face (on-device, private)',
              'Generate a zero-knowledge proof',
              'Register on-chain',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)',
                  background: 'var(--accent-muted)', borderRadius: 'var(--radius-sm)',
                  width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-secondary)',
                }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
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
