import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDeveloper } from '../contexts/DeveloperContext'
import { Button } from '../components/ui/Button'

const CLAIM_OPTIONS = [
  'Verified human',
  'Unique within this scope',
  'Over 18',
  'KYC verified',
  'Resident of region',
]

const EXPIRY_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
]

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

function NumberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min="0"
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

export function CreateVerificationRequestPage() {
  const navigate = useNavigate()
  const { createRequest } = useDeveloper()
  const [form, setForm] = useState({
    appName: '',
    scope: '',
    description: '',
    returnUrl: '',
    requestedClaims: ['Verified human'] as string[],
    expiresInDays: 90,
    maxVerifications: '',
  })

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleClaim = (claim: string) => {
    setForm(prev => ({
      ...prev,
      requestedClaims: prev.requestedClaims.includes(claim)
        ? prev.requestedClaims.filter(c => c !== claim)
        : [...prev.requestedClaims, claim],
    }))
  }

  const isValid = form.appName.trim() && form.scope.trim() && form.returnUrl.trim() && form.requestedClaims.length > 0

  const handleCreate = () => {
    if (!isValid) return
    const created = createRequest({
      appName: form.appName,
      scope: form.scope,
      description: form.description,
      returnUrl: form.returnUrl,
      requestedClaims: form.requestedClaims,
      maxVerifications: form.maxVerifications ? parseInt(form.maxVerifications) : null,
      expiresInDays: form.expiresInDays,
    })
    navigate(`/developers/requests/${created.id}/created`)
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
          }}>New verification request</h1>
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 520,
          }}>
            Define a verification scope for your DApp. Users will verify privately.
            You will receive a signed cryptographic receipt.
          </p>
        </div>

        <FormSection title="Application identity" description="Identify your DApp and verification scope.">
          <Field label="Application name">
            <TextInput value={form.appName} onChange={v => update('appName', v)} placeholder="e.g., My Governance DApp" />
          </Field>
          <Field label="Scope identifier">
            <TextInput value={form.scope} onChange={v => update('scope', v)} placeholder="e.g., my-dapp-v1" />
          </Field>
          <Field label="Description">
            <TextInput value={form.description} onChange={v => update('description', v)} placeholder="Brief description of what verification is for" />
          </Field>
        </FormSection>

        <FormSection title="Return URL" description="Where users return after verification.">
          <Field label="Callback URL">
            <TextInput value={form.returnUrl} onChange={v => update('returnUrl', v)} placeholder="https://yourapp.com/verify-callback" />
          </Field>
        </FormSection>

        <FormSection title="Claims" description="What the verification will establish for each user.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            {CLAIM_OPTIONS.map(claim => (
              <button
                key={claim}
                onClick={() => toggleClaim(claim)}
                style={{
                  padding: '8px 16px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '0.8125rem',
                  color: form.requestedClaims.includes(claim) ? 'var(--accent)' : 'var(--text-secondary)',
                  background: form.requestedClaims.includes(claim) ? 'var(--accent-muted)' : 'var(--bg-primary)',
                  border: `1px solid ${form.requestedClaims.includes(claim) ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
              >
                {claim}
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title="Limits" description="Control verification volume and expiry.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Field label="Max verifications (optional)">
              <NumberInput value={form.maxVerifications} onChange={v => update('maxVerifications', v)} placeholder="Unlimited" />
            </Field>
            <Field label="Expires in">
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(prev => ({ ...prev, expiresInDays: opt.value }))}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '0.75rem',
                      color: form.expiresInDays === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                      background: form.expiresInDays === opt.value ? 'var(--accent-muted)' : 'var(--bg-primary)',
                      border: `1px solid ${form.expiresInDays === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--duration-fast) var(--ease-out)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Result handling" description="What you can and cannot obtain from verifications.">
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
              }}>You receive</div>
              {['Signed verification receipt', 'Scope-scoped uniqueness proof', 'Nullifier (anti-replay)'].map((item, i) => (
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
              }}>You never receive</div>
              {['User identity', 'Biometrics', 'Wallet private key', 'Real-world identity'].map((item, i) => (
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
            disabled={!isValid}
            style={{ flex: 1 }}
          >
            Create Request
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/developers/workspace')}
            style={{ flex: 0 }}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
