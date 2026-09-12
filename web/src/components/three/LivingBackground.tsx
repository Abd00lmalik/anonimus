import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../../hooks/useReducedMotion'

function StarField({ count = 600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const reduced = useReducedMotion()

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 8
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current || reduced) return
    ref.current.rotation.y += delta * 0.003
    ref.current.rotation.x += delta * 0.001
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#C6A35A"
        size={0.018}
        transparent
        opacity={0.18}
        sizeAttenuation
      />
    </points>
  )
}

function OrbitalRing({ radius, speed, opacity }: { radius: number; speed: number; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const reduced = useReducedMotion()

  useFrame((_, delta) => {
    if (!ref.current || reduced) return
    ref.current.rotation.z += delta * speed
  })

  return (
    <mesh ref={ref} rotation={[Math.PI / 2.5, 0.3, 0]}>
      <torusGeometry args={[radius, 0.003, 8, 256]} />
      <meshBasicMaterial color="#C6A35A" transparent opacity={opacity} />
    </mesh>
  )
}

function BackgroundScene() {
  return (
    <>
      <StarField count={600} />
      <OrbitalRing radius={7} speed={0.03} opacity={0.05} />
      <OrbitalRing radius={10} speed={0.018} opacity={0.03} />
    </>
  )
}

export function LivingBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55 }}
        dpr={[1, 1]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.01} />
        <BackgroundScene />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 35%, rgba(198,163,90,0.025) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, var(--bg-primary) 80%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
