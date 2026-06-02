"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const GrandHall = dynamic(
  () => import("@/components/home2/grand-hall-scene").then((m) => m.GrandHall),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-noir">
        <p className="animate-pulse font-display text-sm uppercase tracking-[0.4em] text-gilded">
          Entering the Vault…
        </p>
      </div>
    ),
  },
);

export default function Home2Page() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <GrandHall />

      {/* Overlay chrome */}
      <Link
        href="/"
        className="group absolute left-5 top-5 z-10 flex items-center gap-2 rounded-md border border-bronze/40 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-gold backdrop-blur-sm transition-colors hover:border-gold"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Vault
      </Link>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 text-center">
        <p className="font-display text-[11px] uppercase tracking-[0.45em] text-bronze/80">
          The Hall of Keypers
        </p>
      </div>
    </main>
  );
}
