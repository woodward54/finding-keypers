'use client'

import { DecoPortrait } from '@/components/deco-art'
import type { MomentPhoto } from '@/lib/placeholder-photos'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// Each tile starts hidden and fades in after a random delay in this range, so
// the gallery assembles itself in a scattered, staggered shimmer on load.
const ENTRANCE_MAX_DELAY_MS = 700

export function PhotoTile({ photo, className }: { photo: MomentPhoto; className?: string }) {
  // Photo tiles show the generated deco placeholder immediately and fade the
  // animated WebP in once it has downloaded, so every tile (in every column)
  // appears at once and the real frames stream in progressively rather than
  // column-by-column.
  const [loaded, setLoaded] = useState(false)
  // Staggered entrance: hidden on mount, revealed after a per-tile random delay.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), Math.random() * ENTRANCE_MAX_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Link
      href={`/view/${encodeURIComponent(photo.id)}`}
      aria-label={`View ${photo.name}`}
      className={cn(
        'group border-bronze/40 bg-noir relative block overflow-hidden rounded-md border',
        'shadow-[0_8px_30px_-12px_rgba(0,0,0,0.9)] transition-all duration-1000 ease-in',
        'hover:border-gold hover:shadow-gold hover:-translate-y-1',
        entered ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {/* Image / generated portrait */}
      <div className='aspect-[3/4] w-full overflow-hidden'>
        {photo.url ? (
          <div className='relative h-full w-full transition-transform duration-700 ease-out group-hover:scale-105'>
            {/* Instant placeholder, kept mounted under the image until it loads. */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-700',
                loaded ? 'opacity-0' : 'opacity-100'
              )}
            >
              <DecoPortrait seed={photo.seed} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.name}
              onLoad={() => setLoaded(true)}
              className={cn(
                'relative h-full w-full object-cover transition-opacity duration-700',
                loaded ? 'opacity-100' : 'opacity-0'
              )}
            />
          </div>
        ) : (
          <div className='h-full w-full transition-transform duration-700 ease-out group-hover:scale-105'>
            <DecoPortrait seed={photo.seed} />
          </div>
        )}
      </div>

      {/* Diagonal shine sweep on hover */}
      <div className='via-gold/20 pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 group-hover:translate-x-full' />

      {/* Inner deco frame */}
      <div className='border-gold/20 pointer-events-none absolute inset-1.5 rounded-[2px] border' />

      {/* Name plate */}
      <div className='absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-8 pb-2.5'>
        <div className='mx-auto flex items-center justify-center gap-2'>
          <span className='bg-bronze/70 h-px w-4' />
          <span className='font-display text-gold text-[11px] tracking-[0.22em] uppercase'>
            {photo.name}
          </span>
          <span className='bg-bronze/70 h-px w-4' />
        </div>
      </div>
    </Link>
  )
}
