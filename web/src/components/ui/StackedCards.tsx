import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from '../../hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  { n: '01', title: 'Obtain attestation', body: 'A personhood verifier confirms you are human and issues a signed attestation. Anonimus never sees the biometric capture. It only receives the signed claim.' },
  { n: '02', title: 'Deploy the privacy layer', body: 'Your credential is registered on Midnight. A nullifier is derived from it so the same person cannot prove twice in one scope, while the underlying identity stays hidden.' },
  { n: '03', title: 'Prove humanity', body: 'When a campaign or app asks for proof, you generate a zero-knowledge proof. The proof shows a valid attestation and unused nullifier for this scope. It does not show who you are.' },
  { n: '04', title: 'Verified participation', body: 'The campaign receives a minimal result: one verified human, one participation in this scope. Your name, biometric data, and credential stay private.' },
]

export function StackedCards() {
  const pinRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const pin = pinRef.current
    if (!pin) return

    const cards = gsap.utils.toArray<HTMLElement>('[data-stack-card]', pin)
    if (cards.length < 2) return

    gsap.set(cards[0], { y: '0%' })
    gsap.set(cards.slice(1), { y: '110%' })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      },
    })

    cards.slice(1).forEach((card, i) => {
      tl.to(card, { y: `${16 * (i + 1)}px`, duration: 1, ease: 'none' }, i)
    })

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [reduced])

  if (reduced) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', paddingInline: 24 }}>
        <div className="how-head" style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Mechanism</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 400, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 12 }}>How proof works</h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>Four steps. No identity exposed at any point.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {STEPS.map((step) => (
            <div key={step.n} style={{ background: '#12151A', border: '1px solid rgba(243,238,228,0.08)', borderRadius: 20, padding: 40 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 400, color: '#C6A35A', opacity: 0.5, lineHeight: 1, marginBottom: 16 }}>{step.n}</div>
              <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontSize: 16, color: '#B8B3A8', lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section id="how-it-works" style={{ width: '100%', paddingInline: 24 }}>
      <div className="how-head" style={{ maxWidth: 720, margin: '0 auto 32px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Mechanism</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', fontWeight: 400, lineHeight: 1.15, color: 'var(--text-primary)', marginBottom: 12 }}>How proof works</h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>Four steps. No identity exposed at any point.</p>
      </div>

      <div
        ref={pinRef}
        className="stack-pin"
        style={{
          height: '400vh',
          width: 'min(720px, calc(100% - 48px))',
          marginInline: 'auto',
        }}
      >
        <div
          className="stack-sticky"
          style={{
            position: 'sticky',
            top: '18vh',
            height: '62vh',
            overflow: 'hidden',
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              data-stack-card
              className="stack-card"
              style={{
                position: 'absolute',
                inset: 0,
                background: '#12151A',
                border: '1px solid rgba(243,238,228,0.08)',
                borderRadius: 20,
                padding: 40,
                transform: i === 0 ? 'translateY(0)' : 'translateY(110%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 400, color: '#C6A35A', opacity: 0.5, lineHeight: 1, marginBottom: 16 }}>{step.n}</div>
              <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontSize: 16, color: '#B8B3A8', lineHeight: 1.7, maxWidth: 560 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
