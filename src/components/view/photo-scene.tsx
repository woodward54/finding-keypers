"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import type { KeyperPhoto } from "@/lib/placeholder-photos";
import { makeDecoPortraitTexture } from "./view-textures";

const BASE_Y = 2.2; // height of the floating picture's centre
const PIC_HEIGHT = 3;

/**
 * Which PBR material the picture frame uses.
 * Switch between the sets in `public/assets/pbr/art-deco-{1,2}`.
 *   1 -> art-deco-1
 *   2 -> art-deco-2
 */
const FRAME_MATERIAL: 1 | 2 = 2;
// How many texture tiles span the thickness of the frame band. Texels are kept
// square along the length, so raise this for finer detail, lower for coarser.
const FRAME_TILES_ACROSS = 0.1;

/* ------------------------- Animated glowing floor ------------------------- */
const floorVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFragment = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uTex;
  uniform vec3 uGlow;
  uniform float uRepeat;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Repeated art-deco pattern
    vec2 uv = vUv * uRepeat;
    vec3 pat = texture2D(uTex, uv).rgb;
    float patLum = dot(pat, vec3(0.299, 0.587, 0.114));

    // Smaller, faster-varying noise fields drive where the floor glows
    float n = fbm(vUv * 9.0 + vec2(uTime * 0.06, -uTime * 0.04));
    float n2 = fbm(vUv * 18.0 - vec2(uTime * 0.10, uTime * 0.07));
    float pulse = 0.5 + 0.5 * sin(uTime * 1.2 + n * 6.2831 + n2 * 3.0);
    // High threshold + steep power ramp: low areas drop to black quickly so
    // most of the floor stays dark and the gold only flares in bright pockets.
    float glow = smoothstep(0.52, 0.92, n);
    glow = pow(glow, 2.5) * pulse;

    // Tiny base term so the gold lines barely peek through the black
    vec3 col = uGlow * patLum * (0.05 + glow * 3.2);

    // Radial fade so the floor dissolves into the black fog at the edges
    float d = distance(vUv, vec2(0.5));
    col *= smoothstep(0.55, 0.04, d);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function GlowFloor() {
  const tex = useTexture("/assets/finding-keypers-pattern.png");
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return {
      uTime: { value: 0 },
      uTex: { value: tex },
      // Match the UI `--gold` token: oklch(0.8 0.14 80) === sRGB #edb345.
      // The hex-string constructor converts sRGB -> linear (working space), and
      // the composer's final linear -> sRGB pass lands it back on #edb345.
      uGlow: { value: new THREE.Color("#edb345") },
      uRepeat: { value: 12 },
    };
  }, [tex]);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[33, 33]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={floorVertex}
        fragmentShader={floorFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/* ------------------------- 3D Art Deco picture frame ----------------------- */
const FRAME_W = 0.11; // thin border band
const FRAME_DEPTH = 0.09;

function DecoFrame({ w, h }: { w: number; h: number }) {
  const dir = `/assets/pbr/art-deco-${FRAME_MATERIAL}`;
  const textures = useTexture({
    map: `${dir}/material_basecolor.jpeg`,
    normalMap: `${dir}/material_normal.jpeg`,
    roughnessMap: `${dir}/material_roughness.jpeg`,
    metalnessMap: `${dir}/material_metalness.jpeg`,
  });

  // Build a material whose UV tiling matches a face's real size, so texels stay
  // square (no stretching). `faceW`/`faceH` are the dimensions of the face the
  // material maps onto, in world units.
  const { matH, matV, matCorner } = useMemo(() => {
    const density = FRAME_TILES_ACROSS / FRAME_W; // tiles per world unit
    const build = (faceW: number, faceH: number) => {
      const clone = (src: THREE.Texture, srgb: boolean) => {
        const t = src.clone();
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(faceW * density, faceH * density);
        t.anisotropy = 8;
        t.needsUpdate = true;
        return t;
      };
      return new THREE.MeshStandardMaterial({
        map: clone(textures.map, true),
        normalMap: clone(textures.normalMap, false),
        roughnessMap: clone(textures.roughnessMap, false),
        metalnessMap: clone(textures.metalnessMap, false),
        metalness: 1,
        roughness: 1,
        envMapIntensity: 1,
      });
    };
    const lh = w + 2 * FRAME_W;
    return {
      matH: build(lh, FRAME_W), // horizontal bars + crests
      matV: build(FRAME_W, h), // vertical bars
      matCorner: build(0.1, 0.1), // corner diamonds
    };
  }, [textures, w, h]);

  const bx = w / 2 + FRAME_W / 2; // centre of the vertical bars
  const by = h / 2 + FRAME_W / 2; // centre of the horizontal bars
  const cx = w / 2 + FRAME_W / 2;
  const cy = h / 2 + FRAME_W / 2;
  // Slim stepped crest tiers above and below
  const tiers = [
    { wd: 0.7, y: 0.08 },
    { wd: 0.44, y: 0.16 },
    { wd: 0.22, y: 0.23 },
  ];

  return (
    <group>
      {/* Four border bars */}
      <mesh material={matH} position={[0, by, 0]}>
        <boxGeometry args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH]} />
      </mesh>
      <mesh material={matH} position={[0, -by, 0]}>
        <boxGeometry args={[w + 2 * FRAME_W, FRAME_W, FRAME_DEPTH]} />
      </mesh>
      <mesh material={matV} position={[-bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH]} />
      </mesh>
      <mesh material={matV} position={[bx, 0, 0]}>
        <boxGeometry args={[FRAME_W, h, FRAME_DEPTH]} />
      </mesh>

      {/* Corner diamonds
      {[
        [-cx, -cy],
        [cx, -cy],
        [-cx, cy],
        [cx, cy],
      ].map(([x, y], i) => (
        <mesh
          key={i}
          material={matCorner}
          position={[x, y, 1]}
          rotation-z={Math.PI / 4}
        >
          <boxGeometry args={[0.14, 0.14, FRAME_DEPTH + 0.04]} />
        </mesh>
      ))} */}

      {/* Stepped deco crest, top and bottom */}
      {tiers.map((t, i) => (
        <mesh material={matH} key={`top-${i}`} position={[0, cy + t.y, 0]}>
          <boxGeometry args={[t.wd, 0.05, FRAME_DEPTH]} />
        </mesh>
      ))}
      {tiers.map((t, i) => (
        <mesh material={matH} key={`bot-${i}`} position={[0, -cy - t.y, 0]}>
          <boxGeometry args={[t.wd, 0.05, FRAME_DEPTH]} />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------- Floating photo ----------------------------- */
function FloatingPlane({
  tex,
  aspect,
}: {
  tex: THREE.Texture;
  aspect: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const h = PIC_HEIGHT;
  const w = h * aspect;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 0.08;
    ref.current.rotation.z = Math.sin(t * 0.4) * 0.015;
  });

  return (
    <group ref={ref} position={[0, BASE_Y, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <DecoFrame w={w} h={h} />
    </group>
  );
}

function UrlImage({ url }: { url: string }) {
  const tex = useTexture(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img && img.height ? img.width / img.height : 3 / 4;
  return <FloatingPlane tex={tex} aspect={aspect} />;
}

function DecoImage({ seed }: { seed: number }) {
  const tex = useMemo(() => makeDecoPortraitTexture(seed), [seed]);
  return <FloatingPlane tex={tex} aspect={200 / 260} />;
}

/* -------------------------------- Scene ----------------------------------- */
function SceneContents({ photo }: { photo: KeyperPhoto }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3, 8]} fov={45} />
      <OrbitControls
        makeDefault
        target={[0, BASE_Y, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={11}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.04}
        autoRotate
        autoRotateSpeed={0.1}
      />

      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 5, 190]} />

      {/* Lighting for the metal frame (photo + floor are self-lit) */}
      <ambientLight intensity={0.35} color={"#ffdca0"} />
      <pointLight position={[2.5, 4, 4]} intensity={32} color={"#ffcf8f"} distance={22} decay={2} />
      <pointLight position={[-3, 2, 2.5]} intensity={14} color={"#ffe6bf"} distance={16} decay={2} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} color={"#ffe6bf"} position={[0, 4, 4]} scale={[6, 6, 1]} />
        <Lightformer intensity={1.2} color={"#ffd79a"} position={[-4, 2, 2]} scale={[3, 5, 1]} />
        <Lightformer intensity={1.2} color={"#ffd79a"} position={[4, 2, 2]} scale={[3, 5, 1]} />
      </Environment>

      <Suspense fallback={null}>
        {photo.url ? <UrlImage url={photo.url} /> : <DecoImage seed={photo.seed} />}
        <GlowFloor />
      </Suspense>

      {/* Light particles drifting through the hall */}
      <Sparkles
        count={150}
        scale={[14, 9, 14]}
        position={[0, 3, 0]}
        size={1.6}
        speed={0.25}
        opacity={0.5}
        color={"#ffd79a"}
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
    </>
  );
}

export function PhotoScene({ photo }: { photo: KeyperPhoto }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
      className="h-full w-full"
    >
      <SceneContents photo={photo} />
    </Canvas>
  );
}
