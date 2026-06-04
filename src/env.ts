import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Client-side variables. Must be prefixed with `NEXT_PUBLIC_`.
   *
   * `NEXT_PUBLIC_CONVEX_URL` is written by `npx convex dev`.
   */
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.url(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
  },

  /**
   * Next.js inlines `NEXT_PUBLIC_*` vars, so each must be destructured here
   * for them to be available on the client.
   */
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /** Treat empty strings as undefined rather than valid values. */
  emptyStringAsUndefined: true,
})
