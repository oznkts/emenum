import { vi } from 'vitest'

/**
 * Mock Supabase client for testing
 * Provides mock implementations for common Supabase operations
 */

// Mock data store for tests
export const mockDataStore: Record<string, unknown[]> = {}

// Mock auth user
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

// Mock session
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
}

// Mock query builder
const createMockQueryBuilder = () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockImplementation((callback) =>
      Promise.resolve({ data: [], error: null }).then(callback)
    ),
  }
  return mockQueryBuilder
}

// Mock auth methods
export const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
  refreshSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
}

// Mock realtime channel
export const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
  unsubscribe: vi.fn().mockResolvedValue('ok'),
}

// Mock Supabase client
export const mockSupabaseClient = {
  auth: mockAuth,
  from: vi.fn().mockImplementation(() => createMockQueryBuilder()),
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn().mockResolvedValue('ok'),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test' } }),
    }),
  },
}

// Factory function to create a fresh mock client
export const createMockSupabaseClient = () => {
  return { ...mockSupabaseClient }
}

// Helper to reset all mocks
export const resetSupabaseMocks = () => {
  vi.clearAllMocks()
}

// Export default mock for easier imports
export default mockSupabaseClient
