"use client"

// PedSim — 3D talking avatar (ARCHITECTURE.md §2.6).
// Renders a Ready Player Me GLB (with ARKit/Oculus viseme morph targets) when
// an avatar URL is supplied, and always degrades to a self-contained stylized
// 3D head so the encounter never blanks. The mouth lip-syncs to the spoken
// reply, with idle blinking and head motion.

import {
  Component,
  Suspense,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"

export interface AvatarStageProps {
  speaking: boolean
  speaker: "child" | "parent" | null
  /** rapport 0-100 → subtle warmth/smile */
  mood?: number
  /** Optional Ready Player Me (or any morph-target) GLB URL. */
  avatarUrl?: string | null
}

// A little shared clock helper: while `speaking`, produce a lively mouth-open
// signal in [0,1]; otherwise ease shut.
function useMouth(speaking: boolean) {
  const mouth = useRef(0)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    let target = 0
    if (speaking) {
      // layered sines + offset → natural, non-robotic articulation
      const s =
        0.5 +
        0.32 * Math.sin(t * 14) +
        0.18 * Math.sin(t * 27 + 1.3) +
        0.1 * Math.sin(t * 41 + 0.7)
      target = Math.min(1, Math.max(0, s))
    }
    mouth.current += (target - mouth.current) * 0.35
  })
  return mouth
}

function useBlink() {
  const blink = useRef(0)
  const next = useRef(1.5)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t > next.current) {
      next.current = t + 2 + Math.random() * 3
      blink.current = 1
    }
    blink.current += (0 - blink.current) * 0.25 // quick reopen
  })
  return blink
}

// ── Stylized primitive head (always available) ────────────────────────────

function PrimitiveHead({
  speaking,
  mood = 20,
  speaker,
}: {
  speaking: boolean
  mood?: number
  speaker: "child" | "parent" | null
}) {
  const group = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const eyeL = useRef<THREE.Group>(null)
  const eyeR = useRef<THREE.Group>(null)
  const mouth = useMouth(speaking)
  const blink = useBlink()
  const smile = Math.min(1, Math.max(0, (mood - 30) / 60))

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.5) * 0.12
      group.current.rotation.x = Math.sin(t * 0.7) * 0.04
      group.current.position.y = 0.32 + Math.sin(t * 1.1) * 0.012
    }
    if (mouthRef.current) {
      const open = mouth.current
      mouthRef.current.scale.set(0.5 + smile * 0.28, 0.12 + open * 0.6, 0.6)
      mouthRef.current.position.y = -0.42 + smile * 0.02
    }
    // Cartoon blink: squash the whole eye vertically for a moment.
    const eyeScale = 1 - blink.current * 0.85
    if (eyeL.current) eyeL.current.scale.y = eyeScale
    if (eyeR.current) eyeR.current.scale.y = eyeScale
  })

  const skin = "#f2c9a8"
  const hair = speaker === "parent" ? "#5b3a29" : "#7b4a2d"

  return (
    <group ref={group} position={[0, 0.32, 0]}>
      {/* head */}
      <mesh castShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* hair cap */}
      <mesh position={[0, 0.42, -0.05]} scale={[1.03, 0.8, 1.03]}>
        <sphereGeometry args={[1, 40, 40, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={hair} roughness={0.9} />
      </mesh>
      {/* ears */}
      <mesh position={[-1, -0.02, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[1, -0.02, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* eyes (whole eye squashes to blink) */}
      {[-0.36, 0.36].map((x, i) => (
        <group key={i} ref={i === 0 ? eyeL : eyeR} position={[x, 0.14, 0.84]}>
          <mesh>
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.01, 0.15]}>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshStandardMaterial color="#4a3527" roughness={0.2} />
          </mesh>
          <mesh position={[0.03, 0.03, 0.2]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
          </mesh>
        </group>
      ))}
      {/* eyebrows */}
      {[-0.36, 0.36].map((x, i) => (
        <mesh key={i} position={[x, 0.46, 0.92]} rotation={[0, 0, x < 0 ? 0.06 : -0.06]}>
          <boxGeometry args={[0.26, 0.045, 0.06]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
      ))}
      {/* nose */}
      <mesh position={[0, -0.12, 1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* mouth (lip-syncs) */}
      <mesh ref={mouthRef} position={[0, -0.42, 0.9]}>
        <sphereGeometry args={[0.3, 24, 16]} />
        <meshStandardMaterial color="#a8433f" roughness={0.5} />
      </mesh>
      {/* cheeks (warmth rises with rapport) */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, -0.18, 0.82]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial
            color="#f0a58c"
            transparent
            opacity={0.15 + smile * 0.5}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Ready Player Me GLB (viseme morph targets) ────────────────────────────

function GlbAvatar({
  url,
  speaking,
}: {
  url: string
  speaking: boolean
}) {
  const { scene } = useGLTF(url)
  const root = useRef<THREE.Group>(null)
  const mouth = useMouth(speaking)
  const blink = useBlink()

  // Collect meshes that carry morph targets once.
  const morphMeshes = useMemo(() => {
    const meshes: THREE.Mesh[] = []
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.morphTargetDictionary && m.morphTargetInfluences)
        meshes.push(m)
    })
    return meshes
  }, [scene])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (root.current) root.current.rotation.y = Math.sin(t * 0.4) * 0.08
    for (const m of morphMeshes) {
      const dict = m.morphTargetDictionary!
      const inf = m.morphTargetInfluences!
      const set = (name: string, v: number) => {
        const idx = dict[name]
        if (idx !== undefined) inf[idx] = v
      }
      const open = mouth.current
      // Jaw + a couple of visemes for a fuller articulation.
      set("jawOpen", open * 0.7)
      set("mouthOpen", open * 0.6)
      set("viseme_aa", open * 0.7)
      set("viseme_O", open * 0.3)
      const b = blink.current
      set("eyeBlinkLeft", b)
      set("eyeBlinkRight", b)
      set("eyesClosed", b)
    }
  })

  // RPM avatars are full-body & ~1.7m tall — drop the body and frame the head.
  return (
    <group ref={root} position={[0, -1.45, 0]}>
      <primitive object={scene} />
    </group>
  )
}

// ── Error boundary: GLB failure → primitive head ──────────────────────────

class AvatarBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// ── Stage ─────────────────────────────────────────────────────────────────

export default function AvatarStage({
  speaking,
  speaker,
  mood = 20,
  avatarUrl,
}: AvatarStageProps) {
  const useGlb = Boolean(avatarUrl && /^https?:\/\//.test(avatarUrl))
  const primitive = (
    <PrimitiveHead speaking={speaking} mood={mood} speaker={speaker} />
  )

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: useGlb ? [0, 0.1, 0.95] : [0, 0.32, 4.7], fov: 32 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#eef2f8"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 3, 4]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 1, 2]} intensity={0.4} />
      <Suspense fallback={primitive}>
        {useGlb ? (
          <AvatarBoundary fallback={primitive}>
            <GlbAvatar url={avatarUrl as string} speaking={speaking} />
          </AvatarBoundary>
        ) : (
          primitive
        )}
      </Suspense>
    </Canvas>
  )
}
