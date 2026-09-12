type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    background: 'rgba(243, 238, 228, 0.06)',
    color: 'var(--text-secondary)',
  },
  accent: {
    background: 'var(--accent-muted)',
    color: 'var(--accent)',
  },
  success: {
    background: 'rgba(143, 191, 154, 0.12)',
    color: 'var(--success)',
  },
  warning: {
    background: 'rgba(201, 160, 102, 0.12)',
    color: 'var(--warning)',
  },
  muted: {
    background: 'rgba(122, 118, 110, 0.12)',
    color: 'var(--text-muted)',
  },
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6875rem',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
