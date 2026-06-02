'use client'

import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { useMutation } from 'convex/react'
import { ArrowLeft, Camera, Check, Loader2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'

const convexEnabled = Boolean(env.NEXT_PUBLIC_CONVEX_URL)

type Stage = 'starting' | 'live' | 'captured' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [stage, setStage] = useState<Stage>('starting')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [name, setName] = useState('')

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const generateUploadUrl = convexEnabled ? useMutation(api.photos.generateUploadUrl) : null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const savePhoto = convexEnabled ? useMutation(api.photos.savePhoto) : null

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setStage('starting')
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
    startCamera()
    return () => stopStream()
  }, [startCamera, stopStream])

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
        setBlob(b)
        setPreview(URL.createObjectURL(b))
        setStage('captured')
        stopStream()
      },
      'image/jpeg',
      0.92
    )
  }, [stopStream])

  const retake = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setBlob(null)
    startCamera()
  }, [preview, startCamera])

  const submit = useCallback(async () => {
    if (!blob) return
    if (!convexEnabled || !generateUploadUrl || !savePhoto) {
      setError(
        "The vault isn't connected yet. Run `npx convex dev` to enable uploads — your portrait looks splendid, though."
      )
      setStage('error')
      return
    }
    setStage('uploading')
    try {
      const postUrl = await generateUploadUrl()
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      })
      const { storageId } = await res.json()
      await savePhoto({ storageId, name: name.trim() || undefined })
      setStage('done')
      setTimeout(() => router.push('/'), 1100)
    } catch {
      setError('Something went wrong while sealing your portrait. Try again.')
      setStage('error')
    }
  }, [blob, generateUploadUrl, savePhoto, name, router])

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
        {/* <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.18em] text-gilded sm:text-3xl">
          Capture The Memory
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Look into the lens. When you&apos;re ready, capture your likeness for
          the gilded gallery.
        </p> */}

        {/* <div className="mx-auto my-6 h-[2px] w-40 deco-rule" /> */}

        {/* Viewfinder */}
        <div className='border-bronze/50 bg-noir shadow-gold relative aspect-[3/4] w-full overflow-hidden rounded-md border-2'>
          {/* Live video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${
              stage === 'live' || stage === 'starting' ? 'block' : 'hidden'
            }`}
          />
          {/* Captured preview */}
          {preview && (stage === 'captured' || stage === 'uploading' || stage === 'done') && (
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

          {stage === 'done' && (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70'>
              <Check className='text-gold size-12' />
              <p className='font-display text-gold text-sm tracking-[0.25em] uppercase'>
                Sealed in the vault
              </p>
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

          {stage === 'captured' && (
            <>
              <Button variant='outline' size='lg' onClick={retake}>
                <RotateCcw className='size-4' />
                Retake
              </Button>
              <Button size='lg' className='flex-1' onClick={submit}>
                <Check className='size-5' />
                Add to Vault
              </Button>
            </>
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
            Preview mode — run <code className='text-bronze'>npx convex dev</code> to connect the
            vault and persist uploads.
          </p>
        )}
      </main>
    </div>
  )
}
