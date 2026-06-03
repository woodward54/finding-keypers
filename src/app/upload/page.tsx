'use client'

import { Button } from '@/components/ui/button'
import { useMutation } from 'convex/react'
import { applyPalette, GIFEncoder, quantize } from 'gifenc'
import { ArrowLeft, Camera, Loader2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'

const FRAME_COUNT = 4
const COUNTDOWN_SECONDS = 3
const FRAME_DELAY_MS = 500 // playback speed of each frame in the gif
const GIF_WIDTH = 480
const GIF_HEIGHT = 640

// Padding (in px) baked around the photo for the art deco frame, and the
// resulting full canvas size that gets encoded into the gif.
const FRAME_PAD = 72
const OUT_WIDTH = GIF_WIDTH + FRAME_PAD * 2
const OUT_HEIGHT = GIF_HEIGHT + FRAME_PAD * 2

type Stage = 'starting' | 'live' | 'capturing' | 'encoding' | 'uploading' | 'error'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* --------------------------- Art Deco gif frame --------------------------- */

const makeGold = (ctx: CanvasRenderingContext2D) => {
  const g = ctx.createLinearGradient(0, 0, OUT_WIDTH, OUT_HEIGHT)
  g.addColorStop(0, '#6e4e16')
  g.addColorStop(0.2, '#c79a3c')
  g.addColorStop(0.4, '#f3dd92')
  g.addColorStop(0.5, '#fff6d8')
  g.addColorStop(0.6, '#efd285')
  g.addColorStop(0.8, '#bb8f33')
  g.addColorStop(1, '#5f4413')
  return g
}

const strokeRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lineWidth: number
) => {
  ctx.lineWidth = lineWidth
  ctx.strokeRect(x, y, w, h)
}

const line = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

// A quarter sunburst fan, anchored at (ox, oy), sweeping from angle a0 to a1.
const drawFan = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  r: number,
  a0: number,
  a1: number
) => {
  const rays = 7
  ctx.lineWidth = 1.4
  for (let i = 0; i <= rays; i++) {
    const a = a0 + (a1 - a0) * (i / rays)
    line(ctx, ox, oy, ox + Math.cos(a) * r, oy + Math.sin(a) * r)
  }
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(ox, oy, r, a0, a1)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ox, oy, r * 0.62, a0, a1)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(ox, oy, 2.4, 0, Math.PI * 2)
  ctx.fill()
}

// A small deco lozenge (diamond) flanked by rules, centred on a frame edge.
const drawEdgeOrnament = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  orient: 'h' | 'v'
) => {
  const r = 9
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.lineTo(cx + r, cy)
  ctx.lineTo(cx, cy + r)
  ctx.lineTo(cx - r, cy)
  ctx.closePath()
  ctx.stroke()
  const ir = r * 0.42
  ctx.beginPath()
  ctx.moveTo(cx, cy - ir)
  ctx.lineTo(cx + ir, cy)
  ctx.lineTo(cx, cy + ir)
  ctx.lineTo(cx - ir, cy)
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = 1.2
  if (orient === 'h') {
    line(ctx, cx - r - 6, cy, cx - r - 38, cy)
    line(ctx, cx + r + 6, cy, cx + r + 38, cy)
  } else {
    line(ctx, cx, cy - r - 6, cx, cy - r - 38)
    line(ctx, cx, cy + r + 6, cx, cy + r + 38)
  }
}

