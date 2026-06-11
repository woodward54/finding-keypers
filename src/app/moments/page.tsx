'use client'

import { Camera } from 'lucide-react'
import Link from 'next/link'
import { PhotoTile } from '@/components/photo-tile'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { useMomentPhotos, type MomentPhoto } from '@/lib/use-moment-photos'
import { useMyMoments, useMyMomentsHydrated } from '@/lib/use-my-moments'

export default function MomentsPage() {
  const { photos, isLoading } = useMomentPhotos()
  const ids = useMyMoments((s) => s.ids)
  const hydrated = useMyMomentsHydrated()

  // Resolve the stored ids against the live gallery, preserving newest-first
  // order and dropping any that no longer exist in the vault.
  const byId = new Map(photos.map((p) => [p.id, p]))
  const mine = ids.map((id) => byId.get(id)).filter((p): p is MomentPhoto => p !== undefined)

  const ready = hydrated && !isLoading

  return (
    <div className='relative flex min-h-screen flex-col'>
      {/* Art Deco pattern background */}
      <div
        className='pointer-events-none fixed inset-0 -z-20 bg-repeat opacity-40'
        style={{
          backgroundImage: "url('/assets/finding-keypers-pattern.webp')",
          backgroundSize: '520px',
        }}
      />
      {/* Dark wash so the gallery stays the focus */}
      <div className='pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.4),rgba(0,0,0,0.78))]' />

      <SiteHeader />

      <main className='relative flex-1'>
        <section className='relative z-10 mx-auto max-w-5xl p-6 text-center'>
          <h1 className='font-display text-gilded text-3xl font-black tracking-[0.12em] uppercase sm:text-4xl'>
            My Moments
          </h1>
          <p className='text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-relaxed text-balance'>
            The portraits you&apos;ve sealed into the vault. Tap one to unlock it again.
          </p>
          <div className='deco-rule mx-auto mt-7 h-[3px] w-48 sm:w-72' />
        </section>

        <section className='mx-auto max-w-6xl px-4 pb-16 sm:px-6'>
          {!ready ? (
            <></>
          ) : mine.length === 0 ? (
            <div className='mx-auto flex max-w-md flex-col items-center gap-5 py-12 text-center'>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                You haven&apos;t captured any moments yet.
              </p>
              <Button asChild size='lg'>
                <Link href='/upload'>
                  <Camera className='size-5' />
                  Capture a Moment
                </Link>
              </Button>
            </div>
          ) : (
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-5'>
              {mine.map((photo) => (
                <PhotoTile key={photo.id} photo={photo} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className='border-bronze/30 border-t bg-black/40 py-5 text-center'>
        <p className='font-display text-bronze text-[11px] tracking-[0.35em] uppercase'>
          Anjunadeep Explorations · MMXXVI
        </p>
      </footer>
    </div>
  )
}
