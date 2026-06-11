"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type MomentPhoto = {
  id: string;
  name: string;
  url: string | null; // storage URL; null if the stored file has gone missing
  createdAt: number;
};

/**
 * The full gallery: live Convex uploads, newest first.
 * `isLoading` is true only while Convex is still resolving its first response.
 */
export function useMomentPhotos(): { photos: MomentPhoto[]; isLoading: boolean } {
  const data = useQuery(api.photos.list);

  return {
    photos: data ?? [],
    isLoading: data === undefined,
  };
}
