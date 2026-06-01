import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Client-side variables. Must be prefixed with `NEXT_PUBLIC_`.
   *
   * `NEXT_PUBLIC_CONVEX_URL` is written by `npx convex dev`. It's optional so
   * the app still boots in "preview mode" (placeholder gallery) before a
   * deployment is connected.
   */
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.url().optional(),
  },

  /**
   * Next.js inlines `NEXT_PUBLIC_*` vars, so each must be destructured here
   * for them to be available on the client.
   */
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },

  /** Treat empty strings as undefined rather than valid values. */
  emptyStringAsUndefined: true,
});
