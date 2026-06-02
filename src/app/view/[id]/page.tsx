"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useKeyperPhotos } from "@/lib/use-keyper-photos";

const PhotoScene = dynamic(
  () => import("@/components/view/photo-scene").then((m) => m.PhotoScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <p className="animate-pulse font-display text-sm uppercase tracking-[0.4em] text-gilded">
          Unlocking…
        </p>
      </div>
    ),
  },
);

export default function ViewPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { photos, isLoading } = useKeyperPhotos();
  const photo = photos.find((p) => p.id === id);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      {photo ? (
        <PhotoScene photo={photo} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <p className="animate-pulse font-display text-sm uppercase tracking-[0.4em] text-gilded">
            {isLoading ? "Unlocking…" : "Keyper not found"}
          </p>
        </div>
      )}

      {/* Overlay chrome */}
      <Link
        href="/"
        className="group absolute left-5 top-5 z-10 flex items-center gap-2 rounded-md border border-bronze/40 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-sm transition-colors hover:border-gold"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Gallery
      </Link>

      {photo && (
        <div className="pointer-events-none absolute inset-x-0 bottom-7 z-10 text-center">
          <div className="mx-auto flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-bronze/70" />
            <span className="font-display text-sm uppercase tracking-[0.3em] text-gold">
              {photo.name}
            </span>
            <span className="h-px w-8 bg-bronze/70" />
          </div>
          {/* <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-bronze/70">
            Drag to orbit
          </p> */}
        </div>
      )}
    </main>
  );
}