// Composite a single captured photo onto the full art deco frame canvas.
const drawArtDecoFrame = (ctx: CanvasRenderingContext2D, photo: CanvasImageSource) => {
  const W = OUT_WIDTH
  const H = OUT_HEIGHT

  // Dark lacquered backdrop.
  const bg = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.15,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.72
  )
  bg.addColorStop(0, '#1b140b')
  bg.addColorStop(1, '#070503')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // The photo, inset by the padding.
  ctx.drawImage(photo, FRAME_PAD, FRAME_PAD, GIF_WIDTH, GIF_HEIGHT)

  const gold = makeGold(ctx)
  ctx.strokeStyle = gold
  ctx.fillStyle = gold
  ctx.lineCap = 'round'

  const px = FRAME_PAD
  const py = FRAME_PAD
  const right = px + GIF_WIDTH
  const bottom = py + GIF_HEIGHT

  // Double bezel hugging the photo.
  strokeRect(ctx, px - 5, py - 5, GIF_WIDTH + 10, GIF_HEIGHT + 10, 3)
  strokeRect(ctx, px - 11, py - 11, GIF_WIDTH + 22, GIF_HEIGHT + 22, 1.5)

  // Outer border near the canvas edge.
  const m = 12
  strokeRect(ctx, m, m, W - 2 * m, H - 2 * m, 4)
  strokeRect(ctx, m + 7, m + 7, W - 2 * (m + 7), H - 2 * (m + 7), 1.5)

  // Corner sunburst fans, each opening toward its corner.
  const fr = FRAME_PAD - 33
  drawFan(ctx, px - 11, py - 11, fr, Math.PI, Math.PI * 1.5)
  drawFan(ctx, right + 11, py - 11, fr, Math.PI * 1.5, Math.PI * 2)
  drawFan(ctx, px - 11, bottom + 11, fr, Math.PI * 0.5, Math.PI)
  drawFan(ctx, right + 11, bottom + 11, fr, 0, Math.PI * 0.5)

  // Lozenge ornaments centred on each edge.
  const topY = (m + (py - 11)) / 2
  const botY = (bottom + 11 + (H - m)) / 2
  const leftX = (m + (px - 11)) / 2
  const rightX = (right + 11 + (W - m)) / 2
  drawEdgeOrnament(ctx, W / 2, topY, 'h')
  drawEdgeOrnament(ctx, W / 2, botY, 'h')
  drawEdgeOrnament(ctx, leftX, H / 2, 'v')
  drawEdgeOrnament(ctx, rightX, H / 2, 'v')
}

/* --------------------------- 1920s photo filter --------------------------- */

const FILTER_CONTRAST = 1.2
const VIGNETTE_STRENGTH = 0.55
const GRAIN_AMOUNT = 26
// Duotone endpoints: crushed sepia shadows to a warm cream highlight.
const SEPIA_SHADOW = [44, 28, 14]
const SEPIA_HIGHLIGHT = [238, 222, 186]

