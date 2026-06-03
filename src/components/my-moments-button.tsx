'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Hero CTA linking to this explorer's own captured moments, with a live count
 * badge once the persisted store has rehydrated.
 */
export function MyMomentsButton() {
  return (
    <Button asChild variant='outline' className='text-gold'>
      <Link href='/moments'>My Moments</Link>
    </Button>
  )
}
