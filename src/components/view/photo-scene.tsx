'use client'

import type { KeyperPhoto } from '@/lib/placeholder-photos'
import {
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
  useTexture,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FadingSparkles } from './fading-sparkles'
import { GlowFloor } from './glow-floor'
import { makeDecoPortraitTexture } from './view-textures'

const BASE_Y = 2.2 // height of the floating picture's centre
const PIC_HEIGHT = 3
const FRAME_PHOTO_FADE_IN_DURATION = 7

type FrameMaterialConfig = {
  map: string
  normalMap: string
  roughnessMap?: string
  metalnessMap?: string
  metalness: number
  roughness: number
  displacementScale?: number
}

/**
 * PBR material sets the picture frame can use. Each entry lists the texture
 * maps available in its folder under `public/assets/pbr`. Some sets (like the
 * Unity-exported gold) ship only a base colour + normal map, so roughness and
 * metalness fall back to the scalar values below.
 */
const FRAME_MATERIALS = {
  'art-deco-1': {
    map: '/assets/pbr/art-deco-1/material_basecolor.jpeg',
    normalMap: '/assets/pbr/art-deco-1/material_normal.jpeg',
    roughnessMap: '/assets/pbr/art-deco-1/material_roughness.jpeg',
    metalnessMap: '/assets/pbr/art-deco-1/material_metalness.jpeg',
    metalness: 1,
    roughness: 1,
  },
  'art-deco-2': {
    map: '/assets/pbr/art-deco-2/material_basecolor.jpeg',
    normalMap: '/assets/pbr/art-deco-2/material_normal.jpeg',
    roughnessMap: '/assets/pbr/art-deco-2/material_roughness.jpeg',
    metalnessMap: '/assets/pbr/art-deco-2/material_metalness.jpeg',
    metalness: 1,
    roughness: 1,
  },
  'gold-scuffed': {
    map: '/assets/pbr/gold-scuffed-Unity/gold-scuffed_basecolor-boosted.png',
    normalMap: '/assets/pbr/gold-scuffed-Unity/gold-scuffed_normal.png',
    metalness: 1,
    roughness: 0.35, // scuffed gold: glossy with some wear
  },
} as const satisfies Record<string, FrameMaterialConfig>

const FRAME_MATERIAL: keyof typeof FRAME_MATERIALS = 'gold-scuffed'
// How many texture tiles span the thickness of the frame band. Texels are kept
// square along the length, so raise this for finer detail, lower for coarser.
const FRAME_TILES_ACROSS = 0.1
// Geometry tessellation density (segments per world unit) for the frame faces.
// Displacement only moves existing vertices, so flat boxes need subdivision to
// show any surface relief.
const FRAME_SEG_DENSITY = 90
const segs = (size: number) => Math.max(1, Math.round(size * FRAME_SEG_DENSITY))

/* ------------------------- 3D Art Deco picture frame ----------------------- */
const FRAME_W = 0.11 // thin border band
const FRAME_DEPTH = 0.09
const FRAME_TIERS = [
  { wd: 0.7, y: 0.08 },
  { wd: 0.44, y: 0.16 },
  { wd: 0.22, y: 0.23 },
]

function DecoFrame({ w, h }: { w: number; h: number }) {
  const cfg: FrameMaterialConfig = FRAME_MATERIALS[FRAME_MATERIAL]
  const fadeRef = useRef(0)
  const textures = useTexture({
    map: cfg.map,
    normalMap: cfg.normalMap,
    ...('roughnessMap' in cfg ? { roughnessMap: cfg.roughnessMap } : {}),
    ...('metalnessMap' in cfg ? { metalnessMap: cfg.metalnessMap } : {}),
  } as Record<string, string>)

  // Build a material whose UV tiling matches a face's real size, so texels stay
  // square (no stretching). `faceW`/`faceH` are the dimensions of the face the
  // material maps onto, in world units.
  const { matH, matV } = useMemo(() => {
    const density = FRAME_TILES_ACROSS / FRAME_W // tiles per world unit
    const clone = (src: THREE.Texture, srgb: boolean, faceW: number, faceH: number) => {
      const t = src.clone()
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(faceW * density, faceH * density)
      t.anisotropy = 8
      t.needsUpdate = true
      return t
    }
    const dispScale = cfg.displacementScale ?? 0
    const build = (faceW: number, faceH: number) => {
      // Use a dedicated height map when one exists, else fall back to the base
      // colour's luminance so scuffs/scratches still read as surface relief.
      const dispSource = textures.displacementMap ?? textures.map
      return new THREE.MeshStandardMaterial({
        map: clone(textures.map, true, faceW, faceH),
        normalMap: clone(textures.normalMap, false, faceW, faceH),
        roughnessMap: textures.roughnessMap
          ? clone(textures.roughnessMap, false, faceW, faceH)
          : null,
        metalnessMap: textures.metalnessMap
          ? clone(textures.metalnessMap, false, faceW, faceH)
          : null,
        displacementMap: dispScale ? clone(dispSource, false, faceW, faceH) : null,
        displacementScale: dispScale,
        displacementBias: -dispScale / 2, // recentre relief on the face
        metalness: cfg.metalness,
        roughness: cfg.roughness,
        envMapIntensity: 1,
        opacity: 0,
        transparent: true,
      })
    }
    const lh = w + 2 * FRAME_W
    return {
      matH: build(lh, FRAME_W), // horizontal bars + crests
      matV: build(FRAME_W, h), // vertical bars
    }
  }, [textures, w, h, cfg])

  const bx = w / 2 + FRAME_W / 2 // centre of the vertical bars
  const by = h / 2 + FRAME_W / 2 // centre of the horizontal bars
  const cy = h / 2 + FRAME_W / 2

  useFrame((_, delta) => {
    fadeRef.current = Math.min(fadeRef.current + delta / FRAME_PHOTO_FADE_IN_DURATION, 1)
    matH.opacity = fadeRef.current
    matV.opacity = fadeRef.current
  })

  return (
    <group>
      {/* Four border bars */}
      <mesh material={matH} position={[0, by, 0]}>
        <boxGeometry
          args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH, segs(w + 2 * FRAME_W), segs(FRAME_W), 1]}
        />
      </mesh>
      <mesh material={matH} position={[0, -by, 0]}>
        <boxGeometry
          args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH, segs(w + 2 * FRAME_W), segs(FRAME_W), 1]}
        />
      </mesh>
      <mesh material={matV} position={[-bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH, segs(FRAME_W), segs(h), 1]} />
      </mesh>
      <mesh material={matV} position={[bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH, segs(FRAME_W), segs(h), 1]} />
      </mesh>

      {/* Corner diamonds
      {[
        [-cx, -cy],
        [cx, -cy],
        [-cx, cy],
        [cx, cy],
      ].map(([x, y], i) => (
        <mesh
          key={i}
          material={matCorner}
          position={[x, y, 1]}
          rotation-z={Math.PI / 4}
        >
          <boxGeometry args={[0.14, 0.14, FRAME_DEPTH + 0.04]} />
        </mesh>
      ))} */}

      {/* Stepped deco crest, top and bottom */}
      {FRAME_TIERS.map((t) => (
        <mesh material={matH} key={`top-${t.y}`} position={[0, cy + t.y, 0]}>
          <boxGeometry args={[t.wd, 0.05, FRAME_DEPTH, segs(t.wd), segs(0.05), 1]} />
        </mesh>
      ))}
      {FRAME_TIERS.map((t) => (
        <mesh material={matH} key={`bot-${t.y}`} position={[0, -cy - t.y, 0]}>
          <boxGeometry args={[t.wd, 0.05, FRAME_DEPTH, segs(t.wd), segs(0.05), 1]} />
        </mesh>
      ))}
    </group>
  )
}

