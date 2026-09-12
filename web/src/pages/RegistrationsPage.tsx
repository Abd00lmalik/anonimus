import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaign } from '../contexts/CampaignContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ExportDialog } from '../components/ui/ExportDialog'

export function RegistrationsPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { currentCampaign, loadCampaign, registrations, loadRegistrations, getExportData } = useCampaign()
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    if (id) {
      loadCampaign(id).catch(() => {})
      loadRegistrations(id).catch(() => {})
    }
  }, [id, loadCampaign, loadRegistrations])

  if (!currentCampaign) {
    return (
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: 'calc(var(--nav-height) + var(--space-16)) var(--space-8)',
        textAlign: 'center',
      }}>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Campaign not found.
        </p>
      </div>
    )
  }

  const verifiedCount = registrations.filter(r => r.verificationStatus === 'verified').length

  return (
    <div style={{
      maxWidth: 'var(--max-width)',
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => navigate(`/campaigns/${id}/dashboard`)}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
            }}>Registrations</h1>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}>
              {verifiedCount.toLocaleString()} verified registrations in {currentCampaign.title}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowExport(true)}>
            Export Wallets
          </Button>
        </div>

        {registrations.length === 0 ? (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-16)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64,
              height: 64,
              margin: '0 auto var(--space-4)',
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              No registrations yet
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              When people complete verification, their campaign registration will appear here.
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    {['Wallet handle', 'Status', 'Registered', 'Commitment ref'].map(h => (
                      <th key={h} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        fontWeight: 400,
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg.id}>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {reg.walletHandle}
                      </td>
                      <td style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <Badge variant={reg.verificationStatus === 'verified' ? 'success' : reg.verificationStatus === 'pending' ? 'warning' : 'muted'}>
                          {reg.verificationStatus}
                        </Badge>
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: '0.8125rem',
                        color: 'var(--text-muted)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                      }}>
                        {new Date(reg.registeredAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {reg.commitmentRef.slice(0, 18)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ExportDialog
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          campaignId={currentCampaign.id}
          campaignTitle={currentCampaign.title}
          registrationCount={verifiedCount}
          getExportData={getExportData}
        />
      </motion.div>
    </div>
  )
}
