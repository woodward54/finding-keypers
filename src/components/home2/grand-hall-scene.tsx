"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshReflectorMaterial,
  PerspectiveCamera,
  useTexture,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { FadingSparkles } from "../view/fading-sparkles";
import { makeEmblemTexture, makeWallTexture, makeWindowTexture } from "./textures";

const GOLD = "#d9a94e";
const WARM = "#ffcf8f";

/* ----------------------------- Camera rig ----------------------------- */
function Rig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (3.9 + pointer.y * 0.6 - camera.position.y) * 0.03;
    camera.lookAt(0, 2.9, -2);
  });
  return null;
}

/* ------------------------------- Floor -------------------------------- */
function Floor() {
  const base = useTexture("/assets/finding-keypers-pattern.png");

  // One image, two configured copies: a colour map and a linear depth/distortion
  // map that perturbs the reflections so the inlays read with relief.
  const { colorMap, depthMap } = useMemo(() => {
    const REPEAT = 6;
    const colorMap = base.clone();
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(REPEAT, REPEAT);
    colorMap.anisotropy = 8;
    colorMap.needsUpdate = true;

    const depthMap = base.clone();
    depthMap.colorSpace = THREE.NoColorSpace;
    depthMap.wrapS = depthMap.wrapT = THREE.RepeatWrapping;
    depthMap.repeat.set(REPEAT, REPEAT);
    depthMap.needsUpdate = true;

    return { colorMap, depthMap };
  }, [base]);

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        map={colorMap}
        distortionMap={depthMap}
        distortion={0.35}
        resolution={1024}
        blur={[120, 40]}
        mixBlur={0.7}
        mixStrength={6}
        mixContrast={1.1}
        depthScale={1}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.2}
        color="#0c0c0c"
        metalness={0.92}
        roughness={0.22}
      />
    </mesh>
  );
}

/* ------------------------------- Walls -------------------------------- */
function Walls() {
  const wall = useMemo(() => makeWallTexture(), []);
  const backTex = useMemo(() => {
    const t = wall.clone();
    t.repeat.set(6, 3);
    t.needsUpdate = true;
    return t;
  }, [wall]);
  const sideTex = useMemo(() => {
    const t = wall.clone();
    t.repeat.set(4, 3);
    t.needsUpdate = true;
    return t;
  }, [wall]);

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 8, -7.2]}>
        <planeGeometry args={[34, 22]} />
        <meshStandardMaterial
          map={backTex}
          color="#2a1d10"
          metalness={0.5}
          roughness={0.6}
        />
      </mesh>
      {/* Side walls, angled slightly inward */}
      <mesh position={[-9, 8, -1]} rotation-y={Math.PI / 2.4}>
        <planeGeometry args={[20, 22]} />
        <meshStandardMaterial map={sideTex} color="#241a0f" metalness={0.5} roughness={0.65} />
      </mesh>
      <mesh position={[9, 8, -1]} rotation-y={-Math.PI / 2.4}>
        <planeGeometry args={[20, 22]} />
        <meshStandardMaterial map={sideTex} color="#241a0f" metalness={0.5} roughness={0.65} />
      </mesh>
    </group>
  );
}

/* --------------------------- Arched window ---------------------------- */
function GrandWindow() {
  const tex = useMemo(() => makeWindowTexture(), []);
  return (
    <group position={[0, 4.0, -6.7]}>
      <mesh>
        <planeGeometry args={[6, 9]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={"#ffffff"}
          emissiveIntensity={1.1}
          transparent
          alphaTest={0.04}
          roughness={0.5}
          metalness={0.2}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Backlight bleeding through the pane */}
      <pointLight position={[0, 0.5, -1.2]} color={WARM} intensity={60} distance={18} decay={2} />
    </group>
  );
}

/* ------------------------------- Columns ------------------------------ */
function Column({ x }: { x: number }) {
  return (
    <group position={[x, 0, -4.2]}>
      {/* base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.6, 0.8, 1.6]} />
        <meshStandardMaterial color="#3a2a16" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* fluted shaft */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.62, 8.4, 24, 1]} />
        <meshStandardMaterial color="#9a7536" metalness={0.95} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      {/* capital */}
      <mesh position={[0, 9.4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.7, 1.5]} />
        <meshStandardMaterial color="#caa056" metalness={0.95} roughness={0.25} />
      </mesh>
      {/* glowing sconce on inner face */}
      <mesh position={[x > 0 ? -0.7 : 0.7, 3.4, 0]}>
        <boxGeometry args={[0.18, 0.9, 0.4]} />
        <meshStandardMaterial
          color={WARM}
          emissive={WARM}
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[x > 0 ? -1 : 1, 3.4, 0.4]}
        color={WARM}
        intensity={14}
        distance={9}
        decay={2}
      />
    </group>
  );
}

/* -------------------------------- Steps ------------------------------- */
function Steps() {
  const mat = (
    <meshStandardMaterial color="#b78a44" metalness={0.95} roughness={0.28} envMapIntensity={1.3} />
  );
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.26, 5]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.39, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.26, 3.8]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.26, 2.8]} />
        {mat}
      </mesh>
    </group>
  );
}

