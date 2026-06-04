'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useCallback, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

const IntroScene = dynamic(
  () => import('@/components/intro/intro-scene').then((m) => m.IntroScene),
  {
    ssr: false,
    loading: () => <div className='h-full w-full bg-black' />,
  }
)

export default function IntroPage() {
  const router = useRouter()

  // Gate on the client: zustand's persisted value isn't reliable until the
  // browser has hydrated from localStorage, so we render only black on the
  // server / first paint to avoid a flash (and any SSR mismatch).
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

  const handleComplete = useCallback(() => {
    posthog.capture('intro_completed')
    router.replace('/upload')
  }, [router])

  const showIntro = isClient

  return (
    <main className='fixed inset-0 overflow-hidden bg-black'>
      {showIntro ? <IntroScene onComplete={handleComplete} /> : null}
    </main>
  )
}
