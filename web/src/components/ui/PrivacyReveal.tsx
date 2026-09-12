import { useRef, useEffect, useState } from 'react'

export function PrivacyReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const posRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: -100, y: -100 })

  const willLearn = ['Verified human', 'Unique inside this scope']
  const willNotLearn = ['Name', 'Biometrics', 'Credential', 'Cross-campaign identity']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      targetRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const handleMouseEnter = () => setRevealed(true)

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseenter', handleMouseEnter)

    let raf: number
    const draw = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.12
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.12

      ctx.clearRect(0, 0, rect.width, rect.height)

      if (revealed) {
        const gradient = ctx.createRadialGradient(
          posRef.current.x, posRef.current.y, 0,
          posRef.current.x, posRef.current.y, 120
        )
        gradient.addColorStop(0, 'rgba(198, 163, 90, 0.06)')
        gradient.addColorStop(0.6, 'rgba(198, 163, 90, 0.02)')
        gradient.addColorStop(1, 'rgba(198, 163, 90, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, rect.width, rect.height)

        ctx.beginPath()
        ctx.arc(posRef.current.x, posRef.current.y, 100, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(198, 163, 90, 0.15)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(raf)
    }
  }, [revealed])

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, cursor: 'none' }}
      />

      <div style={{ padding: 'var(--space-8)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
          What the campaign receives
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
              Visible
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {willLearn.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Hidden
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {willNotLearn.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.3 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', filter: revealed ? 'none' : 'blur(4px)', transition: 'filter 0.6s ease' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(7,8,10,0.3) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
    </div>
  )
}
