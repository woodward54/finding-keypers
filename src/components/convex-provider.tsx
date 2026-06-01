"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { env } from "@/env";

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Wraps the app in a ConvexProvider when a deployment URL is configured.
 * When it isn't (e.g. local design preview before `npx convex dev`), we render
 * children directly so the homepage can still show its placeholder gallery.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [],
  );

  if (!client) return <>{children}</>;

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
