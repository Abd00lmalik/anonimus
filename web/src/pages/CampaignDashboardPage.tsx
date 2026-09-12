import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaign } from '../contexts/CampaignContext'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ExportDialog } from '../components/ui/ExportDialog'

export function CampaignDashboardPage() {
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
  const daysRemaining = Math.max(0, Math.ceil((new Date(currentCampaign.deadline).getTime() - Date.now()) / 86400000))

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
          onClick={() => navigate('/campaigns/manage')}
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
          All Campaigns
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <Badge variant={currentCampaign.status === 'live' ? 'success' : currentCampaign.status === 'ended' ? 'muted' : 'warning'}>
              {currentCampaign.status === 'live' ? 'Open' : currentCampaign.status === 'ended' ? 'Closed' : currentCampaign.status}
            </Badge>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}>ID: {currentCampaign.id}</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
            lineHeight: 1.15,
          }}>{currentCampaign.title}</h1>
          <div style={{
            display: 'flex',
            gap: 'var(--space-6)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            <span>Scope: {currentCampaign.scope}</span>
            <span>Ends: {new Date(currentCampaign.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>{daysRemaining} days remaining</span>
          </div>
        </div>

        {/* Primary Metric */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-10)',
            marginBottom: 'var(--space-8)',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            color: 'var(--accent)',
            lineHeight: 1,
            marginBottom: 'var(--space-2)',
          }}>{verifiedCount.toLocaleString()}</div>
          <div style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
          }}>{verifiedCount.toLocaleString()} unique registrations in this campaign</div>
        </motion.div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-10)' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowExport(true)}
          >
            Export Wallets
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(`/campaigns/${currentCampaign.id}`)}
          >
            View Campaign
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate(`/campaigns/${currentCampaign.id}/registrations`)}
          >
            View Registrations
          </Button>
        </div>

        {/* Privacy Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-10)',
        }}>
          <div style={{
            background: 'rgba(143, 191, 154, 0.04)',
            border: '1px solid rgba(143, 191, 154, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--success)',
              marginBottom: 'var(--space-3)',
            }}>What you know</div>
            {['Verified human', 'Unique within this campaign', 'Registered wallet handle'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="var(--success)" strokeWidth="1" />
                  <path d="M3.5 6L5 7.5L8.5 4.5" stroke="var(--success)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{
            background: 'rgba(201, 122, 114, 0.04)',
            border: '1px solid rgba(201, 122, 114, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--error)',
              marginBottom: 'var(--space-3)',
            }}>What you do not know</div>
            {['Name', 'Real-world identity', 'Biometrics', 'Private credential'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="var(--error)" strokeWidth="1" />
                  <path d="M4 4L8 8M8 4L4 8" stroke="var(--error)" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>Recent registrations</h2>
            <button
              onClick={() => navigate(`/campaigns/${currentCampaign.id}/registrations`)}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '0.8125rem',
                color: 'var(--accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View all →
            </button>
          </div>

          {registrations.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-10)',
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Wallet handle', 'Status', 'Registered'].map(h => (
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
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.slice(0, 5).map(reg => (
                    <tr key={reg.id}>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {reg.walletHandle.slice(0, 20)}...{reg.walletHandle.slice(-8)}
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
                      }}>
                        {new Date(reg.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
