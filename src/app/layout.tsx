import type { Metadata } from "next";
import { Cinzel, Jost } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";

// Both are variable fonts, so we omit `weight` to load a single variable file
// per family (all weights available via the wght axis).
//
// `preload: false` because first-paint text is animated in (and the hero is
// currently hidden), so the browser flags eager preloads as "preloaded but not
// used within a few seconds". The fonts still load on demand via @font-face.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  preload: false,
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Finding Keypers",
  description:
    "A gilded gallery of keypers — upload your portrait and join the vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
