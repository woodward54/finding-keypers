"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

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
  uniform float uFade;
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

    gl_FragColor = vec4(col * uFade, uFade);
  }
`;

export function GlowFloor({ opacity = 1 }: { opacity?: number }) {
  const tex = useTexture("/assets/finding-keypers-pattern.webp");
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const fadeRef = useRef(0);

  const texture = useMemo(() => {
    const configuredTexture = tex.clone();
    configuredTexture.wrapS = configuredTexture.wrapT = THREE.RepeatWrapping;
    configuredTexture.colorSpace = THREE.SRGBColorSpace;
    configuredTexture.needsUpdate = true;
    return configuredTexture;
  }, [tex]);

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uTex: { value: texture },
      // Match the UI `--gold` token: oklch(0.8 0.14 80) === sRGB #edb345.
      // The hex-string constructor converts sRGB -> linear (working space), and
      // the composer's final linear -> sRGB pass lands it back on #edb345.
      uGlow: { value: new THREE.Color("#edb345") },
      uRepeat: { value: 12 },
      uFade: { value: 0 },
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (!matRef.current) return;

    const { uniforms } = matRef.current;
    fadeRef.current = Math.min(fadeRef.current + delta / 3.5, 1);
    uniforms.uTime.value += delta;
    uniforms.uFade.value = fadeRef.current * opacity;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[33, 33]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={floorVertex}
        fragmentShader={floorFragment}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
