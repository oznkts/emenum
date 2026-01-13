import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>
  }
}

globalThis.testUtils = {
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const startTime = Date.now()
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Condition not met within timeout')
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  },
}
