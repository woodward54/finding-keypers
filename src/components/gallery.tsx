"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoTile } from "@/components/photo-tile";
import { useMomentPhotos, type MomentPhoto } from "@/lib/use-moment-photos";

// Per-column scroll speeds in pixels per second. Each column scrolls at a
// slightly different pace for a layered parallax feel. The marquee duration is
// derived from the column's measured content height, so the on-screen speed
// stays constant no matter how many photos are loaded.
const SPEEDS = [52, 45, 28, 22];

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

function MarqueeColumn({
  photos,
  goingDown,
  pxPerSecond,
}: {
  photos: MomentPhoto[];
  goingDown: boolean;
  pxPerSecond: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  // The keyframes travel -50% of the track (one copy of the column), so the
  // duration that yields a constant speed is half the track height ÷ px/s.
  // Measure with a ResizeObserver so image loads and viewport changes keep
  // the speed steady.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      const distance = track.scrollHeight / 2;
      if (distance > 0) setDuration(distance / pxPerSecond);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [pxPerSecond]);

  return (
    <div className="pause-on-hover relative overflow-hidden">
      <div
        ref={trackRef}
        className={
          goingDown
            ? "flex flex-col gap-3 animate-marquee-down sm:gap-4 md:gap-5"
            : "flex flex-col gap-3 animate-marquee-up sm:gap-4 md:gap-5"
        }
        style={
          {
            // Hold the marquee still until the first measurement lands.
            animationPlayState: duration === null ? "paused" : undefined,
            "--marquee-duration": `${duration ?? 60}s`,
          } as React.CSSProperties
        }
      >
        {/* Duplicate the column so the loop is seamless. */}
        {[...photos, ...photos].map((photo, i) => (
          <PhotoTile key={`${photo.id}-${i}`} photo={photo} />
        ))}
      </div>
    </div>
  );
}

export function Gallery() {
  const { photos } = useMomentPhotos();
  const columnCount = useColumnCount();
  const columns = splitIntoColumns(photos, columnCount);

  return (
    <div className="mask-fade-y relative grid h-[78vh] grid-cols-2 gap-3 overflow-hidden px-3 sm:gap-4 sm:px-4 md:h-[82vh] md:grid-cols-4 md:gap-5">
      {columns.map((col, ci) => {
        if (col.length === 0) return <div key={ci} />;
        return (
          <MarqueeColumn
            key={ci}
            photos={col}
            goingDown={ci % 2 === 1}
            pxPerSecond={SPEEDS[ci % SPEEDS.length]}
          />
        );
      })}
    </div>
  );
}
