import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignTitle: string
  registrationCount: number
  getExportData: (campaignId: string) => { walletHandle: string; registeredAt: string }[]
}

export function ExportDialog({ isOpen, onClose, campaignId, campaignTitle, registrationCount, getExportData }: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    const data = getExportData(campaignId)

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${campaignId}-wallets.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const header = 'wallet_handle,registered_at\n'
      const rows = data.map(r => `${r.walletHandle},${r.registeredAt}`).join('\n')
      const blob = new Blob([header + rows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${campaignId}-wallets.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    setExported(true)
    setTimeout(() => {
      setExported(false)
      onClose()
    }, 1500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(7, 8, 10, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-8)',
              maxWidth: 480,
              width: '90%',
            }}
          >
            {exported ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(143, 191, 154, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 7" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  Export complete
                </div>
              </div>
            ) : (
              <>
                <h2 style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-2)',
                }}>Export registered wallets</h2>
                <p style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-6)',
                  lineHeight: 1.5,
                }}>
                  Export wallet handles associated with successful registrations in this campaign.
                </p>

                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-4)',
                  marginBottom: 'var(--space-5)',
                }}>
                  {[
                    { label: 'Campaign', value: campaignTitle },
                    { label: 'Included', value: `${registrationCount.toLocaleString()} registered humans` },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: 'rgba(198, 163, 90, 0.06)',
                  border: '1px solid rgba(198, 163, 90, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  marginBottom: 'var(--space-5)',
                }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Contains:</strong> Wallet handles associated with successful registrations.
                    <br />
                    <strong style={{ color: 'var(--text-secondary)' }}>Does not contain:</strong> Participant names, identities, biometrics, or private credentials.
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <label style={{
                    display: 'block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-2)',
                  }}>Format</label>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    {(['csv', 'json'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        style={{
                          flex: 1,
                          padding: 'var(--space-3)',
                          background: format === f ? 'var(--accent-muted)' : 'var(--bg-primary)',
                          border: `1px solid ${format === f ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8125rem',
                          color: format === f ? 'var(--accent)' : 'var(--text-primary)',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          transition: 'all var(--duration-fast) var(--ease-out)',
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="primary" size="md" onClick={handleExport} style={{ flex: 1 }}>
                    Export Wallets
                  </Button>
                  <Button variant="secondary" size="md" onClick={onClose}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