/* ----------------------------- Floating photo ----------------------------- */
function FloatingPlane({ tex, aspect }: { tex: THREE.Texture; aspect: number }) {
  const ref = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const fadeRef = useRef(0)
  const h = PIC_HEIGHT
  const w = h * aspect

  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 0.08
    ref.current.rotation.z = Math.sin(t * 0.4) * 0.015

    if (!materialRef.current) return
    fadeRef.current = Math.min(fadeRef.current + delta / FRAME_PHOTO_FADE_IN_DURATION, 1)
    materialRef.current.opacity = fadeRef.current
  })

  return (
    <group ref={ref} position={[0, BASE_Y, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={materialRef}
          map={tex}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      <DecoFrame w={w} h={h} />
    </group>
  )
}

function UrlImage({ url }: { url: string }) {
  const sourceTex = useTexture(url)
  const tex = useMemo(() => {
    const configuredTexture = sourceTex.clone()
    configuredTexture.colorSpace = THREE.SRGBColorSpace
    configuredTexture.needsUpdate = true
    return configuredTexture
  }, [sourceTex])
  const img = tex.image as { width: number; height: number } | undefined
  const aspect = img && img.height ? img.width / img.height : 3 / 4
  return <FloatingPlane tex={tex} aspect={aspect} />
}

function DecoImage({ seed }: { seed: number }) {
  const tex = useMemo(() => makeDecoPortraitTexture(seed), [seed])
  return <FloatingPlane tex={tex} aspect={200 / 260} />
}

/* -------------------------------- Scene ----------------------------------- */
function SceneContents({ photo }: { photo: KeyperPhoto }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={45} />
      <OrbitControls
        makeDefault
        target={[0, BASE_Y, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={11}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.04}
        autoRotate
        autoRotateSpeed={0.1}
      />

      <color attach='background' args={['#000000']} />
      <fog attach='fog' args={['#000000', 5, 190]} />

      {/* Lighting for the metal frame (photo + floor are self-lit) */}
      <ambientLight intensity={0.35} color={'#ffdca0'} />
      <pointLight position={[2.5, 4, 4]} intensity={32} color={'#ffcf8f'} distance={22} decay={2} />
      <pointLight
        position={[-3, 2, 2.5]}
        intensity={14}
        color={'#ffe6bf'}
        distance={16}
        decay={2}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} color={'#ffe6bf'} position={[0, 4, 4]} scale={[6, 6, 1]} />
        <Lightformer intensity={1.2} color={'#ffd79a'} position={[-4, 2, 2]} scale={[3, 5, 1]} />
        <Lightformer intensity={1.2} color={'#ffd79a'} position={[4, 2, 2]} scale={[3, 5, 1]} />
      </Environment>

      <Suspense fallback={null}>
        {photo.url ? <UrlImage url={photo.url} /> : <DecoImage seed={photo.seed} />}
        <GlowFloor />
      </Suspense>

      {/* Light particles drifting through the hall */}
      <FadingSparkles
        count={150}
        scale={[14, 9, 14]}
        position={[0, 3, 0]}
        size={1.6}
        speed={0.25}
        opacity={0.5}
        color={'#ffd79a'}
        noise={1.3}
      />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.1}
        />
      </EffectComposer>
    </>
  )
}

export function PhotoScene({ photo }: { photo: KeyperPhoto }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
      className='h-full w-full'
    >
      <SceneContents photo={photo} />
    </Canvas>
  )
}
