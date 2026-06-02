'use client'

import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { useMutation } from 'convex/react'
import { ArrowLeft, Camera, Loader2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'

const convexEnabled = Boolean(env.NEXT_PUBLIC_CONVEX_URL)

type Stage = 'starting' | 'live' | 'uploading' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stage, setStage] = useState<Stage>('starting')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl)
  const savePhoto = useMutation(api.photos.savePhoto)

  const stopStream = useCallback(() => {
    const tracks = streamRef.current?.getTracks() ?? []
    for (const track of tracks) {
      track.stop()
    }
    streamRef.current = null
  }, [])

  const uploadPhoto = useCallback(
    async (photoBlob: Blob) => {
      if (!convexEnabled) {
        setError(
          "The vault isn't connected yet. Run `npx convex dev` to enable uploads, your portrait looks splendid, though."
        )
        setStage('error')
        return
      }

      setStage('uploading')
      try {
        const postUrl = await generateUploadUrl()
        const res = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': photoBlob.type },
          body: photoBlob,
        })

        if (!res.ok) {
          throw new Error('Upload failed')
        }

        const { storageId } = await res.json()
        const newId = await savePhoto({ storageId, name: name.trim() || undefined })
        router.push(`/view/${encodeURIComponent(newId)}`)
      } catch {
        setError('Something went wrong while sealing your portrait. Try again.')
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

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const size = Math.min(video.videoWidth, video.videoHeight)
    // Center-crop to a 3:4 portrait.
    const w = size * 0.75
    const h = size
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sx = (video.videoWidth - w) / 2
    const sy = (video.videoHeight - h) / 2
    // Mirror to match the preview the user sees.
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, w, h, 0, 0, w, h)
    canvas.toBlob(
      (b) => {
        if (!b) return
        setPreview(URL.createObjectURL(b))
        stopStream()
        void uploadPhoto(b)
      },
      'image/jpeg',
      0.92
    )
  }, [stopStream, uploadPhoto])

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
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
              stage === 'live' || stage === 'starting' ? 'block' : 'hidden'
            }`}
          />
          {/* Captured preview */}
          {preview && stage === 'uploading' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt='Your captured portrait'
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
          placeholder='Your name (optional)'
          className='border-bronze/40 bg-card/40 font-display text-gold placeholder:text-muted-foreground/60 focus:border-gold focus:ring-ring/40 mt-6 w-full rounded-md border px-4 py-2.5 text-center text-sm tracking-[0.18em] uppercase focus:ring-[3px] focus:outline-none'
        />

        {/* Controls */}
        <div className='mt-5 flex w-full items-center justify-center gap-3'>
          {stage === 'live' && (
            <Button size='lg' className='flex-1' onClick={capture}>
              <Camera className='size-5' />
              Capture
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

        {!convexEnabled && (
          <p className='text-muted-foreground/70 mt-5 text-center text-xs leading-relaxed'>
            Preview mode: run <code className='text-bronze'>npx convex dev</code> to connect the
            vault and persist uploads.
          </p>
        )}
      </main>
    </div>
  )
}
