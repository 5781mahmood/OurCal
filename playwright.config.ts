import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for OurCal.
 * webServer starts `npm run dev` before tests so you don't need a separate terminal.
 *
 * Two app servers:
 * - 5173: no Supabase keys, so every normal E2E test exercises local-first mode.
 * - 5174: only when SUPABASE_TEST_* vars are set, wired to a real test project
 *   for e2e/auth-live.spec.ts. Without those vars that spec reports "skipped".
 */
const liveUrl = process.env.SUPABASE_TEST_URL
const liveAnonKey = process.env.SUPABASE_TEST_ANON_KEY
const live = Boolean(liveUrl && liveAnonKey && process.env.SUPABASE_TEST_SERVICE_ROLE_KEY)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /auth-live\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'supabase-live',
      testMatch: /auth-live\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5174' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    },
    ...(live
      ? [
          {
            command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
            url: 'http://127.0.0.1:5174',
            reuseExistingServer: false,
            timeout: 120_000,
            env: { VITE_SUPABASE_URL: liveUrl!, VITE_SUPABASE_ANON_KEY: liveAnonKey! },
          },
        ]
      : []),
  ],
})
