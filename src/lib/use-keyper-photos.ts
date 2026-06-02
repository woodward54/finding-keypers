"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLACEHOLDER_PHOTOS, type KeyperPhoto } from "@/lib/placeholder-photos";
import { env } from "@/env";

const convexEnabled = Boolean(env.NEXT_PUBLIC_CONVEX_URL);

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/**
 * The full gallery: live Convex uploads first, then the curated placeholders.
 * `isLoading` is true only while a configured Convex deployment is still
 * resolving its first response.
 */
export function useKeyperPhotos(): { photos: KeyperPhoto[]; isLoading: boolean } {
  // `convexEnabled` is a build-time constant, so this branch never changes at
  // runtime — the hook call order stays stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const data = convexEnabled ? useQuery(api.photos.list) : undefined;

  const live: KeyperPhoto[] = data
    ? data.map(
        (p: {
          id: string;
          name: string;
          url: string | null;
          createdAt: number;
        }) => ({
          id: p.id,
          name: p.name,
          url: p.url,
          seed: Math.abs(hashString(p.id)) % 5,
          createdAt: p.createdAt,
        }),
      )
    : [];

  return {
    photos: [...live, ...PLACEHOLDER_PHOTOS],
    isLoading: convexEnabled && data === undefined,
  };
}
