import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../ui/Logo'
import { useTheme } from '../../contexts/ThemeContext'
import { useWallet } from '../../contexts/WalletContext'

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { wallet, disconnect } = useWallet()

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
        background: theme === 'dark' ? 'rgba(7, 8, 10, 0.6)' : 'rgba(244, 240, 232, 0.8)',
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
          <Logo size={28} />
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
              border: '1px solid var(--border)',
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
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Start Verification
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              transition: 'color var(--duration-fast) var(--ease-out)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M9 1.5V3M9 15v1.5M1.5 9H3M15 9h1.5M3.4 3.4l1.1 1.1M13.5 13.5l1.1 1.1M3.4 14.6l1.1-1.1M13.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15.5 10.5a6.5 6.5 0 01-8-8 6.5 6.5 0 108 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {wallet.connected && (
            <button
              onClick={disconnect}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                height: 44,
                padding: '0 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                transition: 'all var(--duration-fast) var(--ease-out)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                maxWidth: 160,
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--error)'
                e.currentTarget.style.color = 'var(--error)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              title={`Connected: ${wallet.address}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" fill="var(--success)" />
              </svg>
              Disconnect
            </button>
          )}

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
        </div>

        {mobileOpen && (
          <div
            className="mobile-nav-drawer"
            style={{
              display: 'none',
              padding: 'var(--space-4) var(--space-8)',
              paddingBottom: 'var(--space-6)',
              background: theme === 'dark' ? 'rgba(7, 8, 10, 0.95)' : 'rgba(244, 240, 232, 0.95)',
              borderTop: '1px solid var(--border)',
            }}
          >
            {navItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.9375rem',
                  color: location.pathname === item.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => { navigate('/campaigns/create'); setMobileOpen(false) }}
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--border)',
                textAlign: 'left',
                width: '100%',
              }}
            >
              Create Campaign
            </button>
          </div>
        )}

        <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-nav-drawer { display: block !important; }
        }
      `}</style>
    </motion.nav>
  )
}
