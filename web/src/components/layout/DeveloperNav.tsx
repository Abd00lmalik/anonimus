import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function DeveloperNav() {
  const location = useLocation()
  const navigate = useNavigate()

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
        <Link to="/developers/workspace" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.7 }}>
            <circle cx="14" cy="14" r="12" stroke="#C6A35A" strokeWidth="1.2" strokeDasharray="68 8" />
          </svg>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
          }}>
            ANONIMUS
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            background: 'var(--accent-muted)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
          }}>
            Developer
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          {[
            { label: 'Workspace', href: '/developers/workspace' },
            { label: 'New Request', href: '/developers/requests/create' },
          ].map(item => (
            <Link
              key={item.href}
              to={item.href}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 400,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: location.pathname.startsWith(item.href) ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
                position: 'relative',
                paddingBottom: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = location.pathname.startsWith(item.href) ? 'var(--text-primary)' : 'var(--text-muted)')}
            >
              {item.label}
              {location.pathname.startsWith(item.href) && item.href !== '/developers/requests/create' && (
                <motion.div
                  layoutId="dev-nav-underline"
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
            </Link>
          ))}

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
            Project Settings
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
