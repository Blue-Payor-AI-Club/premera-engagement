import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Testing Library's auto-cleanup only self-registers when it detects Jest-style
// global test hooks. This project deliberately runs with `globals: false` (explicit
// imports from 'vitest' everywhere instead of ambient globals — see vite.config.ts),
// so cleanup must be wired up by hand here, once, for every test file.
afterEach(() => {
  cleanup()
})
