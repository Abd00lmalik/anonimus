import type { Campaign } from '../../types'
import { StatusBadge } from './StatusBadge'

function MiniSeal() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="16" fill="#0C0E12" stroke="rgba(198,163,90,0.2)" strokeWidth="1" />
      <circle cx="20" cy="20" r="12" stroke="rgba(198,163,90,0.15)" strokeWidth="0.5" strokeDasharray="30 4" />
      <circle cx="20" cy="20" r="18" stroke="rgba(198,163,90,0.1)" strokeWidth="0.5" />
    </svg>
  )
}

interface CampaignCardProps {
  campaign: Campaign
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        transition: 'all 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(198,163,90,0.35)'
        e.currentTarget.style.transform = 'translateY(-6px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <MiniSeal />
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {campaign.title}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
              {campaign.organizer}
            </div>
          </div>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)', flex: 1 }}>
        {campaign.purpose}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(198, 163, 90, 0.08)',
            color: 'var(--accent)',
          }}>
            {campaign.uniqueness}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(243, 238, 228, 0.04)',
            color: 'var(--text-muted)',
          }}>
            {campaign.deadline}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(243, 238, 228, 0.04)',
            color: 'var(--text-muted)',
          }}>
            Personhood attestation
          </span>
        </div>
        <button
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            transition: 'all 180ms var(--ease-out)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
            e.currentTarget.style.color = 'var(--bg-primary)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          View
        </button>
      </div>
    </div>
  )
}
