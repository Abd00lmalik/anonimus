import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DisclosurePanelProps {
  title: string
  children: React.ReactNode
}

export function DisclosurePanel({ title, children }: DisclosurePanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: open ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color var(--duration-fast) var(--ease-out)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 500 }}>
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '1.25rem', color: 'var(--text-muted)', lineHeight: 1 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: '16px', color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.7 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
