import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDAppVerification } from '../../contexts/DAppVerificationContext'

export function DAppNav() {
  const navigate = useNavigate()
  const { request } = useDAppVerification()

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
    </motion.nav>
  )
}
