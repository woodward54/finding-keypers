import type { Metadata } from "next";
import { Cinzel, Jost } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";

// Both are variable fonts, so we omit `weight` to load a single variable file
// per family (all weights available via the wght axis). Passing a weight array
// would emit one static woff2 per weight, each preloaded — and the ones not used
// on first paint trigger "preloaded but not used" console warnings.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
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