/* ----------------------------- Floating key --------------------------- */
function Key() {
  const emblem = useMemo(() => makeEmblemTexture(), []);
  const goldMat = (
    <meshStandardMaterial color={GOLD} metalness={1} roughness={0.22} envMapIntensity={1.6} />
  );
  return (
    <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[-0.12, 0.12]}>
      <group position={[0, 3.05, -1]}>
        {/* Bow ring */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <torusGeometry args={[0.64, 0.1, 24, 64]} />
          {goldMat}
        </mesh>
        {/* Roundel with emblem */}
        <mesh position={[0, 0.9, 0.02]}>
          <circleGeometry args={[0.57, 48]} />
          <meshStandardMaterial
            map={emblem}
            emissiveMap={emblem}
            emissive={"#ffd89a"}
            emissiveIntensity={0.75}
            metalness={0.6}
            roughness={0.35}
            transparent
          />
        </mesh>
        {/* Collar */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[0.26, 0.16, 0.22]} />
          {goldMat}
        </mesh>
        {/* Shaft */}
        <mesh position={[0, -0.34, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 1.45, 16]} />
          {goldMat}
        </mesh>
        {/* Teeth */}
        <mesh position={[0.17, -0.8, 0]} castShadow>
          <boxGeometry args={[0.28, 0.15, 0.08]} />
          {goldMat}
        </mesh>
        <mesh position={[0.15, -0.99, 0]} castShadow>
          <boxGeometry args={[0.22, 0.13, 0.08]} />
          {goldMat}
        </mesh>
        {/* Glowing tip */}
        <mesh position={[0, -1.12, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color={WARM}
            emissive={WARM}
            emissiveIntensity={2.6}
            toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 0.85, 0.6]} color={WARM} intensity={10} distance={6} decay={2} />
      </group>
    </Float>
  );
}

/* ------------------------------ Light beam ---------------------------- */
function Beam() {
  const core = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (core.current) {
      const s = 0.9 + Math.sin(clock.elapsedTime * 3) * 0.12;
      core.current.scale.x = core.current.scale.z = s;
    }
  });
  // From key tip (~y 1.95) down to the step landing (~y 0.8)
  const top = 1.95;
  const bottomY = 0.82;
  const h = top - bottomY;
  const midY = (top + bottomY) / 2;
  return (
    <group position={[0, 0, -1]}>
      <mesh ref={core} position={[0, midY, 0]}>
        <cylinderGeometry args={[0.025, 0.07, h, 24, 1, true]} />
        <meshBasicMaterial
          color={"#fff0c8"}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, midY, 0]}>
        <cylinderGeometry args={[0.1, 0.24, h, 24, 1, true]} />
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Impact glow on the steps */}
      <mesh position={[0, bottomY + 0.02, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, bottomY + 0.2, 0]} color={WARM} intensity={18} distance={7} decay={2} />
    </group>
  );
}

/* ------------------------------ The scene ----------------------------- */
function SceneContents() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 3.9, 15]} fov={42} />
      <Rig />

      <color attach="background" args={["#06040a"]} />
      <fog attach="fog" args={["#0b0805", 12, 34]} />

      <ambientLight intensity={0.28} color={WARM} />
      <hemisphereLight intensity={0.22} color={"#ffdca0"} groundColor={"#1a1206"} />
      {/* Key light from upper front */}
      <spotLight
        position={[2.5, 11, 8]}
        angle={0.5}
        penumbra={0.8}
        intensity={120}
        color={WARM}
        distance={40}
        decay={2}
      />
      <pointLight position={[0, 6, 4]} color={GOLD} intensity={20} distance={22} decay={2} />

      {/* Controlled metal reflections (no network HDR needed). frames={1}
          bakes the cubemap once instead of re-rendering it every frame. */}
      <Environment resolution={128} frames={1} background={false}>
        <Lightformer intensity={2} color={WARM} position={[0, 4, -6]} scale={[6, 9, 1]} />
        <Lightformer intensity={1.2} color={"#ffe6bf"} position={[-6, 5, 2]} scale={[3, 8, 1]} />
        <Lightformer intensity={1.2} color={"#ffe6bf"} position={[6, 5, 2]} scale={[3, 8, 1]} />
        <Lightformer intensity={0.6} color={"#33240f"} position={[0, 10, 0]} scale={[10, 10, 1]} />
      </Environment>

      <Floor />
      <Walls />
      <GrandWindow />
      <Column x={-4.2} />
      <Column x={4.2} />
      <Steps />
      <Key />
      <Beam />

      {/* Subtle ambient dust drifting through the hall */}
      <FadingSparkles
        count={70}
        scale={[16, 11, 11]}
        position={[0, 5, -1]}
        size={1.3}
        speed={0.12}
        opacity={0.3}
        color={"#e6c98c"}
        noise={0.5}
      />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.72}
          luminanceSmoothing={0.25}
          mipmapBlur
          radius={0.5}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export function GrandHall() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMappingExposure: 1.05 }}
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
}
