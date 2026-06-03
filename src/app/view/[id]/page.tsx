'use client'

import type { MomentPhoto } from '@/lib/placeholder-photos'
import { useMomentPhotos } from '@/lib/use-moment-photos'
import { ArrowDown, ArrowLeft, DownloadIcon } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const PhotoScene = dynamic(
  () => import('@/components/view/photo-scene').then((m) => m.PhotoScene),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full w-full items-center justify-center bg-black'>
        <p className='font-display text-gilded animate-pulse text-sm tracking-[0.4em] uppercase'>
          Unlocking…
        </p>
      </div>
    ),
  }
)

const EXT_BY_TYPE: Record<string, string> = {
  'image/gif': 'gif',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function DownloadButton({ photo }: { photo: MomentPhoto }) {
  const [busy, setBusy] = useState(false)

  if (!photo.url) return null
  const url = photo.url

  const handleDownload = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = EXT_BY_TYPE[blob.type] ?? url.split('.').pop()?.split('?')[0] ?? 'png'
      const safeName = (photo.name || 'keyper').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${safeName || 'keyper'}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // Silently ignore — the file simply won't download if the fetch fails.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      onClick={handleDownload}
      disabled={busy}
      aria-label='Download'
      className='group border-bronze/40 text-gold hover:border-gold absolute top-5 right-5 z-10 flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2 text-xs tracking-[0.2em] uppercase backdrop-blur-sm transition-colors disabled:opacity-50'
    >
      <DownloadIcon className='size-4 transition-transform group-hover:scale-110' />
      {busy ? 'Saving…' : 'Download'}
    </button>
  )
}

export default function ViewPage() {
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(params.id)
  const { photos, isLoading } = useMomentPhotos()
  const photo = photos.find((p) => p.id === id)

  return (
    <main className='fixed inset-0 overflow-hidden bg-black'>
      {photo ? (
        <PhotoScene photo={photo} />
      ) : (
        <div className='flex h-full w-full items-center justify-center'>
          <p className='font-display text-gilded animate-pulse text-sm tracking-[0.4em] uppercase'>
            {isLoading ? 'Unlocking…' : 'Keyper not found'}
          </p>
        </div>
      )}

      {/* Overlay chrome */}
      <Link
        href='/'
        className='group border-bronze/40 text-gold hover:border-gold absolute top-5 left-5 z-10 flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2 text-xs tracking-[0.2em] uppercase backdrop-blur-sm transition-colors'
      >
        <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-0.5' />
        Gallery
      </Link>

      {photo && <DownloadButton photo={photo} />}

      {photo && (
        <div className='pointer-events-none absolute inset-x-0 bottom-7 z-10 text-center'>
          <div className='mx-auto flex items-center justify-center gap-3'>
            <span className='bg-bronze/70 h-px w-8' />
            <span className='font-display text-gold text-sm tracking-[0.3em] uppercase'>
              {photo.name}
            </span>
            <span className='bg-bronze/70 h-px w-8' />
          </div>
          {/* <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-bronze/70">
            Drag to orbit
          </p> */}
        </div>
      )}
    </main>
  )
}
