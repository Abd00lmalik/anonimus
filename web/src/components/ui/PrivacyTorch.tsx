import { useRef, useEffect, useState } from 'react'

const willLearn = ['Verified human', 'Unique in this scope']
const willNotLearn = ['Name', 'Biometrics', 'Credential', 'Who you are']

export function PrivacyTorch() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [maskPos, setMaskPos] = useState({ x: 50, y: 50 })
  const [hasMoved, setHasMoved] = useState(false)
  const reduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  const isTouch = typeof window !== 'undefined'
    ? 'ontouchstart' in window
    : false

  useEffect(() => {
    const el = fieldRef.current
    if (!el || reduced || isTouch) return

    const handleMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      setMaskPos({ x, y })
      if (!hasMoved) setHasMoved(true)
    }

    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [hasMoved, reduced, isTouch])

  const showStatic = reduced || isTouch

  const veilStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: '#07080A',
    opacity: hasMoved ? 0.55 : 0.65,
    zIndex: 2,
    pointerEvents: 'none',
  }

  const maskValue = `radial-gradient(circle 140px at ${maskPos.x}% ${maskPos.y}%, transparent 0%, black 100%)`

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
        What this room receives
      </div>

      <div
        ref={fieldRef}
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(243,238,228,0.08)',
          minHeight: 200,
          background: '#181C23',
        }}
      >
        {!showStatic && (
          <div
            style={{
              ...veilStyle,
              maskImage: maskValue,
              WebkitMaskImage: maskValue,
            }}
          />
        )}

        <div style={{ padding: '32px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, position: 'relative', zIndex: 1 }}>
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

        {!showStatic && !hasMoved && (
          <div style={{
            position: 'absolute',
            bottom: 16,
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
