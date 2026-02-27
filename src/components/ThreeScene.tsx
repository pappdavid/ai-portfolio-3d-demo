'use client'

import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Sphere, Line, Environment } from '@react-three/drei'
import { useControls } from 'leva'
import * as THREE from 'three'

export interface DataPoint {
  label: string
  value: number
  color: string
}

export interface SceneConfig {
  type: 'globe' | 'neural' | 'helix'
  data: DataPoint[]
  title?: string
}

// ── Globe Scene ──────────────────────────────────────────────────────────────

function GlobePoint({
  position,
  color,
  size,
  label,
  value,
}: {
  position: [number, number, number]
  color: string
  size: number
  label: string
  value: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <Html distanceFactor={8} center>
        <div
          style={{
            background: 'rgba(0,0,0,0.8)',
            border: `1px solid ${color}`,
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '11px',
            color: '#fff',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {label}: {value}%
        </div>
      </Html>
    </group>
  )
}

function GlobeScene({ data }: { data: DataPoint[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const { rotationSpeed } = useControls('Globe', { rotationSpeed: { value: 0.3, min: 0, max: 2 } })

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * rotationSpeed
  })

  const points = useMemo(() => {
    return data.map((d, i) => {
      const phi = Math.acos(-1 + (2 * i) / data.length)
      const theta = Math.sqrt(data.length * Math.PI) * phi
      const r = 2.2
      return {
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ] as [number, number, number],
        size: 0.05 + (d.value / 100) * 0.15,
        ...d,
      }
    })
  }, [data])

  return (
    <group ref={groupRef}>
      {/* Wireframe globe */}
      <Sphere args={[2, 32, 32]}>
        <meshStandardMaterial color="#1e293b" wireframe opacity={0.3} transparent />
      </Sphere>
      {/* Data points */}
      {points.map((p, i) => (
        <GlobePoint key={i} position={p.position} color={p.color} size={p.size} label={p.label} value={p.value} />
      ))}
    </group>
  )
}

// ── Neural Network Scene ──────────────────────────────────────────────────────

function NeuralScene({ data }: { data: DataPoint[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const { rotationSpeed } = useControls('Neural', { rotationSpeed: { value: 0.1, min: 0, max: 1 } })

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * rotationSpeed
  })

  const layers = [1, 3, data.length, 2, 1]
  const layerX = [-3, -1.5, 0, 1.5, 3]

  const nodes = useMemo(() => {
    return layers.map((count, li) => {
      return Array.from({ length: count }, (_, ni) => {
        const y = (ni - (count - 1) / 2) * 1.2
        return { position: [layerX[li], y, 0] as [number, number, number], li, ni }
      })
    })
  }, [])

  const edges = useMemo(() => {
    const lines: { start: [number, number, number]; end: [number, number, number] }[] = []
    for (let l = 0; l < nodes.length - 1; l++) {
      for (const a of nodes[l]) {
        for (const b of nodes[l + 1]) {
          lines.push({ start: a.position, end: b.position })
        }
      }
    }
    return lines
  }, [nodes])

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((e, i) => (
        <Line key={i} points={[e.start, e.end]} color="#334155" lineWidth={0.5} opacity={0.4} transparent />
      ))}
      {/* Input/output layer nodes */}
      {nodes.slice(0, 1)
        .concat(nodes.slice(-1))
        .flat()
        .map((n, i) => (
          <mesh key={`io-${i}`} position={n.position}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={0.3} />
          </mesh>
        ))}
      {/* Hidden + data layer nodes */}
      {data.map((d, i) => {
        const n = nodes[2][i]
        if (!n) return null
        return (
          <group key={i} position={n.position}>
            <mesh>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={0.5} />
            </mesh>
            <Html distanceFactor={6} center>
              <div
                style={{
                  background: 'rgba(0,0,0,0.85)',
                  border: `1px solid ${d.color}`,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {d.label.split(' ')[0]}: {d.value}%
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

// ── Helix Timeline Scene ──────────────────────────────────────────────────────

function HelixScene({ data }: { data: DataPoint[] }) {
  const groupRef = useRef<THREE.Group>(null)
  const { rotationSpeed } = useControls('Helix', { rotationSpeed: { value: 0.15, min: 0, max: 1 } })

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * rotationSpeed
  })

  const helixPoints = useMemo(() => {
    return data.map((d, i) => {
      const t = (i / (data.length - 1)) * Math.PI * 2
      const r = 1.5
      return {
        position: [r * Math.cos(t), i * 0.7 - (data.length * 0.7) / 2, r * Math.sin(t)] as [
          number,
          number,
          number,
        ],
        ...d,
      }
    })
  }, [data])

  // Helix curve points for the tube
  const curvePoints = useMemo(() => {
    return Array.from({ length: 64 }, (_, i) => {
      const t = (i / 63) * Math.PI * 2
      const y = (i / 63) * data.length * 0.7 - (data.length * 0.7) / 2
      return new THREE.Vector3(1.5 * Math.cos(t), y, 1.5 * Math.sin(t))
    })
  }, [data.length])

  return (
    <group ref={groupRef}>
      {/* Helix tube */}
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(curvePoints), 64, 0.02, 8, false]} />
        <meshStandardMaterial color="#334155" opacity={0.5} transparent />
      </mesh>
      {/* Data nodes */}
      {helixPoints.map((p, i) => (
        <group key={i} position={p.position}>
          <mesh>
            <sphereGeometry args={[0.12 + (p.value / 100) * 0.08, 16, 16]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} />
          </mesh>
          <Html distanceFactor={6} center>
            <div
              style={{
                background: 'rgba(0,0,0,0.85)',
                border: `1px solid ${p.color}`,
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                color: '#fff',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {p.label.split(' ').slice(0, 2).join(' ')}: {p.value}%
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

// ── Main ThreeScene Component ─────────────────────────────────────────────────

export default function ThreeScene({ config }: { config: SceneConfig }) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900" style={{ height: '380px' }}>
      {config.title && (
        <div className="px-4 py-2 text-sm font-medium text-slate-300 border-b border-slate-700 bg-slate-800/50">
          {config.title}
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', height: config.title ? 'calc(100% - 37px)' : '100%' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#818cf8" />

        <Suspense fallback={null}>
          <Environment preset="night" />
          {config.type === 'globe' && <GlobeScene data={config.data} />}
          {config.type === 'neural' && <NeuralScene data={config.data} />}
          {config.type === 'helix' && <HelixScene data={config.data} />}
        </Suspense>

        <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
      </Canvas>
    </div>
  )
}
