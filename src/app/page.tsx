import { SiteHeader } from "@/components/site-header";
import { Gallery } from "@/components/gallery";
import { BoxMotif, KeyMotif, LockMotif } from "@/components/deco-art";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="relative flex-1">
        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-6 pt-12 text-center sm:pt-16">
          <div className="mb-5 flex items-center justify-center gap-6 text-bronze">
            <KeyMotif className="h-7 w-7 opacity-80" />
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-bronze sm:w-20" />
            <LockMotif className="h-9 w-9" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-bronze sm:w-20" />
            <BoxMotif className="h-7 w-7 opacity-80" />
          </div>

          <h1 className="animate-fade-up font-display text-4xl font-black uppercase leading-tight tracking-[0.12em] sm:text-6xl">
            <span className="text-gilded-shimmer">Finding Keypers</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl animate-fade-up text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every keyper holds a secret. Add your portrait to the gilded vault
            and take your place among the locked, the bronze, and the bold.
          </p>

          <div className="mx-auto mt-7 h-[3px] w-48 deco-rule sm:w-72" />
        </section>

        {/* Scrolling gilded gallery */}
        <section className="relative">
          <Gallery />
          {/* Vignette framing the marquee */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
        </section>
      </main>

      <footer className="border-t border-bronze/30 bg-black/40 py-5 text-center">
        <p className="font-display text-[11px] uppercase tracking-[0.35em] text-bronze">
          Finding Keypers · MCMXXV
        </p>
      </footer>
    </div>
  );
}
