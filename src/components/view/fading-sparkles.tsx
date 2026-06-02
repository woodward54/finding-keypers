"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

type SparklesProps = Parameters<typeof Sparkles>[0];

type FadingSparklesProps = SparklesProps & {
  fadeDuration?: number;
};

export function FadingSparkles({
  fadeDuration = 3.5,
  opacity = 1,
  ...props
}: FadingSparklesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const fadeRef = useRef(0);
  const targetOpacity = typeof opacity === "number" ? opacity : 1;

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    fadeRef.current = Math.min(fadeRef.current + delta / fadeDuration, 1);

    const opacityAttribute = points.geometry.getAttribute(
      "opacity",
    ) as THREE.BufferAttribute;

    for (let index = 0; index < opacityAttribute.count; index += 1) {
      opacityAttribute.setX(index, targetOpacity * fadeRef.current);
    }

    opacityAttribute.needsUpdate = true;
  });

  return <Sparkles ref={pointsRef} opacity={0} {...props} />;
}
