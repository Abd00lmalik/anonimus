import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../contexts/DAppVerificationContext'
import { useWallet } from '../contexts/WalletContext'
import { Button } from '../components/ui/Button'

const WILL_LEARN = [
  'Verified human',
  'Unique within this scope',
  'Verification result as required by the protocol',
]

const WILL_NOT_LEARN = [
  'Your name',
  'Who you are',
  'Your biometrics',
  'Your private credential',
  'A reusable global identity',
  'Your identity across unrelated applications',
]

function DisclosureColumn({ title, items, variant }: { title: string; items: string[]; variant: 'will' | 'will-not' }) {
  const isWill = variant === 'will'
  return (
    <div style={{
      flex: 1,
      background: isWill ? 'rgba(143, 191, 154, 0.04)' : 'rgba(201, 122, 114, 0.04)',
      border: `1px solid ${isWill ? 'rgba(143, 191, 154, 0.15)' : 'rgba(201, 122, 114, 0.15)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-6)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6875rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: isWill ? 'var(--success)' : 'var(--error)',
        marginBottom: 'var(--space-5)',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}>
            {isWill ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6" stroke="var(--success)" strokeWidth="1" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6" stroke="var(--error)" strokeWidth="1" />
                <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.4,
            }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DAppDisclosurePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stage, request, reviewDisclosure } = useDAppVerification()
  const { wallet } = useWallet()
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!request) {
      navigate('/dapp/verify')
      return
    }
    if (stage === 'disclosure-review') {
      navigate(`/dapp/${id}/verify`)
    }
  }, [stage, request, id, navigate])

  if (!request) return null

  const handleApprove = () => {
    if (!acknowledged) return
    reviewDisclosure()
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
        <button
          onClick={() => navigate(`/dapp/${id}/wallet`)}
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
          Back
        </button>

        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 'var(--space-3)',
          }}>
            Step 2 of 4 — Review Disclosure
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            lineHeight: 1.2,
          }}>
            What {request.appName} receives
          </h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            Review exactly what data is included in the zero-knowledge proof. Nothing more is revealed to the application.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }} className="disclosure-columns">
          <DisclosureColumn
            title={`${request.appName} will learn`}
            items={WILL_LEARN}
            variant="will"
          />
          <DisclosureColumn
            title={`${request.appName} will not learn`}
            items={WILL_NOT_LEARN}
            variant="will-not"
          />
        </div>

        <style>{`
          @media (max-width: 640px) {
            .disclosure-columns { flex-direction: column !important; }
          }
        `}</style>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1" />
              <path d="M8 5V8L10 10" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                Unique within this scope
              </div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Uniqueness here does not mean unique everywhere. The nullifier is scoped to this specific application and cannot be linked to other verifications.
              </p>
            </div>
          </div>
        </div>

        {wallet.connected && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" fill="var(--success)" />
            </svg>
            Connected: {wallet.address}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            cursor: 'pointer',
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
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
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}>
            I have reviewed the disclosure and understand what data {request.appName} will receive.
          </span>
        </label>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleApprove}
            disabled={!acknowledged}
            style={{ flex: 2 }}
          >
            Approve and generate proof
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              if (request.returnUrl && request.returnUrl !== '#') {
                window.location.href = request.returnUrl
              } else {
                navigate('/')
              }
            }}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
