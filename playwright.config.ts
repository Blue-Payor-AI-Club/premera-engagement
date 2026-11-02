import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// Browser tests against a real local API on a throwaway database — never the shared server.
export const E2E_DIR = path.join(here, 'e2e', '.run')
export const API_PORT = 3999
export const WEB_PORT = 5199
export const API = `http://localhost:${API_PORT}/v1`

export default defineConfig({
  testDir: './e2e',
  // One worker: every spec shares the one API and database, and several reset it.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/.run/report' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: `node -r ts-node/register "${path.join(here, 'e2e', 'start-api.cjs')}"`,
      cwd: path.join(here, '..', 'premera-engagement-api'),
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        E2E_DIR,
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        ENABLE_DEV_LOGIN: 'true',
        JWT_SECRET: 'e2e-secret-not-for-production-0123456789',
        TS_NODE_TRANSPILE_ONLY: '1',
        // Every test signs in from one IP; the production default (30 per 15 min) would throttle the run.
        AUTH_IP_LIMIT: '100000',
        TRUSTED_LOGIN_EMAILS: 'e2e.trusted@ust.com',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_BASE_URL: API },
    },
  ],
})
