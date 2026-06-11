'use client'

import { useFrame } from '@react-three/fiber'
import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

type AnimFrame =
  | { kind: 'bitmap'; bitmap: ImageBitmap; duration: number }
  | { kind: 'image-data'; imageData: ImageData; duration: number }

function closeAnimFrames(frames: AnimFrame[]) {
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
  const frames: AnimFrame[] = []

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
 * Decodes a photo URL into a CanvasTexture, animating it when the source is an
 * animated WebP or GIF. Frames are decoded up front (`ImageDecoder` where
 * available, `gifuct-js` for GIFs otherwise; animated WebP without WebCodecs
 * degrades to its first frame) and repainted onto the backing canvas each tick
 * via `useFrame`, so this must be used inside an R3F `<Canvas>`.
 */
export function useAnimatedTexture(url: string | null): {
  texture: THREE.CanvasTexture | null
  aspect: number
} {
  // One offscreen canvas drives a CanvasTexture. We only build the texture
  // *after* the canvas has been sized to the first decoded frame — creating it
  // against the default 300×150 canvas makes Three allocate texture storage at
  // that size, and the next (larger) upload overflows it
  // (GL_INVALID_VALUE: glCopySubTextureCHROMIUM offset overflows).
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<AnimFrame[]>([])
  const frameIndexRef = useRef(0)
  const elapsedRef = useRef(0)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)

  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  const [aspect, setAspect] = useState(3 / 4)

  useEffect(() => {
    if (!url) return
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
        const lower = url.toLowerCase()
        const isGif = blob.type === 'image/gif' || lower.includes('.gif')
        const isWebp = blob.type === 'image/webp' || lower.includes('.webp')

        if (isGif || isWebp) {
          const arrayBuffer = await blob.arrayBuffer()

          // WebCodecs decodes animated WebP and GIF alike, frame by frame.
          if (typeof ImageDecoder !== 'undefined') {
            try {
              const decoder = new ImageDecoder({
                data: arrayBuffer.slice(0),
                type: blob.type || (isGif ? 'image/gif' : 'image/webp'),
              })
              await decoder.tracks.ready
              const count = decoder.tracks.selectedTrack?.frameCount ?? 1
              const frames: AnimFrame[] = []
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
                closeAnimFrames(frames)
                return
              }
              framesRef.current = frames
              const first = frames[0]
              if (first?.kind === 'bitmap') {
                present(first.bitmap, first.bitmap.width, first.bitmap.height)
                return
              }
            } catch {
              // Fall through: gifuct-js for GIFs, a static first frame for WebP.
            }
          }

          // gifuct-js only understands GIF. Animated WebP without WebCodecs
          // degrades to its first frame via the static path below.
          if (isGif) {
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
        }

        // Static image (or animated WebP without WebCodecs): present one frame.
        const bitmap = await createImageBitmap(blob)
        if (cancelled) {
          bitmap.close()
          return
        }
        present(bitmap, bitmap.width, bitmap.height)
      } catch {
        // Leave the texture null if the photo can't be decoded.
      }
    }

    void load()

    return () => {
      cancelled = true
      closeAnimFrames(framesRef.current)
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

  return { texture, aspect }
}
