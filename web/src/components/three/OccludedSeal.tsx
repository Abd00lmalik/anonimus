import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SealState } from '../../types'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const DIAMETER = 1.8
const RADIUS = DIAMETER / 2
const THICKNESS = DIAMETER / 10

function TokenBody() {
  const geo = useMemo(() => {
    return new THREE.CylinderGeometry(RADIUS, RADIUS, THICKNESS, 64)
  }, [])

  return (
    <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
      <meshPhysicalMaterial
        color="#14161A"
        roughness={0.5}
        metalness={0.2}
        clearcoat={0.3}
        clearcoatRoughness={0.4}
        envMapIntensity={0.08}
      />
    </mesh>
  )
}

function Rim() {
  const geo = useMemo(() => {
    return new THREE.CylinderGeometry(RADIUS + 0.005, RADIUS + 0.005, THICKNESS, 64, 1, true)
  }, [])

  return (
    <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#C6A35A"
        metalness={0.85}
        roughness={0.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function FaceA() {
  const outerGeo = useMemo(() => new THREE.RingGeometry(RADIUS * 0.15, RADIUS * 0.85, 64), [])

  return (
    <group position={[0, 0, THICKNESS / 2 + 0.001]}>
      <mesh geometry={outerGeo}>
        <meshBasicMaterial color="#3A3D44" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function InterruptedCircle({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2 - 0.5, false, 0)
    const pts = curve.getPoints(80).map(p => new THREE.Vector3(p.x, p.y, 0))
    const path = new THREE.CatmullRomCurve3(pts)
    return new THREE.TubeGeometry(path, 80, 0.015, 8, false)
  }, [radius])

  return <mesh geometry={geo} />
}

function FaceB() {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef} position={[0, 0, -(THICKNESS / 2 + 0.001)]} rotation={[0, Math.PI, 0]}>
      <InterruptedCircle radius={RADIUS * 0.7} />
    </group>
  )
}

function TokenRig({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const reduced = useReducedMotion()
  const yawRef = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (!reduced) {
      yawRef.current += delta * (Math.PI * 2 / 16)
      groupRef.current.rotation.y = yawRef.current

      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.04
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.04
      groupRef.current.rotation.x = -0.3 + currentRef.current.y * 0.15
      groupRef.current.rotation.z = currentRef.current.x * 0.08
    }
  })

  return (
    <group
      ref={groupRef}
      rotation={[-0.3, 0, 0]}
      onPointerMove={(e) => {
        if (reduced) return
        targetRef.current.x = THREE.MathUtils.clamp(e.point.x * 0.5, -0.15, 0.15)
        targetRef.current.y = THREE.MathUtils.clamp(e.point.y * 0.5, -0.15, 0.15)
      }}
      onPointerLeave={() => {
        targetRef.current.x = 0
        targetRef.current.y = 0
      }}
    >
      {children}
    </group>
  )
}

interface OccludedSealProps {
  state?: SealState
  style?: React.CSSProperties
}

export function OccludedSeal({ style }: OccludedSealProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      <Canvas
        camera={{ position: [0, 0.3, 4], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        style={{ background: 'transparent' }}
        scene={{ background: null }}
      >
        <spotLight
          position={[3, 2, 2]}
          angle={0.3}
          penumbra={0.9}
          intensity={4.0}
          color="#E2C07A"
          distance={18}
          decay={2}
        />
        <spotLight
          position={[-2, 0.5, -2]}
          angle={0.5}
          penumbra={1}
          intensity={0.8}
          color="#8A9BB0"
          distance={12}
          decay={2}
        />
        <TokenRig>
          <group rotation={[0, 0, 0]}>
            <TokenBody />
            <Rim />
            <FaceA />
            <FaceB />
          </group>
        </TokenRig>
      </Canvas>
    </div>
  )
}
