import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config. Local: `npm run build` once, then `npm run test` — Playwright
 * starts `next start` for you. CI: see .github/workflows/test.yml.
 *
 * Authenticated suites (tests/authed/**) only run when the E2E_* credential
 * env vars are set — see tests/README.md.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile viewport on Chromium (Pixel 5) — runs the smoke suite plus
    // anything named *.mobile.spec.ts. Real Safari/WebKit is a P1G cross-browser
    // task; this catches layout breaks early without a second browser download.
    { name: 'mobile', use: { ...devices['Pixel 5'] }, testMatch: /(smoke\.spec\.ts|\.mobile\.spec\.ts)$/ },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
