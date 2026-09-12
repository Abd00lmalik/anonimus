import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Button } from './Button'

const stations = [
  { num: '1', title: 'Enter a scope', desc: 'A campaign or app defines a room and a uniqueness boundary.' },
  { num: '2', title: 'Prove once', desc: 'You present a proof for that room only.' },
  { num: '3', title: 'Stay unknown', desc: 'The room learns human and unique here. It does not learn your name.' },
]

const willLearn = ['Verified human', 'Unique in this scope']
const willNotLearn = ['Name', 'Biometrics', 'Credential', 'Who you are']

function PathDiagram() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <div ref={ref} style={{ position: 'relative', height: 240, marginBottom: 48 }}>
      <svg
        width="100%"
        height="240"
        viewBox="0 0 1000 240"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <motion.path
          d="M 170 60 L 430 60 L 570 170 L 830 170"
          fill="none"
          stroke="#C6A35A"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={inView ? { pathLength: 1, opacity: 0.35 } : {}}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {/* Row 1: station 1 in col 1 */}
          <div style={{ padding: '0 16px' }}>
            <StationCard station={stations[0]} delay={0.3} inView={inView} />
          </div>
          <div />
          <div />

          {/* Row 2: station 2 in col 2, station 3 in col 3 */}
          <div />
          <div style={{ padding: '0 16px' }}>
            <StationCard station={stations[1]} delay={0.45} inView={inView} />
          </div>
          <div style={{ padding: '0 16px' }}>
            <StationCard station={stations[2]} delay={0.6} inView={inView} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StationCard({ station, delay, inView }: { station: typeof stations[number]; delay: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{
        background: '#12151A',
        padding: '16px 20px',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1.5px solid #C6A35A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        color: '#C6A35A',
        background: 'rgba(198,163,90,0.08)',
      }}>
        {station.num}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{station.title}</div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{station.desc}</p>
    </motion.div>
  )
}

function PrivacyTorch() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const reduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  const isTouch = typeof window !== 'undefined'
    ? 'ontouchstart' in window
    : false

  const showStatic = reduced || isTouch

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showStatic) return
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
        What this room receives
      </div>

      <div
        ref={fieldRef}
        className="reveal"
        onMouseMove={handleMove}
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(243,238,228,0.08)',
          background: '#181C23',
        }}
      >
        {!showStatic && (
          <div
            className="reveal-veil"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              pointerEvents: 'none',
              background: 'rgba(7, 8, 10, 0.92)',
              maskImage: `radial-gradient(140px circle at ${pos.x}px ${pos.y}px, transparent 0 70px, black 140px)`,
              WebkitMaskImage: `radial-gradient(140px circle at ${pos.x}px ${pos.y}px, transparent 0 70px, black 140px)`,
            }}
          />
        )}

        <div className="reveal-content" style={{ position: 'relative', zIndex: 1, padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8FBF9A', marginBottom: 12, position: 'relative', zIndex: 4 }}>
              Visible
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {willLearn.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#8FBF9A', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.875rem', color: '#F3EEE4' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, position: 'relative', zIndex: 4 }}>
              Hidden
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {willNotLearn.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.3 }} />
                  <span style={{ fontSize: '0.875rem', color: '#B8B3A8' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!showStatic && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            opacity: 0.5,
            zIndex: 4,
            pointerEvents: 'none',
          }}>
            Move across this field to reveal the disclosure
          </div>
        )}
      </div>
    </div>
  )
}

export function ScopedProof() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 48, maxWidth: 600 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Scoped Proof</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
          fontWeight: 400,
          lineHeight: 1.15,
          color: 'var(--text-primary)',
          marginBottom: 12,
        }}>
          Counted, not identified.
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          A campaign is a bounded room where humanity and uniqueness can be proven without handing over identity.
        </p>
      </div>

      <div style={{
        background: '#12151A',
        border: '1px solid rgba(243,238,228,0.08)',
        borderRadius: 24,
        padding: '48px 40px',
        marginBottom: 32,
      }}>
        <PathDiagram />
        <PrivacyTorch />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="secondary">See available campaigns</Button>
      </div>
    </div>
  )
}
