interface ComparisonItem {
  label: string
  others: string
  anonimus: string
}

const comparisons: ComparisonItem[] = [
  { label: 'What is shared', others: 'Government ID, biometrics, full name', anonimus: 'Zero-knowledge proof of humanity' },
  { label: 'Identity stored', others: 'Centralized database', anonimus: 'Nowhere' },
  { label: 'Cross-platform tracking', others: 'Common', anonimus: 'Impossible' },
  { label: 'Data sold to third parties', others: 'Frequent', anonimus: 'Never' },
  { label: 'Proof of uniqueness', others: 'Not possible', anonimus: 'Built-in via nullifiers' },
]

export function PrivacyComparison() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 560 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1px',
            background: 'var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div style={{ background: 'var(--bg-surface)', padding: '14px 20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Feature
            </span>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '14px 20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Other platforms
            </span>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '14px 20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Anonimus
            </span>
          </div>

          {comparisons.map((item, i) => (
            <>
              <div key={`label-${i}`} style={{ background: 'var(--bg-primary)', padding: '14px 20px' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {item.label}
                </span>
              </div>
              <div key={`other-${i}`} style={{ background: 'var(--bg-primary)', padding: '14px 20px' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {item.others}
                </span>
              </div>
              <div key={`anon-${i}`} style={{ background: 'rgba(198, 163, 90, 0.03)', padding: '14px 20px' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {item.anonimus}
                </span>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  )
}
