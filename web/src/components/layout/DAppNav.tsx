import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../../contexts/DAppVerificationContext'
import { useTheme } from '../../contexts/ThemeContext'
import { Logo } from '../ui/Logo'

export function DAppNav() {
  const navigate = useNavigate()
  const { request } = useDAppVerification()
  const { theme, toggle } = useTheme()

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Logo size={28} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            letterSpacing: '0.08em',
            color: 'var(--text-primary)',
          }}>
            ANONIMUS
          </span>
        </div>

        {request && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>Verifying for</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {request.appName}
            </span>
          </div>
        )}

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

          <button
            onClick={() => {
              if (request?.returnUrl) {
                window.location.href = request.returnUrl
              } else {
                navigate('/')
              }
            }}
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
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Exit
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
