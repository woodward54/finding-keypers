"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { env } from "@/env";

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;

/** Wraps the app in a ConvexProvider. */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), []);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
