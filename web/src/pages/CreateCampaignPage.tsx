import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaign } from '../contexts/CampaignContext'
import { Button } from '../components/ui/Button'
import type { CampaignCreateInput } from '../types'

const PURPOSE_TYPES = [
  { value: 'airdrop', label: 'Airdrop', desc: 'Token distribution to verified humans' },
  { value: 'rewards', label: 'Rewards', desc: 'Incentive distribution' },
  { value: 'access', label: 'Access', desc: 'Gated feature or content' },
  { value: 'allowlist', label: 'Allowlist', desc: 'Priority or whitelist inclusion' },
  { value: 'community', label: 'Community', desc: 'Community participation or governance' },
  { value: 'other', label: 'Other', desc: 'Custom use case' },
] as const

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-8)' }}>
      <h3 style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '0.9375rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-1)',
      }}>{title}</h3>
      {description && (
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginBottom: 'var(--space-4)',
          lineHeight: 1.5,
        }}>{description}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6875rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 'var(--space-2)',
      }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        outline: 'none',
        transition: 'border-color var(--duration-fast) var(--ease-out)',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      style={{
        width: '100%',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        outline: 'none',
        resize: 'vertical',
        lineHeight: 1.5,
        transition: 'border-color var(--duration-fast) var(--ease-out)',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        fontFamily: 'var(--font-ui)',
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        outline: 'none',
        colorScheme: 'dark',
        transition: 'border-color var(--duration-fast) var(--ease-out)',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  )
}

export function CreateCampaignPage() {
  const navigate = useNavigate()
  const { createCampaign } = useCampaign()
  const [form, setForm] = useState<CampaignCreateInput>({
    title: '',
    organizer: '',
    description: '',
    purpose: '',
    scope: '',
    startDate: '',
    endDate: '',
    purposeType: 'community',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof CampaignCreateInput, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid = form.title.trim() && form.organizer.trim() && form.scope.trim() && form.startDate && form.endDate && new Date(form.endDate) > new Date(form.startDate)

  const missingFields = [
    !form.title.trim() && 'Campaign name',
    !form.organizer.trim() && 'Project / organizer',
    !form.scope.trim() && 'Scope identifier',
    !form.startDate && 'Start date',
    !form.endDate && 'End date',
    form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate) && 'End date must be after start date',
  ].filter(Boolean) as string[]

  const handleCreate = async () => {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createCampaign(form)
      navigate(`/campaigns/${created.id}/created`)
    } catch (err: any) {
      console.error('Failed to create campaign:', err)
      setError(err?.message || 'Failed to create campaign. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: 'calc(var(--nav-height) + var(--space-12)) var(--space-8) var(--space-16)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-3)',
            lineHeight: 1.15,
          }}>Create a campaign</h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 520,
          }}>
            Set up a verification scope where people can prove humanity and register once.
            You will receive proof of verification, never the person behind it.
          </p>
        </div>

        <FormSection title="Campaign identity" description="Basic information about your campaign.">
          <Field label="Campaign name">
            <TextInput value={form.title} onChange={v => update('title', v)} placeholder="e.g., Token Airdrop Round 1" />
          </Field>
          <Field label="Project / organizer">
            <TextInput value={form.organizer} onChange={v => update('organizer', v)} placeholder="e.g., Anonimus Foundation" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={v => update('description', v)} rows={3} />
          </Field>
        </FormSection>

        <FormSection title="Verification scope" description="Define the uniqueness boundary. One registration per person, within this campaign.">
          <Field label="Scope identifier">
            <TextInput value={form.scope} onChange={v => update('scope', v)} placeholder="e.g., airdrop-r1-2026" />
          </Field>
          <div style={{
            background: 'rgba(198, 163, 90, 0.06)',
            border: '1px solid rgba(198, 163, 90, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
          }}>
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              margin: 0,
            }}>
              This scope controls where uniqueness applies. A person verified here can still be verified separately elsewhere.
            </p>
          </div>
        </FormSection>

        <FormSection title="Schedule" description="When the campaign is active.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Start date">
              <DateInput value={form.startDate} onChange={v => update('startDate', v)} />
            </Field>
            <Field label="End date">
              <DateInput value={form.endDate} onChange={v => update('endDate', v)} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Purpose" description="What the verified-human registration is used for.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
            {PURPOSE_TYPES.map(pt => (
              <button
                key={pt.value}
                onClick={() => update('purposeType', pt.value)}
                style={{
                  padding: 'var(--space-4)',
                  background: form.purposeType === pt.value ? 'var(--accent-muted)' : 'var(--bg-primary)',
                  border: `1px solid ${form.purposeType === pt.value ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  fontWeight: form.purposeType === pt.value ? 600 : 400,
                  color: form.purposeType === pt.value ? 'var(--accent)' : 'var(--text-primary)',
                  marginBottom: 'var(--space-1)',
                }}>{pt.label}</div>
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.6875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                }}>{pt.desc}</div>
              </button>
            ))}
          </div>
          <Field label="Purpose description (optional)">
            <TextInput value={form.purpose} onChange={v => update('purpose', v)} placeholder="Brief explanation of campaign purpose" />
          </Field>
        </FormSection>

        <FormSection title="Result handling" description="What you can and cannot obtain from registrations.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
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
              }}>Registration gives you</div>
              {['Verified-human status', 'Campaign-scoped uniqueness', 'Registered wallet handle'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="var(--success)" strokeWidth="1" />
                    <path d="M4.5 7L6.5 9L9.5 5" stroke="var(--success)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
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
              }}>It does not give you</div>
              {['Name', 'Real-world identity', 'Biometrics', 'Private credential', 'A global identity'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="var(--error)" strokeWidth="1" />
                    <path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="var(--error)" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </FormSection>

        <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreate}
            disabled={!isValid || submitting}
            style={{ flex: 1 }}
          >
            {submitting ? 'Creating...' : 'Create Campaign'}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/campaigns')}
            style={{ flex: 0 }}
          >
            Cancel
          </Button>
        </div>

        {error && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'rgba(201, 122, 114, 0.08)',
            border: '1px solid rgba(201, 122, 114, 0.2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--error)', lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {!isValid && missingFields.length > 0 && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
              Please fill in:
            </p>
            <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', listStyleType: 'disc' }}>
              {missingFields.map((f, i) => (
                <li key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  )
}
