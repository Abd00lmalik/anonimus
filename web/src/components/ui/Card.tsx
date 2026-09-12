import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  variant?: 'default' | 'outlined' | 'glass'
  padding?: 'sm' | 'md' | 'lg'
  hover?: boolean
  style?: React.CSSProperties
}

export function Card({ children, variant = 'default', padding = 'md', hover = false, style }: CardProps) {
  const variants = {
    default: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
    },
    outlined: {
      background: 'transparent',
      border: '1px solid var(--border)',
    },
    glass: {
      background: 'rgba(18, 21, 26, 0.6)',
      border: '1px solid var(--border)',
      backdropFilter: 'blur(12px)',
    },
  }

  const paddings = {
    sm: 'var(--space-4)',
    md: 'var(--space-6)',
    lg: 'var(--space-8)',
  }

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        padding: paddings[padding],
        transition: hover ? 'all var(--duration-fast) var(--ease-out)' : undefined,
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      } : undefined}
    >
      {children}
    </div>
  )
}
