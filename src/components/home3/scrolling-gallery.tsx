'use client'

import type { MomentPhoto } from '@/lib/use-moment-photos'
import { useFrame } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useAnimatedTexture } from '../view/use-animated-texture'

/* Row layout: fixed-width slots on a conveyor that wraps around the camera. */
const TILE_H = 2.1 // tallest a photo can be inside its slot
const SLOT_W = 2.6 // horizontal pitch between tile centres
const MIN_ROW_SLOTS = 8 // duplicate sparse galleries until the belt has no gaps
const FRAME_W = 0.07 // gold border band around each photo
const FRAME_DEPTH = 0.05
const SCROLL_SPEED = 0.45 // world units per second
const FADE_IN_DURATION = 1.6

/** Shared gold material for every tile frame. */
function useFrameMaterial() {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a6a32',
        metalness: 0.95,
        roughness: 0.32,
        envMapIntensity: 1,
      }),
    []
  )
}

function TileFrame({ w, h, material }: { w: number; h: number; material: THREE.Material }) {
  const bx = w / 2 + FRAME_W / 2
  const by = h / 2 + FRAME_W / 2
  return (
    <group>
      <mesh material={material} position={[0, by, 0]}>
        <boxGeometry args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH]} />
      </mesh>
      <mesh material={material} position={[0, -by, 0]}>
        <boxGeometry args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH]} />
      </mesh>
      <mesh material={material} position={[-bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH]} />
      </mesh>
      <mesh material={material} position={[bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH]} />
      </mesh>
    </group>
  )
}

/**
 * One framed photo on the belt, run through the animated GIF/WebP-aware
 * texture pipeline. Tapping (without dragging) navigates to the photo's view
 * page.
 */
function GalleryTile({
  photo,
  frameMaterial,
}: {
  photo: MomentPhoto
  frameMaterial: THREE.Material
}) {
  const router = useRouter()
  const { texture, aspect } = useAnimatedTexture(photo.url)

  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const fadeRef = useRef(0)
  const downAt = useRef<{ x: number; y: number } | null>(null)

  useFrame((_, delta) => {
    if (!materialRef.current) return
    fadeRef.current = Math.min(fadeRef.current + delta / FADE_IN_DURATION, 1)
    materialRef.current.opacity = fadeRef.current
  })

  if (!texture) return null

  // Fit the photo inside its slot: cap the height, then the width.
  let h = TILE_H
  let w = h * aspect
  const maxW = SLOT_W - 0.4
  if (w > maxW) {
    w = maxW
    h = w / aspect
  }

  return (
    <group
      onPointerDown={(e) => {
        downAt.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
      }}
      onPointerUp={(e) => {
        const down = downAt.current
        downAt.current = null
        if (!down) return
        // Ignore drags (orbit/touch scrolls) — only a clean tap navigates.
        const dx = e.nativeEvent.clientX - down.x
        const dy = e.nativeEvent.clientY - down.y
        if (dx * dx + dy * dy > 8 * 8) return
        e.stopPropagation()
        router.push(`/view/${encodeURIComponent(photo.id)}`)
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      <TileFrame w={w} h={h} material={frameMaterial} />
    </group>
  )
}

/**
 * A horizontal conveyor of tiles. Each tile's x position advances every frame
 * and wraps modulo the belt length, so the row scrolls past the camera forever.
 */
function GalleryRow({
  photos,
  y,
  z,
  direction,
}: {
  photos: MomentPhoto[]
  y: number
  z: number
  direction: 1 | -1
}) {
  const frameMaterial = useFrameMaterial()

  // Duplicate sparse rows so the belt is long enough to wrap without gaps.
  const slots = useMemo(() => {
    if (photos.length === 0) return []
    const out: { photo: MomentPhoto; key: string }[] = []
    let copy = 0
    while (out.length < MIN_ROW_SLOTS) {
      for (const photo of photos) out.push({ photo, key: `${photo.id}-${copy}` })
      copy++
    }
    return out
  }, [photos])

  const beltLength = slots.length * SLOT_W
  const offsetRef = useRef(0)
  const tileRefs = useRef<(THREE.Group | null)[]>([])

  useFrame((_, delta) => {
    offsetRef.current = (offsetRef.current + delta * SCROLL_SPEED * direction) % beltLength
    for (let i = 0; i < slots.length; i++) {
      const group = tileRefs.current[i]
      if (!group) continue
      // Wrap each slot into [-beltLength/2, beltLength/2) around the camera.
      let x = (i * SLOT_W + offsetRef.current) % beltLength
      if (x < 0) x += beltLength
      group.position.x = x - beltLength / 2 + SLOT_W / 2
      // Hide the tile while it teleports across the seam at the belt's edge.
      group.visible = Math.abs(group.position.x) < beltLength / 2 - SLOT_W / 2
    }
  })

  if (slots.length === 0) return null

  return (
    <group position={[0, y, z]}>
      {slots.map((slot, i) => (
        <group
          key={slot.key}
          ref={(el) => {
            tileRefs.current[i] = el
          }}
        >
          <GalleryTile photo={slot.photo} frameMaterial={frameMaterial} />
        </group>
      ))}
    </group>
  )
}

/**
 * Two stacked rows of framed keyper photos scrolling in opposite directions
 * in front of the camera. Even-indexed photos ride the top row, odd the
 * bottom, so a single upload still appears immediately.
 */
export function ScrollingGallery({ photos }: { photos: MomentPhoto[] }) {
  const { top, bottom } = useMemo(() => {
    const top: MomentPhoto[] = []
    const bottom: MomentPhoto[] = []
    photos.forEach((photo, i) => (i % 2 === 0 ? top : bottom).push(photo))
    // With a single photo, mirror it onto both rows rather than leaving one empty.
    if (bottom.length === 0) return { top, bottom: top }
    return { top, bottom }
  }, [photos])

  return (
    <group>
      <GalleryRow photos={top} y={3.55} z={0} direction={-1} />
      <GalleryRow photos={bottom} y={1.15} z={0} direction={1} />
    </group>
  )
}
