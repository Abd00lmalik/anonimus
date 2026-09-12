import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { OccludedSeal } from '../components/three/OccludedSeal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { SectionReveal } from '../components/ui/SectionReveal'
import { DisclosurePanel } from '../components/ui/DisclosurePanel'
import { StackedCards } from '../components/ui/StackedCards'
import { ScopedProof } from '../components/ui/ScopedProof'
import { Footer } from '../components/layout/Footer'

const willNeverLeave = ['Your name', 'Your biometric data', 'Your credential secret', 'Your identity']
const canBeProven = ['You are human', 'You are unique within this scope', 'Your attestation is valid', 'You have not proven in this campaign']

function ComparisonTable() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const rows = [
    { label: 'Personal Data', others: 'Collected & stored', anonimus: 'None stored' },
    { label: 'Biometric Templates', others: 'Centralized database', anonimus: 'Processed locally, discarded' },
    { label: 'Identity Linkage', others: 'Cross-platform tracking', anonimus: 'Cryptographically prevented' },
    { label: 'Third-Party Sharing', others: 'Frequent', anonimus: 'Never' },
    { label: 'Proof of Uniqueness', others: 'Not possible', anonimus: 'Built-in via nullifiers' },
  ]

  return (
    <div ref={ref} style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 520 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Feature</span>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '16px 20px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Other platforms</span>
          </div>
          <div style={{ padding: '16px 20px', borderLeft: '1px solid var(--accent)', background: 'rgba(198,163,90,0.04)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Anonimus</span>
          </div>

          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              style={{ display: 'contents' }}
            >
              <div style={{ background: 'var(--bg-primary)', padding: '18px 20px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{row.label}</span>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '18px 20px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{row.others}</span>
              </div>
              <div style={{ background: 'rgba(198,163,90,0.02)', padding: '18px 20px', borderTop: '1px solid var(--border)', borderLeft: '1px solid rgba(198,163,90,0.15)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{row.anonimus}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const sealScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.88])
  const sealY = useTransform(scrollYProgress, [0, 0.2], [0, 30])
  const sealOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.7])

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero */}
      <section
        ref={heroRef}
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--nav-height) var(--space-8) var(--space-16)',
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', alignItems: 'center', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', zIndex: 2 }}
          >
            <Badge variant="accent" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginRight: 6 }} />
              Built on Midnight Network
            </Badge>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400,
              lineHeight: 1.08,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-6)',
              letterSpacing: '-0.02em',
            }}>
              Prove you&rsquo;re human.
              <br />
              <span style={{ color: 'var(--text-muted)' }}>Reveal nothing else.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(0.9375rem, 1.3vw, 1.0625rem)',
              color: 'var(--text-muted)',
              maxWidth: 440,
              lineHeight: 1.7,
              marginBottom: 'var(--space-8)',
            }}>
              Zero-knowledge proof of humanity. You can verify personhood without exposing who you are.
              One person, one proof. No tracking, no data collection, and no compromise.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Button size="lg" onClick={() => navigate('/campaigns')}>Start Verification</Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/campaigns')}>View Campaigns</Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', height: 480, position: 'relative' }}
          >
            <motion.div style={{ scale: sealScale, y: sealY, opacity: sealOpacity, width: '100%', height: '100%' }}>
              <OccludedSeal />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The Problem */}
      <SectionReveal>
        <section style={{ padding: 'var(--space-24) var(--space-8)', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--space-16)', maxWidth: 600 }}>
            <Badge variant="muted" style={{ marginBottom: 'var(--space-4)' }}>The Problem</Badge>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              fontWeight: 400,
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-4)',
            }}>
              What remains hidden, remains <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>safe</em>.
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Traditional identity verification requires you to surrender personal data. Anonimus proves humanity without exposing identity.
            </p>
          </div>
          <ComparisonTable />
        </section>
      </SectionReveal>

      {/* How Proof Works - Stacked Cards */}
      <SectionReveal>
        <StackedCards />
      </SectionReveal>

      {/* Transparency */}
      <SectionReveal>
        <section style={{ padding: 'var(--space-24) var(--space-8)', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', alignItems: 'start' }}>
            <div>
              <Badge variant="accent" style={{ marginBottom: 'var(--space-4)' }}>Transparency</Badge>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                fontWeight: 400,
                lineHeight: 1.15,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-6)',
              }}>
                Everything we know, <em style={{ fontStyle: 'italic' }}>nothing more</em>.
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 'var(--space-8)' }}>
                We believe in radical transparency. Before you verify, you should know exactly what the protocol can and cannot see.
              </p>

              <div>
                <DisclosurePanel title="What data does Anonimus collect?">
                  Anonimus collects no personal data. The protocol operates entirely through zero-knowledge proofs. Your biometric data is processed locally and never transmitted.
                </DisclosurePanel>
                <DisclosurePanel title="Can my identity be linked across campaigns?">
                  No. Each campaign generates a unique nullifier derived from your credential and campaign ID. Cross-campaign linking is cryptographically impossible.
                </DisclosurePanel>
                <DisclosurePanel title="What happens if the attestation database is compromised?">
                  Your attestation is stored on Midnight Network&rsquo;s private state. Even if compromised, no personally identifiable information exists, only cryptographic commitments.
                </DisclosurePanel>
                <DisclosurePanel title="Is my biometric data stored?">
                  Biometric data is processed through a secure enclave during attestation and immediately discarded. No biometric templates are stored or transmitted.
                </DisclosurePanel>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <Card variant="outlined" padding="lg">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-6)' }}>
                  Will never leave you
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {willNeverLeave.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="outlined" padding="lg">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 'var(--space-6)' }}>
                  Can be proven
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {canBeProven.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', opacity: 0.5 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* Scoped Proof */}
      <SectionReveal>
        <section style={{ padding: 'var(--space-24) var(--space-8)', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <ScopedProof />
        </section>
      </SectionReveal>

      {/* Developers */}
      <SectionReveal>
        <section style={{ padding: 'var(--space-24) var(--space-8)', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <Card variant="outlined" padding="lg" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(198,163,90,0.05) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Badge variant="accent" style={{ marginBottom: 'var(--space-6)' }}>Developers</Badge>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: 'var(--space-4)',
              }}>
                Build with Anonimus
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto auto var(--space-4)', lineHeight: 1.7 }}>
                Send the user. Receive a receipt. Never receive a person.
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto var(--space-8)', lineHeight: 1.7 }}>
                Integrate zero-knowledge humanity verification into your application. Simple SDK, powerful guarantees.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
                <Button>View Documentation</Button>
                <Button variant="secondary">GitHub</Button>
                <Button variant="ghost">Open Dashboard</Button>
              </div>
            </div>
          </Card>
        </section>
      </SectionReveal>

      <Footer />

      <style>{`
        @media (max-width: 900px) {
          section > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
