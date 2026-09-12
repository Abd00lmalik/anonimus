import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
}

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style }: ButtonProps) {
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--bg-primary)',
      border: '1px solid var(--accent)',
      fontWeight: 600,
    },
    secondary: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
  }

  const sizes = {
    sm: { padding: '8px 16px', fontSize: '0.8125rem' },
    md: { padding: '10px 22px', fontSize: '0.875rem' },
    lg: { padding: '14px 32px', fontSize: '1rem' },
  }

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        letterSpacing: '0.02em',
        transition: 'all var(--duration-fast) var(--ease-out)',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

export function GhostButton({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <Button variant="ghost" onClick={onClick} style={{ padding: '8px 16px', fontSize: '0.8125rem', ...style }}>
      {children}
    </Button>
  )
}
