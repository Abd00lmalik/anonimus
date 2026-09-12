import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useOperator } from '../../contexts/OperatorContext'

export function OperatorNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { stage, operator, disconnect } = useOperator()

  const isAuthenticated = stage === 'connected' && operator

  const navItems = [
    { label: 'Overview', href: '/operator/workspace' },
    { label: 'Campaigns', href: '/campaigns/manage' },
    { label: 'Create', href: '/campaigns/create' },
  ]

  const isActive = (href: string) => {
    if (href === '/operator/workspace') return location.pathname === '/operator/workspace'
    if (href === '/campaigns/manage') return location.pathname === '/campaigns/manage'
    return location.pathname.startsWith(href)
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        background: 'rgba(7, 8, 10, 0.5)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--space-8)',
        height: 'var(--nav-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
          onClick={() => navigate(isAuthenticated ? '/operator/workspace' : '/')}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.7 }}>
            <circle cx="14" cy="14" r="12" stroke="#C6A35A" strokeWidth="1.2" strokeDasharray="68 8" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
          }}>ANONIMUS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          {isAuthenticated && navItems.map(item => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 400,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: isActive(item.href) ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
                position: 'relative',
                paddingBottom: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = isActive(item.href) ? 'var(--text-primary)' : 'var(--text-muted)'}
            >
              {item.label}
              {isActive(item.href) && (
                <motion.div
                  layoutId="operator-nav-underline"
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          ))}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-muted)',
                border: '1px solid rgba(198, 163, 90, 0.2)',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="var(--accent)" strokeWidth="1" />
                  <path d="M4.5 7L6.5 9L9.5 5" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  color: 'var(--accent)',
                  letterSpacing: '0.04em',
                }}>{operator.projectName}</span>
              </div>
              <button
                onClick={disconnect}
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/operator')}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                height: 44,
                padding: '0 20px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid rgba(243, 238, 228, 0.16)',
                color: 'var(--text-primary)',
                transition: 'all var(--duration-fast) var(--ease-out)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(243, 238, 228, 0.16)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
