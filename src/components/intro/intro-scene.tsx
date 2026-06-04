'use client'

import { Environment, Html, Lightformer, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import { FadingSparkles } from '../view/fading-sparkles'
import { GlowFloor } from '../view/glow-floor'

/* --------------------------- Narration script ---------------------------- *
 * Each block is rendered centred, fades in over `fadeIn`, holds for `hold`,
 * then fades out over `fadeOut` (all in ms). Timings are tuned so each block
 * lingers long enough to read comfortably.
 * -------------------------------------------------------------------------- */
type Block = {
  lines?: string[]
  image?: {
    src: string
  }
  hold: number
  fadeIn?: number
  fadeOut?: number
  delay?: number // beat of black before this block fades in (ms)
}

const DEFAULT_FADE_IN = 1000
const DEFAULT_FADE_OUT = 1800

const BLOCKS: Block[] = [
  { lines: ['Welcome, explorers.'], hold: 3000, delay: 3000 },
  {
    lines: [
      'Among thousands of paths,',
      'yours crossed here.',
      '',
      'Through curiosity, Anjuna',
      'and unlocking this hidden box.',
    ],
    hold: 6800,
  },
  {
    lines: ['But not all treasures', 'are meant to be hidden forever.'],
    hold: 4000,
  },
  {
    lines: ["They're meant to be shared."],
    hold: 2890,
    fadeOut: 4000,
  },
  {
    lines: [
      'Find the others.',
      '',
      'Awaken their wonder.',
      '',
      'Leave this world a little',
      'more connected than you found it.',
    ],
    hold: 6000,
  },
  { lines: ['But first…'], hold: 2000 },
  {
    lines: [
      'Capture the moment.',
      'So when this becomes a memory,',
      "you'll remember when",
      'two worlds briefly became one…',
    ],
    hold: 6000,
  },
  {
    image: { src: '/assets/finding-keypers-icon.png' },
    hold: 2000,
    fadeOut: 5200,
  },
]

const LAST_BLOCK_INDEX = BLOCKS.length - 1
const FINAL_SCENE_FADE_OUT = BLOCKS[LAST_BLOCK_INDEX]?.fadeOut ?? DEFAULT_FADE_OUT
const REVEAL_DURATION = 1900 // initial fade in from black
const BLACKOUT_DURATION = 2400 // final fade to black before redirect
const MANUAL_FADE = 700 // snappier cross-fade used when navigating via keyboard

// Peak displacement (in px) the noise pushes glyph pixels when fully dissolved.
// Large enough to shatter the letters into drifting specks rather than smear them.
const MAX_DISPERSE = 64

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

function Narration({
  onComplete,
  onSceneFadeOut,
}: {
  onComplete: () => void
  onSceneFadeOut: () => void
}) {
  // step: -1 = initial blackout, 0..N-1 = blocks, N = final blackout
  const [step, setStep] = useState(-1)
  const [shown, setShown] = useState(false)
  const [cover, setCover] = useState(1) // black cover opacity
  // When set, overrides the active block's fade timing (used by keyboard nav).
  const [overrideDur, setOverrideDur] = useState<number | null>(null)
  const navRef = useRef(false) // next block change came from manual navigation
  const stepRef = useRef(step) // latest step, readable from stable callbacks
  const navTimers = useRef<number[]>([]) // pending manual-nav timeouts
  useEffect(() => {
    stepRef.current = step
  }, [step])

  // The cover reveals slowly at the start and blacks out a touch slower at the end.
  const coverDuration = step >= BLOCKS.length ? BLACKOUT_DURATION : REVEAL_DURATION

  // Kick off: fade in from black, then begin the first block.
  useEffect(() => {
    const t = setTimeout(() => {
      setCover(0)
      setStep(0)
    }, 80)
    return () => clearTimeout(t)
  }, [])

  // Drive each block's in / hold / out cycle.
  useEffect(() => {
    if (step < 0) return

    if (step >= BLOCKS.length) {
      const raf = requestAnimationFrame(() => setCover(1))
      const done = setTimeout(onComplete, BLACKOUT_DURATION + 200)
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(done)
      }
    }

    const block = BLOCKS[step]
    const fadeIn = block.fadeIn ?? DEFAULT_FADE_IN
    const fadeOut = block.fadeOut ?? DEFAULT_FADE_OUT
    // Manual navigation cuts straight in, skipping the scripted opening beat.
    const delay = navRef.current ? 0 : (block.delay ?? 0)
    navRef.current = false

    const showAt = setTimeout(() => setShown(true), delay)
    const hideAt = setTimeout(
      () => {
        setShown(false)
        if (step === LAST_BLOCK_INDEX) {
          onSceneFadeOut()
        }
      },
      delay + fadeIn + block.hold
    )
    const nextAt = setTimeout(() => setStep((s) => s + 1), delay + fadeIn + block.hold + fadeOut)

    return () => {
      clearTimeout(showAt)
      clearTimeout(hideAt)
      clearTimeout(nextAt)
    }
  }, [step, onComplete, onSceneFadeOut])

  const block = step >= 0 && step < BLOCKS.length ? BLOCKS[step] : null
  const fadeIn = block?.fadeIn ?? DEFAULT_FADE_IN
  const fadeOut = block?.fadeOut ?? DEFAULT_FADE_OUT
  // Drive the dissolve + fade with the active direction's timing.
  // Keyboard navigation overrides this with a snappier cross-fade.
  const dur = overrideDur ?? (shown ? fadeIn : fadeOut)

  // Noise dissolve: `disperse` runs 0 (assembled / crisp) ↔ 1 (scattered into
  // specks), driving the SVG displacement filter below. We animate it per-frame
  // — CSS can't transition filter-primitive attributes — easing toward 0 as the
  // block appears and 1 as it leaves, in lockstep with the opacity fade.
  const filterId = useId().replace(/:/g, '')
  const [disperse, setDisperse] = useState(1)
  const disperseRef = useRef(1)
  useEffect(() => {
    const from = disperseRef.current
    const target = shown ? 0 : 1
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const value = from + (target - from) * easeInOut(t)
      disperseRef.current = value
      setDisperse(value)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown, dur])

  const dispScale = disperse * MAX_DISPERSE

  const hasLines = Boolean(block?.lines?.length)

  // Keyboard navigation: jump to the prev/next block with a quick cross-fade.
  const navigate = useCallback((dir: number) => {
    const s = stepRef.current
    if (s < 0 || s >= BLOCKS.length) return
    const target = s + dir
    if (target < 0 || target >= BLOCKS.length) return

    for (const timer of navTimers.current) {
      clearTimeout(timer)
    }
    navTimers.current = []
    setOverrideDur(MANUAL_FADE)
    setShown(false) // fade the current block out…
    navTimers.current.push(
      window.setTimeout(() => {
        navRef.current = true
        setStep(target) // …then swap in the target and let it fade back up
        navTimers.current.push(window.setTimeout(() => setOverrideDur(null), MANUAL_FADE + 60))
      }, MANUAL_FADE)
    )
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigate(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Clear any pending nav timers on unmount.
  useEffect(
    () => () => {
      for (const timer of navTimers.current) {
        clearTimeout(timer)
      }
    },
    []
  )

  return (
    <div
      className='pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none'
      style={{
        // Cinzel via the app's --font-cinzel token, with system fallbacks.
        fontFamily: 'var(--font-cinzel), Georgia, serif',
      }}
    >
      {/* SVG noise-dissolve filter: fractal turbulence displaces the glyph
          pixels, and a threshold on its alpha eats holes that grow with
          `dispScale`, so the text crumbles into drifting specks. The trailing
          blur softens the speck edges. */}
      <svg aria-hidden width='0' height='0' style={{ position: 'absolute', pointerEvents: 'none' }}>
        <filter
          id={filterId}
          x='-50%'
          y='-50%'
          width='200%'
          height='200%'
          colorInterpolationFilters='sRGB'
        >
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.62'
            numOctaves={2}
            seed={4}
            stitchTiles='stitch'
            result='noise'
          />
          {/* Erode the glyph alpha by the noise — holes open up as it dissolves. */}
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale={dispScale}
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
      </svg>

      <div className='flex flex-col items-center'>
        {block?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.image.src}
            alt=''
            aria-hidden
            className='h-40 w-40 object-contain md:h-56 md:w-56'
            style={{
              opacity: shown ? 1 : 0,
              transform: `translateY(${shown ? 0 : 14}px)`,
              transition: `opacity ${dur}ms ease-in-out, transform ${dur}ms ease-in-out`,
              filter: 'drop-shadow(0 0 30px rgba(237, 179, 69, 0.35))',
              willChange: 'opacity, transform',
            }}
          />
        )}

        {hasLines && (
          <div
            className='mx-auto max-w-3xl px-8 text-center'
            style={{
              opacity: shown ? 1 : 0,
              // Particle dissolve: glyph pixels scatter via the SVG noise filter
              // (driven by `dispScale`) while a gentle lift + residual blur keep the
              // edges soft — layered on top of the opacity fade for a "disintegrate
              // into dust" feel.
              transform: `translateY(${shown ? 0 : 14}px)`,
              filter: `url(#${filterId}) blur(${disperse * 1.5}px)`,
              transition: `opacity ${dur}ms ease-in-out, transform ${dur}ms ease-in-out`,
              willChange: 'opacity, transform, filter',
            }}
          >
            {/* Top deco rule */}
            <div
              className='mx-auto mb-7 h-px w-24'
              style={{
                background:
                  'linear-gradient(to right, transparent, #c98f37 40%, #f4d488 50%, #c98f37 60%, transparent)',
              }}
            />

            {block?.lines?.map((line, i) =>
              // An empty string is an intentional blank line — render a spacer
              // (an empty <p> generates no line box and collapses to zero height).
              line === '' ? (
                <div key={i} aria-hidden style={{ height: '0.9em' }} />
              ) : (
                <p
                  key={i}
                  className='font-display text-[1rem] leading-relaxed font-medium tracking-[0.18em] uppercase sm:text-[1.2rem] md:text-[1.5rem] md:leading-normal'
                  style={{
                    backgroundImage:
                      'linear-gradient(100deg, #b07d2e 0%, #e8c06a 35%, #fbe6a8 50%, #e8c06a 65%, #b07d2e 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(237, 179, 69, 0.18)',
                    marginTop: i === 0 ? 0 : '0.35em',
                  }}
                >
                  {line}
                </p>
              )
            )}

            {/* Bottom deco rule */}
            <div
              className='mx-auto mt-7 h-px w-24'
              style={{
                background:
                  'linear-gradient(to right, transparent, #c98f37 40%, #f4d488 50%, #c98f37 60%, transparent)',
              }}
            />
          </div>
        )}
      </div>

      {/* Full-screen black cover — handles the opening fade-in and closing fade-out */}
      <div
        className='absolute inset-0 bg-black'
        style={{
          opacity: cover,
          transition: `opacity ${coverDuration}ms ease-in-out`,
          willChange: 'opacity',
        }}
      />
    </div>
  )
}

function useSceneOpacity(visible: boolean, durationMs: number) {
  const [opacity, setOpacity] = useState(1)
  const opacityRef = useRef(1)
  const animationRef = useRef<{ from: number; target: number; elapsed: number } | null>(null)

  useEffect(() => {
    const target = visible ? 1 : 0
    if (opacityRef.current === target) return
    animationRef.current = { from: opacityRef.current, target, elapsed: 0 }
  }, [visible])

  useFrame((_, delta) => {
    const animation = animationRef.current
    if (!animation) return

    animation.elapsed += delta * 1000
    const t = Math.min(1, animation.elapsed / durationMs)
    const value = animation.from + (animation.target - animation.from) * easeInOut(t)
    opacityRef.current = value
    setOpacity(value)

    if (t === 1) {
      animationRef.current = null
    }
  })

  return opacity
}

function SceneContents({ onComplete }: { onComplete: () => void }) {
  const [sceneVisible, setSceneVisible] = useState(true)
  const sceneOpacity = useSceneOpacity(sceneVisible, FINAL_SCENE_FADE_OUT)
  const handleSceneFadeOut = useCallback(() => setSceneVisible(false), [])

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={45} />
      {/* Slow ambient drift; user input disabled so the sequence stays cinematic */}
      <OrbitControls
        makeDefault
        target={[0, 1.6, 0]}
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.12}
      />

      <color attach='background' args={['#000000']} />
      <fog attach='fog' args={['#000000', 5, 190]} />

      {/* Lighting (floor + particles are self-lit; kept for parity with /view) */}
      <ambientLight intensity={0.35 * sceneOpacity} color={'#ffdca0'} />
      <pointLight
        position={[2.5, 4, 4]}
        intensity={32 * sceneOpacity}
        color={'#ffcf8f'}
        distance={22}
        decay={2}
      />
      <pointLight
        position={[-3, 2, 2.5]}
        intensity={14 * sceneOpacity}
        color={'#ffe6bf'}
        distance={16}
        decay={2}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer
          intensity={2 * sceneOpacity}
          color={'#ffe6bf'}
          position={[0, 4, 4]}
          scale={[6, 6, 1]}
        />
        <Lightformer
          intensity={1.2 * sceneOpacity}
          color={'#ffd79a'}
          position={[-4, 2, 2]}
          scale={[3, 5, 1]}
        />
        <Lightformer
          intensity={1.2 * sceneOpacity}
          color={'#ffd79a'}
          position={[4, 2, 2]}
          scale={[3, 5, 1]}
        />
      </Environment>

      <Suspense fallback={null}>
        <GlowFloor opacity={sceneOpacity} />
      </Suspense>

      {/* Light particles drifting through the hall */}
      <FadingSparkles
        count={150}
        scale={[14, 9, 14]}
        position={[0, 3, 0]}
        size={1.6}
        speed={0.25}
        opacity={0.5 * sceneOpacity}
        color={'#ffd79a'}
        noise={1.3}
      />

      {/* Narration text lives in the DOM, overlaid on the 3D scene via drei <Html>.
          `calculatePosition` is pinned to the screen centre so the fullscreen overlay
          fills the viewport exactly — independent of the camera / auto-rotation, which
          would otherwise offset a fullscreen <Html> anchored to a world point. */}
      <Html
        fullscreen
        zIndexRange={[20, 10]}
        calculatePosition={(_el, _camera, size) => [size.width / 2, size.height / 2]}
      >
        <Narration onComplete={onComplete} onSceneFadeOut={handleSceneFadeOut} />
      </Html>

      <EffectComposer>
        <Bloom
          intensity={0.7 * sceneOpacity}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.1}
        />
      </EffectComposer>
    </>
  )
}

export function IntroScene({ onComplete }: { onComplete: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
      className='h-full w-full'
    >
      <SceneContents onComplete={onComplete} />
    </Canvas>
  )
}
