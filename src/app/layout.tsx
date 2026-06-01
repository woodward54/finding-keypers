import type { Metadata } from "next";
import { Cinzel, Jost } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
