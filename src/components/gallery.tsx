"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PhotoTile } from "@/components/photo-tile";
import { PLACEHOLDER_PHOTOS, type KeyperPhoto } from "@/lib/placeholder-photos";
import { env } from "@/env";

const convexEnabled = Boolean(env.NEXT_PUBLIC_CONVEX_URL);
const COLUMNS = 4;
// Each column scrolls at a slightly different pace for a layered parallax feel.
const DURATIONS = ["44s", "58s", "50s", "64s"];

/** Reads live uploads from Convex (only when a deployment is configured). */
function useLivePhotos(): KeyperPhoto[] {
  // `convexEnabled` is a build-time constant, so this branch never changes at
  // runtime — the hook call order stays stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const data = convexEnabled ? useQuery(api.photos.list) : undefined;
  if (!data) return [];
  return data.map(
    (p: { id: string; name: string; url: string | null; createdAt: number }) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      seed: Math.abs(hashString(p.id)) % 5,
      createdAt: p.createdAt,
    }),
  );
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function splitIntoColumns(photos: KeyperPhoto[], n: number) {
  const cols: KeyperPhoto[][] = Array.from({ length: n }, () => []);
  photos.forEach((p, i) => cols[i % n].push(p));
  return cols;
}

export function Gallery() {
  const live = useLivePhotos();
  // Live uploads first, then the curated placeholder set.
  const photos = [...live, ...PLACEHOLDER_PHOTOS];
  const columns = splitIntoColumns(photos, COLUMNS);

  return (
    <div className="mask-fade-y relative grid h-[78vh] grid-cols-2 gap-3 overflow-hidden px-3 sm:gap-4 sm:px-4 md:h-[82vh] md:grid-cols-4 md:gap-5">
      {columns.map((col, ci) => {
        if (col.length === 0) return <div key={ci} />;
        const goingDown = ci % 2 === 1;
        return (
          <div key={ci} className="pause-on-hover relative overflow-hidden">
            <div
              className={
                goingDown
                  ? "flex flex-col gap-3 animate-marquee-down sm:gap-4 md:gap-5"
                  : "flex flex-col gap-3 animate-marquee-up sm:gap-4 md:gap-5"
              }
              style={
                {
                  "--marquee-duration": DURATIONS[ci % DURATIONS.length],
                } as React.CSSProperties
              }
            >
              {/* Duplicate the column so the loop is seamless. */}
              {[...col, ...col].map((photo, i) => (
                <PhotoTile key={`${photo.id}-${i}`} photo={photo} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