// Mutates a photo's pixels in place to evoke an aged 1920s print: a sepia
// duotone with lifted contrast, a soft vignette, and film grain. The grain is
// re-rolled per frame, so it flickers like real film stock.
const applyVintageFilter = (image: ImageData) => {
  const { data, width, height } = image
  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.hypot(cx, cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      // Luminance → contrast curve around mid-grey.
      let lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      lum = Math.min(1, Math.max(0, (lum - 0.5) * FILTER_CONTRAST + 0.5))

      // Map the grey value across the sepia duotone.
      let r = SEPIA_SHADOW[0] + (SEPIA_HIGHLIGHT[0] - SEPIA_SHADOW[0]) * lum
      let g = SEPIA_SHADOW[1] + (SEPIA_HIGHLIGHT[1] - SEPIA_SHADOW[1]) * lum
      let b = SEPIA_SHADOW[2] + (SEPIA_HIGHLIGHT[2] - SEPIA_SHADOW[2]) * lum

      // Vignette: darken toward the edges.
      const dist = Math.hypot(x - cx, y - cy) / maxDist
      const vignette = 1 - VIGNETTE_STRENGTH * dist ** 2.2
      r *= vignette
      g *= vignette
      b *= vignette

      // Film grain (shared across channels keeps it monochrome).
      const grain = (Math.random() - 0.5) * GRAIN_AMOUNT
      data[i] = r + grain
      data[i + 1] = g + grain
      data[i + 2] = b + grain
    }
  }
}

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stage, setStage] = useState<Stage>('starting')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const savePhoto = useMutation(api.photos.savePhoto)

  const stopStream = useCallback(() => {
    const tracks = streamRef.current?.getTracks() ?? []
    for (const track of tracks) {
      track.stop()
    }
    streamRef.current = null
  }, [])

  const uploadGif = useCallback(
    async (gifBlob: Blob) => {
      setStage('uploading')
      try {
        const postUrl = await generateUploadUrl()
        const res = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': gifBlob.type },
          body: gifBlob,
        })

        if (!res.ok) {
          throw new Error('Upload failed')
        }

        const { storageId } = await res.json()
        const newId = await savePhoto({ storageId, name: name.trim() || undefined })
        router.push(`/view/${encodeURIComponent(newId)}`)
      } catch {
        setError('Something went wrong while sealing your portraits. Try again.')
        setStage('error')
      }
    },
    [generateUploadUrl, name, router, savePhoto]
  )

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStage('live')
    } catch {
      setError(
        "We couldn't open your camera. Please grant permission, or use a device with a camera."
      )
      setStage('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const openCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1440 } },
          audio: false,
        })
        if (cancelled) {
          const tracks = stream.getTracks()
          for (const track of tracks) {
            track.stop()
          }
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStage('live')
      } catch {
        if (cancelled) return
        setError(
          "We couldn't open your camera. Please grant permission, or use a device with a camera."
        )
        setStage('error')
      }
    }

    void openCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [stopStream])

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  // Grab the current video frame, center-cropped to a mirrored 3:4 portrait
  // sized for the gif, and return its raw pixels.
  const captureFrame = useCallback((): ImageData | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    canvas.width = GIF_WIDTH
    canvas.height = GIF_HEIGHT
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const srcSize = Math.min(video.videoWidth, video.videoHeight)
    const sw = srcSize * 0.75
    const sh = srcSize
    const sx = (video.videoWidth - sw) / 2
    const sy = (video.videoHeight - sh) / 2
    ctx.save()
    // Mirror to match the preview the user sees.
    ctx.translate(GIF_WIDTH, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, GIF_WIDTH, GIF_HEIGHT)
    ctx.restore()
    return ctx.getImageData(0, 0, GIF_WIDTH, GIF_HEIGHT)
  }, [])

  const encodeGif = useCallback((frames: ImageData[]): Blob => {
    const encoder = GIFEncoder()

    // Scratch canvas holding one raw photo frame, drawn into the framed canvas.
    const photoCanvas = document.createElement('canvas')
    photoCanvas.width = GIF_WIDTH
    photoCanvas.height = GIF_HEIGHT
    const photoCtx = photoCanvas.getContext('2d')

    // The framed canvas that actually gets encoded.
    const outCanvas = document.createElement('canvas')
    outCanvas.width = OUT_WIDTH
    outCanvas.height = OUT_HEIGHT
    const outCtx = outCanvas.getContext('2d')

    for (const frame of frames) {
      if (!photoCtx || !outCtx) break
      // Age the photo before it goes inside the (still-golden) frame.
      applyVintageFilter(frame)
      photoCtx.putImageData(frame, 0, 0)
      drawArtDecoFrame(outCtx, photoCanvas)
      const composited = outCtx.getImageData(0, 0, OUT_WIDTH, OUT_HEIGHT)
      const palette = quantize(composited.data, 256)
      const index = applyPalette(composited.data, palette)
      encoder.writeFrame(index, OUT_WIDTH, OUT_HEIGHT, { palette, delay: FRAME_DELAY_MS })
    }
    encoder.finish()
    return new Blob([encoder.bytes()], { type: 'image/gif' })
  }, [])

  const runPhotoBooth = useCallback(async () => {
    setError(null)
    setStage('capturing')
    const frames: ImageData[] = []

    for (let shot = 1; shot <= FRAME_COUNT; shot++) {
      // 3… 2… 1… countdown before each shot.
      for (let c = COUNTDOWN_SECONDS; c > 0; c--) {
        setCountdown(c)
        await sleep(1000)
      }
      setCountdown(null)

      // Pop the flash, then grab the frame at its brightest.
      setFlash(true)
      await sleep(120)
      const frame = captureFrame()
      if (frame) frames.push(frame)
      await sleep(120)
      setFlash(false)

      // Brief breath between shots.
      if (shot < FRAME_COUNT) await sleep(600)
    }

    if (frames.length === 0) {
      setError('We couldn’t capture the frames. Try again.')
      setStage('error')
      return
    }

    setStage('encoding')
    // Yield so the "developing" state can paint before the encode blocks.
    await sleep(50)
    const gifBlob = encodeGif(frames)
    setPreview(URL.createObjectURL(gifBlob))
    stopStream()
    await uploadGif(gifBlob)
  }, [captureFrame, encodeGif, stopStream, uploadGif])

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    setCountdown(null)
    setFlash(false)
    setStage('starting')
    startCamera()
  }, [preview, startCamera])

  return (
    <div className='relative flex min-h-screen flex-col'>
      {/* Art Deco pattern background */}
      <div
        className='pointer-events-none fixed inset-0 -z-20 bg-repeat opacity-40'
        style={{
          backgroundImage: "url('/assets/finding-keypers-pattern.png')",
          backgroundSize: '520px',
        }}
      />
      {/* Dark wash so the viewfinder stays the focus */}
      <div className='pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.4),rgba(0,0,0,0.78))]' />

      <header className='border-bronze/30 border-b bg-black/40 px-4 py-4 backdrop-blur-sm sm:px-6'>
        <Button asChild variant='ghost' size='sm'>
          <Link href='/'>
            <ArrowLeft className='size-4' />
            Back to the Vault
          </Link>
        </Button>
      </header>

      <main className='mx-auto flex w-full max-w-md flex-1 flex-col items-center p-5'>
        {/* Viewfinder */}
        <div className='border-bronze/50 bg-noir shadow-gold relative aspect-3/4 w-full overflow-hidden rounded-md border-2'>
          {/* Live video */}
          <video
            ref={videoRef}
            aria-label='Camera preview'
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${
              stage === 'live' || stage === 'starting' || stage === 'capturing' ? 'block' : 'hidden'
            }`}
          />
          {/* Captured gif preview */}
          {preview && (stage === 'encoding' || stage === 'uploading') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt='Your photo booth strip'
              className='h-full w-full object-cover'
            />
          )}

          {stage === 'starting' && (
            <div className='bg-noir/80 absolute inset-0 flex items-center justify-center'>
              <Loader2 className='text-gold size-7 animate-spin' />
            </div>
          )}

          {stage === 'error' && (
            <div className='bg-noir absolute inset-0 flex items-center justify-center p-6 text-center'>
              <p className='text-muted-foreground text-sm'>{error}</p>
            </div>
          )}

          {/* Countdown number */}
          {stage === 'capturing' && countdown !== null && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <span
                key={countdown}
                className='font-display text-gold animate-ping-once flex size-32 items-center justify-center rounded-full bg-black/40 text-[5.5rem] leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] backdrop-blur-sm'
              >
                {countdown}
              </span>
            </div>
          )}

          {/* Camera flash */}
          <div
            className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-100 ${
              flash ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Corner deco frame */}
          <div className='border-gold/30 pointer-events-none absolute inset-2 border' />
          <div className='border-gold pointer-events-none absolute top-0 left-0 size-6 border-t-2 border-l-2' />
          <div className='border-gold pointer-events-none absolute top-0 right-0 size-6 border-t-2 border-r-2' />
          <div className='border-gold pointer-events-none absolute bottom-0 left-0 size-6 border-b-2 border-l-2' />
          <div className='border-gold pointer-events-none absolute right-0 bottom-0 size-6 border-r-2 border-b-2' />
        </div>

        <canvas ref={canvasRef} className='hidden' />

        {/* Name field */}
        <input
          type='text'
          aria-label='Your name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          disabled={stage === 'capturing' || stage === 'encoding' || stage === 'uploading'}
          placeholder='Your name (optional)'
          className='border-bronze/40 bg-card/40 font-display text-gold placeholder:text-muted-foreground/60 focus:border-gold focus:ring-ring/40 mt-6 w-full rounded-md border px-4 py-2.5 text-center text-sm tracking-[0.18em] uppercase focus:ring-[3px] focus:outline-none disabled:opacity-50'
        />

        {/* Controls */}
        <div className='mt-5 flex w-full items-center justify-center gap-3'>
          {stage === 'live' && (
            <Button size='lg' className='flex-1' onClick={() => void runPhotoBooth()}>
              <Camera className='size-5' />
              Capture
            </Button>
          )}

          {stage === 'capturing' && (
            <Button size='lg' className='flex-1' disabled>
              <Camera className='size-5' />
              Smile…
            </Button>
          )}

          {stage === 'encoding' && (
            <Button size='lg' className='flex-1' disabled>
              <Loader2 className='size-5 animate-spin' />
              Developing…
            </Button>
          )}

          {stage === 'uploading' && (
            <Button size='lg' className='flex-1' disabled>
              <Loader2 className='size-5 animate-spin' />
              Sealing…
            </Button>
          )}

          {stage === 'error' && (
            <Button variant='outline' size='lg' className='flex-1' onClick={retake}>
              <RotateCcw className='size-4' />
              Try Again
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
