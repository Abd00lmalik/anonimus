import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function CursorTorch() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    let raf: number
    const animate = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.08
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.08

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createRadialGradient(
        posRef.current.x, posRef.current.y, 0,
        posRef.current.x, posRef.current.y, 160
      )
      gradient.addColorStop(0, 'rgba(198, 163, 90, 0.035)')
      gradient.addColorStop(0.5, 'rgba(198, 163, 90, 0.012)')
      gradient.addColorStop(1, 'rgba(198, 163, 90, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.beginPath()
      ctx.arc(posRef.current.x, posRef.current.y, 8, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(198, 163, 90, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()

      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  )
}
