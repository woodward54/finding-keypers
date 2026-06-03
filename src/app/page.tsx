import { BoxMotif, KeyMotif, LockMotif } from '@/components/deco-art'
import { Gallery } from '@/components/gallery'
import { MyMomentsButton } from '@/components/my-moments-button'
import { SiteHeader } from '@/components/site-header'

export default function Home() {
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
      {/* Dark wash so the gallery stays the focus */}
      <div className='pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.4),rgba(0,0,0,0.78))]' />

      <SiteHeader />

      <main className='relative flex-1'>
        {/* Hero */}
        <section className='relative z-10 mx-auto max-w-5xl p-6 text-center'>
          <div className='text-bronze mb-4 flex items-center justify-center gap-6'>
            <KeyMotif className='h-7 w-7 opacity-80' />
            <span className='to-bronze h-px w-12 bg-gradient-to-r from-transparent sm:w-20' />
            <LockMotif className='h-9 w-9' />
            <span className='to-bronze h-px w-12 bg-gradient-to-l from-transparent sm:w-20' />
            <BoxMotif className='h-7 w-7 opacity-80' />
          </div>

          {/* <h1 className='animate-fade-up font-display text-4xl leading-tight font-black tracking-[0.12em] uppercase sm:text-6xl'>
            <span className='text-gilded-shimmer'>Finding Keypers</span>
          </h1> */}

          <p className='fade-in animate-in text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-relaxed text-balance duration-[2000ms] sm:text-base'>
            Every keyper holds a secret. Add your memory to the vault and take your place among the
            explorers...
          </p>

          <div className='mt-4 flex justify-center'>
            <MyMomentsButton />
          </div>

          <div className='deco-rule mx-auto mt-7 h-[3px] w-48 sm:w-72' />
        </section>

        {/* Scrolling gilded gallery */}
        <section className='relative'>
          <Gallery />
          {/* Vignette framing the marquee */}
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]' />
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
