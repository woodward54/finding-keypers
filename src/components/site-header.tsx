import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className='border-bronze/30 relative z-20 border-b bg-black/40 backdrop-blur-sm'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6'>
        <Link href='/' className='group flex items-center gap-3'>
          <Image
            src='/assets/finding-keypers-icon.webp'
            alt='Finding Keypers'
            width={48}
            height={48}
            priority
            className='hidden size-11 zoom-105 rounded-md object-cover transition-transform duration-500 group-hover:scale-105 sm:flex'
          />
          <div className='leading-none'>
            <span className='font-display text-gilded block text-lg font-bold tracking-[0.28em] uppercase sm:text-xl'>
              Finding Keypers
            </span>
            <span className='text-bronze mt-1 block text-[10px] tracking-[0.4em] uppercase'>
              The Explorer&apos;s Vault
            </span>
          </div>
        </Link>

        <Button
          asChild
          size='icon'
          className='group border-bronze shadow-gold hover:border-gold size-12 overflow-hidden rounded-[8px] border-[0.5px] bg-black/50 p-0.5 hover:bg-black/70'
        >
          <Link href='/upload' aria-label='Add your portrait'>
            <Image
              src='/assets/finding-keypers-icon-camera.webp'
              alt=''
              width={44}
              height={44}
              className='h-auto w-11 object-contain transition-transform duration-300 group-hover:scale-110'
            />
          </Link>
        </Button>
      </div>
    </header>
  )
}
