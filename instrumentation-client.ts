import posthog from 'posthog-js'

import { env } from './src/env'

posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? '', {
  api_host: '/ingest',
  ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  capture_exceptions: true,
  debug: process.env.NODE_ENV === 'development',
})
