import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // MUI's ESM build does directory imports Node can't resolve; inlining lets Vite handle
    // them. Needed by any test that renders a page importing @mui (e.g. ProgramLevel).
    server: { deps: { inline: [/@mui/] } },
    // AG Grid pages render slowly in jsdom when every test file runs in parallel.
    testTimeout: 15_000,
    restoreMocks: true,
    clearMocks: true,
  },
})
