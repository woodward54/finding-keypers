"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PLACEHOLDER_PHOTOS, type KeyperPhoto } from "@/lib/placeholder-photos";

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/**
 * The full gallery: live Convex uploads first, then the curated placeholders.
 * `isLoading` is true only while Convex is still resolving its first response.
 */
export function useKeyperPhotos(): { photos: KeyperPhoto[]; isLoading: boolean } {
  const data = useQuery(api.photos.list);

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
    isLoading: data === undefined,
  };
}
