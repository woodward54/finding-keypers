'use client'

import type { MomentPhoto } from '@/lib/placeholder-photos'
import {
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
  useTexture,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
  const matHRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const matVRef = useRef<THREE.MeshStandardMaterial | null>(null)
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

  useEffect(() => {
    matHRef.current = matH
    matVRef.current = matV
  }, [matH, matV])

  useFrame((_, delta) => {
    fadeRef.current = Math.min(fadeRef.current + delta / FRAME_PHOTO_FADE_IN_DURATION, 1)
    if (matHRef.current) matHRef.current.opacity = fadeRef.current
    if (matVRef.current) matVRef.current.opacity = fadeRef.current
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

type GifFrame =
  | { kind: 'bitmap'; bitmap: ImageBitmap; duration: number }
  | { kind: 'image-data'; imageData: ImageData; duration: number }

function closeGifFrames(frames: GifFrame[]) {
  for (const frame of frames) {
    if (frame.kind === 'bitmap') frame.bitmap.close()
  }
}

function decodeGifWithGifuct(arrayBuffer: ArrayBuffer) {
  const parsedGif = parseGIF(arrayBuffer)
  const parsedFrames = decompressFrames(parsedGif, true)
  const width = parsedGif.lsd.width
  const height = parsedGif.lsd.height
  const fullCanvas = document.createElement('canvas')
  const patchCanvas = document.createElement('canvas')
  fullCanvas.width = width
  fullCanvas.height = height
  const fullCtx = fullCanvas.getContext('2d')
  const patchCtx = patchCanvas.getContext('2d')

  if (!fullCtx || !patchCtx) return null

  let previousFrame: ParsedFrame | null = null
  const frames: GifFrame[] = []

  for (const frame of parsedFrames) {
    if (previousFrame?.disposalType === 2) {
      const { left, top, width: frameWidth, height: frameHeight } = previousFrame.dims
      fullCtx.clearRect(left, top, frameWidth, frameHeight)
    }

    const { left, top, width: frameWidth, height: frameHeight } = frame.dims
    patchCanvas.width = frameWidth
    patchCanvas.height = frameHeight
    const patchImageData = patchCtx.createImageData(frameWidth, frameHeight)
    patchImageData.data.set(frame.patch)
    patchCtx.putImageData(patchImageData, 0, 0)
    fullCtx.drawImage(patchCanvas, left, top)

    frames.push({
      kind: 'image-data',
      imageData: fullCtx.getImageData(0, 0, width, height),
      duration: Math.max(frame.delay || 100, 20),
    })
    previousFrame = frame
  }

  return { frames, width, height }
}

/**
 * Renders a photo URL onto the floating plane. GIFs are decoded frame-by-frame
 * and animated by repainting a CanvasTexture each tick. `ImageDecoder` is used
 * first when available, with `gifuct-js` as a fallback for mobile browsers.
 */
function UrlImage({ url }: { url: string }) {
  // One offscreen canvas drives a CanvasTexture. We only build the texture
  // *after* the canvas has been sized to the first decoded frame — creating it
  // against the default 300×150 canvas makes Three allocate texture storage at
  // that size, and the next (larger) upload overflows it
  // (GL_INVALID_VALUE: glCopySubTextureCHROMIUM offset overflows).
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<GifFrame[]>([])
  const frameIndexRef = useRef(0)
  const elapsedRef = useRef(0)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)

  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  const [aspect, setAspect] = useState(3 / 4)

  useEffect(() => {
    let cancelled = false
    frameIndexRef.current = 0
    elapsedRef.current = 0
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d')

    const presentTexture = (w: number, h: number) => {
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      textureRef.current = tex
      setAspect(w / h)
      setTexture(tex)
    }

    const present = (source: CanvasImageSource, w: number, h: number) => {
      if (!ctx) return
      canvas.width = w
      canvas.height = h
      ctx.drawImage(source, 0, 0, w, h)
      presentTexture(w, h)
    }

    const presentImageData = (imageData: ImageData, w: number, h: number) => {
      if (!ctx) return
      canvas.width = w
      canvas.height = h
      ctx.putImageData(imageData, 0, 0)
      presentTexture(w, h)
    }

    const load = async () => {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        const isGif = blob.type === 'image/gif' || url.toLowerCase().includes('.gif')

        if (isGif) {
          const arrayBuffer = await blob.arrayBuffer()

          if (typeof ImageDecoder !== 'undefined') {
            try {
              const decoder = new ImageDecoder({
                data: arrayBuffer.slice(0),
                type: blob.type || 'image/gif',
              })
              await decoder.tracks.ready
              const count = decoder.tracks.selectedTrack?.frameCount ?? 1
              const frames: GifFrame[] = []
              for (let i = 0; i < count; i++) {
                const { image } = await decoder.decode({ frameIndex: i })
                const bitmap = await createImageBitmap(image)
                frames.push({
                  kind: 'bitmap',
                  bitmap,
                  duration: (image.duration ?? 100_000) / 1000,
                })
                image.close()
              }
              if (cancelled) {
                closeGifFrames(frames)
                return
              }
              framesRef.current = frames
              const first = frames[0]
              if (first?.kind === 'bitmap') {
                present(first.bitmap, first.bitmap.width, first.bitmap.height)
                return
              }
            } catch {
              // Fall through to gifuct-js for browsers with incomplete GIF decoding.
            }
          }

          const decodedGif = decodeGifWithGifuct(arrayBuffer)
          if (!decodedGif) return
          if (cancelled) {
            return
          }
          framesRef.current = decodedGif.frames
          const first = decodedGif.frames[0]
          if (first?.kind === 'image-data') {
            presentImageData(first.imageData, decodedGif.width, decodedGif.height)
          }
          return
        }

        // Static image (or no ImageDecoder support): present a single frame.
        const bitmap = await createImageBitmap(blob)
        if (cancelled) {
          bitmap.close()
          return
        }
        present(bitmap, bitmap.width, bitmap.height)
      } catch {
        // Leave the plane blank if the photo can't be decoded.
      }
    }

    void load()

    return () => {
      cancelled = true
      closeGifFrames(framesRef.current)
      framesRef.current = []
      textureRef.current?.dispose()
      textureRef.current = null
    }
  }, [url])

  useFrame((_, delta) => {
    const frames = framesRef.current
    const tex = textureRef.current
    const canvas = canvasRef.current
    if (!tex || !canvas || frames.length <= 1) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    elapsedRef.current += delta * 1000
    let current = frames[frameIndexRef.current]
    while (elapsedRef.current >= current.duration) {
      elapsedRef.current -= current.duration
      frameIndexRef.current = (frameIndexRef.current + 1) % frames.length
      current = frames[frameIndexRef.current]
    }
    if (current.kind === 'bitmap') {
      ctx.drawImage(current.bitmap, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.putImageData(current.imageData, 0, 0)
    }
    tex.needsUpdate = true
  })

  if (!texture) return null
  return <FloatingPlane tex={texture} aspect={aspect} />
}

function DecoImage({ seed }: { seed: number }) {
  const tex = useMemo(() => makeDecoPortraitTexture(seed), [seed])
  return <FloatingPlane tex={tex} aspect={200 / 260} />
}

/* -------------------------------- Scene ----------------------------------- */
function SceneContents({ photo }: { photo: MomentPhoto }) {
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

export function PhotoScene({ photo }: { photo: MomentPhoto }) {
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
