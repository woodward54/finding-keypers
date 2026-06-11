'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MomentPhoto } from '@/lib/use-moment-photos'
import { useMomentPhotos } from '@/lib/use-moment-photos'
import { useMyMoments, useMyMomentsHydrated } from '@/lib/use-my-moments'
import { useMutation } from 'convex/react'
import { ArrowLeft, DownloadIcon, Trash2Icon } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useEffect, useState } from 'react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'

const PhotoScene = dynamic(
  () => import('@/components/view/photo-scene').then((m) => m.PhotoScene),
  {
    ssr: false,
    loading: () => <div className='flex h-full w-full items-center justify-center bg-black'></div>,
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
    posthog.capture('photo_download_clicked', { photo_id: photo.id, photo_name: photo.name })
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
      className='group border-bronze/40 text-gold hover:border-gold flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2 text-xs tracking-[0.2em] uppercase backdrop-blur-sm transition-all disabled:pointer-events-none disabled:opacity-50'
    >
      <DownloadIcon className='size-4 transition-transform group-hover:scale-110' />
      {busy ? 'Saving…' : 'Download'}
    </button>
  )
}

function DeleteButton({ photo }: { photo: MomentPhoto }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const removeFromMyMoments = useMyMoments((s) => s.remove)
  const deletePhoto = useMutation(api.photos.deletePhoto)

  const handleDelete = async () => {
    if (busy) return
    setBusy(true)
    posthog.capture('photo_deleted', { photo_id: photo.id, photo_name: photo.name })
    try {
      await deletePhoto({ id: photo.id as Id<'photos'> })
      removeFromMyMoments(photo.id)
      setOpen(false)
      router.push('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type='button'
        onClick={() => setOpen(true)}
        aria-label='Delete'
        className='group border-bronze/40 text-gold hover:border-destructive hover:text-destructive flex items-center rounded-md border bg-black/40 px-3 py-2 backdrop-blur-sm transition-all'
      >
        <Trash2Icon className='size-4 transition-transform group-hover:scale-110' />
      </button>

      <DialogContent className='border-bronze/40 bg-card'>
        <DialogHeader>
          <DialogTitle className='font-display text-gold tracking-[0.2em] uppercase'>
            Erase this moment?
          </DialogTitle>
          <DialogDescription>
            This memory will be lost to time...
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant='destructive' onClick={handleDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Pinch zoom from a previous page survives client-side navigation (the
// browser only re-reads the viewport meta on a full page load), which can
// leave the fixed overlay buttons scrolled out of view. Rewriting the meta
// content forces a re-evaluation that snaps the scale back to 1.
function useResetZoom() {
  useEffect(() => {
    const scale = window.visualViewport?.scale ?? 1
    if (scale <= 1) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return
    const content = meta.content
    meta.content = content.replace(/maximum-scale=[\d.]+/, 'maximum-scale=1.0001')
    requestAnimationFrame(() => {
      meta.content = content
    })
  }, [])
}

export default function ViewPage() {
  useResetZoom()
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(params.id)
  const { photos, isLoading } = useMomentPhotos()
  const photo = photos.find((p) => p.id === id)
  const hydrated = useMyMomentsHydrated()
  const isMine = useMyMoments((s) => s.ids.includes(id))

  useEffect(() => {
    if (!photo) return
    posthog.capture('photo_viewed', { photo_id: photo.id, photo_name: photo.name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id])

  return (
    <main className='fixed inset-0 overflow-hidden bg-black'>
      {photo ? (
        <PhotoScene photo={photo} />
      ) : (
        <div className='flex h-full w-full items-center justify-center'>
          <p className='font-display text-gilded animate-pulse text-sm tracking-[0.4em] uppercase'>
            {isLoading ? '' : 'Keyper not found'}
          </p>
        </div>
      )}

      {/* Overlay chrome */}
      <Link
        href='/'
        className='group border-bronze/40 text-gold hover:border-gold absolute top-5 left-5 z-10 flex items-center gap-2 rounded-md border bg-black/40 px-3 py-2 text-xs tracking-[0.2em] uppercase backdrop-blur-sm transition-all'
      >
        <ArrowLeft className='size-4 transition-transform group-hover:-translate-x-0.5' />
        Gallery
      </Link>

      {photo && (
        <div className='absolute top-5 right-5 z-10 flex items-stretch gap-2'>
          <DownloadButton photo={photo} />
          {hydrated && isMine && <DeleteButton photo={photo} />}
        </div>
      )}

      {photo && (
        <div className='pointer-events-none absolute inset-x-0 bottom-7 z-10 text-center'>
          <div className='mx-auto flex items-center justify-center gap-3'>
            <span className='bg-bronze/70 h-px w-8' />
            <span className='font-display text-gold text-sm tracking-[0.3em] uppercase'>
              {photo.name}
            </span>
            <span className='bg-bronze/70 h-px w-8' />
          </div>
        </div>
      )}
    </main>
  )
}
