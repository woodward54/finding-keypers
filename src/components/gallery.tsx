"use client";

import { useEffect, useState } from "react";
import { PhotoTile } from "@/components/photo-tile";
import { type MomentPhoto } from "@/lib/placeholder-photos";
import { useMomentPhotos } from "@/lib/use-moment-photos";

// Base per-column scroll durations (seconds), tuned for the 4-column desktop
// layout. Each column scrolls at a slightly different pace for a layered
// parallax feel.
const DURATIONS = [44, 58, 50, 64];

// Mobile shows 2 columns instead of 4, so each column holds ~2× the photos and
// is ~2× taller. The marquee always travels a fixed -50% of that height in a
// fixed time, so the scroll runs noticeably faster there. Stretch the duration
// on mobile to ease the speed back down.
const MOBILE_SLOWDOWN = 2;

/** 2 columns on mobile, 4 from the `md` breakpoint up. */
function useColumnCount() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setCols(mq.matches ? 4 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return cols;
}

function splitIntoColumns(photos: MomentPhoto[], n: number) {
  const cols: MomentPhoto[][] = Array.from({ length: n }, () => []);
  photos.forEach((p, i) => cols[i % n].push(p));
  return cols;
}

export function Gallery() {
  const { photos } = useMomentPhotos();
  const columnCount = useColumnCount();
  const columns = splitIntoColumns(photos, columnCount);
  // Fewer columns ⇒ taller columns ⇒ faster scroll, so slow the marquee on mobile.
  const speedScale = columnCount < 4 ? MOBILE_SLOWDOWN : 1;

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
                  "--marquee-duration": `${DURATIONS[ci % DURATIONS.length] * speedScale}s`,
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
