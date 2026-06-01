import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeyMotif, LockMotif } from "@/components/deco-art";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-bronze/30 bg-black/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <LockMotif className="h-8 w-8 transition-transform duration-500 group-hover:rotate-6" />
          <div className="leading-none">
            <span className="block font-display text-lg font-bold uppercase tracking-[0.28em] text-gilded sm:text-xl">
              Finding Keypers
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.4em] text-bronze">
              The Gilded Vault
            </span>
          </div>
        </Link>

        <Button asChild size="lg" className="group">
          <Link href="/upload">
            <Plus className="size-5 transition-transform duration-300 group-hover:rotate-90" />
            <span className="hidden sm:inline">Add Your Portrait</span>
            <KeyMotif className="hidden h-5 w-5 sm:block" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
