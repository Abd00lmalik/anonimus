import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Developers', href: '/developers' },
  ]

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
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Interrupted circle logo mark */}
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
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }} className="nav-links">
          {navItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                fontWeight: 400,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: location.pathname === item.href ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color var(--duration-fast) var(--ease-out)',
                position: 'relative',
                paddingBottom: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = location.pathname === item.href ? 'var(--text-primary)' : 'var(--text-muted)')}
            >
              {item.label}
              {location.pathname === item.href && (
                <motion.div
                  layoutId="nav-underline"
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
            onClick={() => navigate('/campaigns/create')}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Create Campaign
          </button>

          <button
            onClick={() => navigate('/campaigns')}
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
            Start Verification
          </button>
        </div>

        <button
          className="mobile-menu-btn"
          style={{
            display: 'none',
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {mobileOpen ? (
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 6H17M3 10H17M3 14H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </motion.nav>
  )
}
