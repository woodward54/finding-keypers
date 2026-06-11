'use client'

import { Environment, Lightformer, PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'

import { ScrollingGallery } from '@/components/home3/scrolling-gallery'
import { Button } from '@/components/ui/button'
import { FadingSparkles } from '@/components/view/fading-sparkles'
import { useMomentPhotos, type MomentPhoto } from '@/lib/use-moment-photos'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

function Home3Scene({ photos }: { photos: MomentPhoto[] }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
      className='h-full w-full'
    >
      {/* Fixed camera at the gallery's vertical centre; the rows do the moving. */}
      <PerspectiveCamera makeDefault position={[0, 2.35, 7.5]} fov={45} />

      <color attach='background' args={['#000000']} />
      <fog attach='fog' args={['#000000', 5, 190]} />

      {/* Lighting for the metal frame (photo + floor are self-lit) */}
      <ambientLight intensity={0.35} color={'#ffdca0'} />
      <pointLight position={[2.5, 4, 4]} intensity={32} color={'#ffcf8f'} distance={22} decay={2} />
      <pointLight
        position={[-3, 2, 2.5]}
        intensity={14}
        color={'#ffe6bf'}
        distance={16}
        decay={2}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} color={'#ffe6bf'} position={[0, 4, 4]} scale={[6, 6, 1]} />
        <Lightformer intensity={1.2} color={'#ffd79a'} position={[-4, 2, 2]} scale={[3, 5, 1]} />
        <Lightformer intensity={1.2} color={'#ffd79a'} position={[4, 2, 2]} scale={[3, 5, 1]} />
      </Environment>

      <ScrollingGallery photos={photos} />

      {/* Light particles drifting through the hall */}
      <FadingSparkles
        count={150}
        scale={[14, 9, 14]}
        position={[0, 3, 0]}
        size={1.6}
        speed={0.25}
        opacity={0.5}
        color={'#ffd79a'}
        noise={1.3}
      />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.1}
        />
      </EffectComposer>
    </Canvas>
  )
}

function PopoutMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className='absolute right-4 bottom-4'>
      <button
        className={cn(
          'bg-bronze border-gold absolute right-0 bottom-0 z-20 size-12 cursor-pointer rounded-full border transition-all active:scale-95'
        )}
        onClick={() => setOpen(!open)}
      />

      <Button
        asChild
        size='icon'
        className={cn(
          'group border-bronze shadow-gold hover:border-gold absolute right-0 bottom-0 z-10 size-12 overflow-hidden rounded-full border-[0.5px] bg-black/50 p-0.5 transition-all duration-150 ease-out hover:bg-black/70',
          open && 'right-4 bottom-16'
        )}
      >
        <Link href='/upload' aria-label='Add your portrait'>
          <Image
            src='/assets/finding-keypers-icon-camera.webp'
            alt=''
            width={44}
            height={44}
            loading='eager'
            className='h-auto w-11 object-contain transition-transform duration-300 group-hover:scale-110'
          />
        </Link>
      </Button>

      <Button
        asChild
        size='icon'
        className={cn(
          'group border-bronze shadow-gold hover:border-gold absolute right-0 bottom-0 z-10 size-12 overflow-hidden rounded-full border-[0.5px] bg-black/50 p-0.5 transition-all duration-150 ease-out hover:bg-black/70',
          open && 'right-16 bottom-3'
        )}
      >
        <Link href='/moments' aria-label='Add your portrait'>
          <Image
            src='/assets/finding-keypers-icon-box.png'
            alt=''
            width={44}
            height={44}
            loading='eager'
            className='h-auto w-11 object-contain transition-transform duration-200 group-hover:scale-110'
          />
        </Link>
      </Button>
    </div>
  )
}

export default function Home3Page() {
  const { photos } = useMomentPhotos()

  return (
    <main className='border-gold fixed inset-0 overflow-hidden bg-black'>
      <Home3Scene photos={photos} />

      <PopoutMenu />

      {/* TODO - single button bottom right -> opens nav menu (these 2 icons)  */}
      {/* <div className='absolute top-3 right-4 flex gap-4'>
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

        <Button
          asChild
          size='icon'
          className='group border-bronze shadow-gold hover:border-gold size-12 overflow-hidden rounded-[8px] border-[0.5px] bg-black/50 p-0.5 hover:bg-black/70'
        >
          <Link href='/moments' aria-label='Add your portrait'>
            <Image
              src='/assets/finding-keypers-icon-box.png'
              alt=''
              width={44}
              height={44}
              className='h-auto w-11 object-contain transition-transform duration-300 group-hover:scale-110'
            />
          </Link>
        </Button>
      </div> */}
    </main>
  )
}
