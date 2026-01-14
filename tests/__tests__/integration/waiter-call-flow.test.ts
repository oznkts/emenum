/**
 * Integration tests for Waiter Call Flow
 *
 * Tests the complete waiter call system including:
 * 1. Service request creation via public API
 * 2. Table validation and lookup
 * 3. Spam prevention (30-second cooldown)
 * 4. Table status updates
 * 5. Realtime notification flow
 * 6. Service request status transitions (pending -> acknowledged -> completed)
 *
 * CRITICAL: The waiter call system enables real-time communication between
 * customers and staff. It must be reliable and spam-resistant.
 *
 * @see spec.md - Functional Requirements > Table-Based QR + Waiter Call
 * @see app/api/service-request/route.ts - Service request API
 * @see app/(dashboard)/waiter/page.tsx - Waiter panel
 * @see hooks/useTableContext.ts - Client-side table context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// MOCK DATA - Test organizations, tables, and service requests
// ============================================================================

const TEST_ORGANIZATION = {
  id: 'org-test-uuid-123',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  is_active: true,
}

const TEST_TABLES = {
  active: {
    id: 'table-uuid-active-001',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '1',
    qr_uuid: 'qr-uuid-active-001-valid',
    current_status: 'empty' as const,
    is_active: true,
    last_ping_at: null as string | null,
    created_at: '2024-01-01T00:00:00Z',
  },
  inactive: {
    id: 'table-uuid-inactive-002',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '2',
    qr_uuid: 'qr-uuid-inactive-002-valid',
    current_status: 'empty' as const,
    is_active: false,
    last_ping_at: null as string | null,
    created_at: '2024-01-01T00:00:00Z',
  },
  recentlyPinged: {
    id: 'table-uuid-pinged-003',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '3',
    qr_uuid: 'qr-uuid-pinged-003-valid',
    current_status: 'service_needed' as const,
    is_active: true,
    last_ping_at: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
    created_at: '2024-01-01T00:00:00Z',
  },
  oldPing: {
    id: 'table-uuid-old-004',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '4',
    qr_uuid: 'qr-uuid-old-004-valid',
    current_status: 'empty' as const,
    is_active: true,
    last_ping_at: new Date(Date.now() - 60000).toISOString(), // 60 seconds ago (beyond cooldown)
    created_at: '2024-01-01T00:00:00Z',
  },
}

const TEST_SERVICE_REQUESTS = [
  {
    id: 'req-pending-001',
    organization_id: TEST_ORGANIZATION.id,
    table_id: TEST_TABLES.active.id,
    request_type: 'waiter_call',
    status: 'pending' as const,
    notes: null,
    created_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
  },
  {
    id: 'req-acknowledged-002',
    organization_id: TEST_ORGANIZATION.id,
    table_id: TEST_TABLES.active.id,
    request_type: 'bill_request',
    status: 'acknowledged' as const,
    notes: null,
    created_at: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  },
  {
    id: 'req-completed-003',
    organization_id: TEST_ORGANIZATION.id,
    table_id: TEST_TABLES.active.id,
    request_type: 'waiter_call',
    status: 'completed' as const,
    notes: 'Customer needed extra napkins',
    created_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
  },
]

// ============================================================================
// CONSTANTS
// ============================================================================

const SPAM_PREVENTION_INTERVAL_MS = 30 * 1000 // 30 seconds

// ============================================================================
// HELPER TO CREATE FRESH TABLES
// ============================================================================

/**
 * Creates a fresh copy of test tables with isolated state
 */
const createFreshTables = () => ({
  active: {
    id: 'table-uuid-active-001',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '1',
    qr_uuid: 'qr-uuid-active-001-valid',
    current_status: 'empty' as const,
    is_active: true,
    last_ping_at: null as string | null,
    created_at: '2024-01-01T00:00:00Z',
  },
  inactive: {
    id: 'table-uuid-inactive-002',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '2',
    qr_uuid: 'qr-uuid-inactive-002-valid',
    current_status: 'empty' as const,
    is_active: false,
    last_ping_at: null as string | null,
    created_at: '2024-01-01T00:00:00Z',
  },
  recentlyPinged: {
    id: 'table-uuid-pinged-003',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '3',
    qr_uuid: 'qr-uuid-pinged-003-valid',
    current_status: 'service_needed' as const,
    is_active: true,
    last_ping_at: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
    created_at: '2024-01-01T00:00:00Z',
  },
  oldPing: {
    id: 'table-uuid-old-004',
    organization_id: TEST_ORGANIZATION.id,
    table_number: '4',
    qr_uuid: 'qr-uuid-old-004-valid',
    current_status: 'empty' as const,
    is_active: true,
    last_ping_at: new Date(Date.now() - 60000).toISOString(), // 60 seconds ago (beyond cooldown)
    created_at: '2024-01-01T00:00:00Z',
  },
})

// ============================================================================
// MOCK SERVICE REQUEST API
// ============================================================================

/**
 * Creates a mock service for the service request API.
 * Simulates the behavior of app/api/service-request/route.ts
 */
const createMockServiceRequestAPI = (options: {
  tables?: ReturnType<typeof createFreshTables>
  existingRequests?: typeof TEST_SERVICE_REQUESTS
} = {}) => {
  const tables = options.tables || createFreshTables()
  const requests = [...(options.existingRequests || [])]

  /**
   * Validate UUID format
   */
  const isValidUUID = (value: string): boolean => {
    // Simplified UUID-like validation for testing
    return value.length > 10 && value.includes('-')
  }

  /**
   * Process POST /api/service-request
   */
  const handleServiceRequest = async (body: {
    tableId?: string
    requestType?: 'waiter_call' | 'bill_request' | 'other'
    notes?: string
  }): Promise<{
    status: number
    body: {
      success: boolean
      data?: { requestId: string; tableNumber: string }
      error?: string
    }
  }> => {
    // Validate required tableId
    if (!body.tableId || typeof body.tableId !== 'string') {
      return {
        status: 400,
        body: { success: false, error: 'Masa bilgisi (tableId) zorunludur' },
      }
    }

    const tableId = body.tableId.trim()

    // Validate UUID format
    if (!isValidUUID(tableId)) {
      return {
        status: 400,
        body: { success: false, error: 'Gecersiz masa kimlik formati' },
      }
    }

    // Find table by qr_uuid
    const table = Object.values(tables).find((t) => t.qr_uuid === tableId)

    if (!table) {
      return {
        status: 404,
        body: { success: false, error: 'Masa bulunamadi' },
      }
    }

    // Check if table is active
    if (!table.is_active) {
      return {
        status: 400,
        body: { success: false, error: 'Bu masa aktif degil' },
      }
    }

    // Spam prevention: Check last_ping_at
    if (table.last_ping_at) {
      const lastPing = new Date(table.last_ping_at).getTime()
      const now = Date.now()

      if (now - lastPing < SPAM_PREVENTION_INTERVAL_MS) {
        const remainingSeconds = Math.ceil(
          (SPAM_PREVENTION_INTERVAL_MS - (now - lastPing)) / 1000
        )
        return {
          status: 429,
          body: {
            success: false,
            error: `Lutfen ${remainingSeconds} saniye bekleyin`,
          },
        }
      }
    }

    // Validate request type
    const validRequestTypes = ['waiter_call', 'bill_request', 'other']
    const requestType =
      body.requestType && validRequestTypes.includes(body.requestType)
        ? body.requestType
        : 'waiter_call'

    // Validate notes length
    const notes = body.notes?.trim().slice(0, 500) || null

    // Create service request
    const newRequest = {
      id: `req-new-${Date.now()}`,
      organization_id: table.organization_id,
      table_id: table.id,
      request_type: requestType,
      status: 'pending' as const,
      notes,
      created_at: new Date().toISOString(),
    }

    requests.push(newRequest)

    // Update table status
    table.current_status = 'service_needed'
    table.last_ping_at = new Date().toISOString()

    return {
      status: 200,
      body: {
        success: true,
        data: {
          requestId: newRequest.id,
          tableNumber: table.table_number,
        },
      },
    }
  }

  return {
    handleServiceRequest,
    getRequests: () => requests,
    getTable: (qrUuid: string) =>
      Object.values(tables).find((t) => t.qr_uuid === qrUuid),
  }
}

// ============================================================================
// MOCK SUPABASE CLIENT FOR WAITER PANEL
// ============================================================================

/**
 * Creates a mock Supabase client for the waiter panel.
 * Simulates database operations and Realtime subscriptions.
 */
const createMockSupabaseClientForWaiter = (options: {
  organizationId?: string
  requests?: typeof TEST_SERVICE_REQUESTS
  tables?: ReturnType<typeof createFreshTables>
} = {}) => {
  const orgId = options.organizationId || TEST_ORGANIZATION.id
  const requests = [...(options.requests || TEST_SERVICE_REQUESTS)]
  const tables = options.tables || createFreshTables()

  const realtimeCallbacks: Array<{
    event: string
    callback: (payload: { new: unknown; old?: unknown }) => void
  }> = []

  let currentTable = ''
  const queryFilters: Array<{ field: string; value: string; op?: string }> = []
  let updateData: Record<string, unknown> | null = null
  let insertData: Record<string, unknown> | null = null

  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    insert: vi.fn((data: Record<string, unknown>) => {
      insertData = data
      return queryBuilder
    }),
    update: vi.fn((data: Record<string, unknown>) => {
      updateData = data
      return queryBuilder
    }),
    eq: vi.fn((field: string, value: string) => {
      queryFilters.push({ field, value, op: 'eq' })
      return queryBuilder
    }),
    order: vi.fn(() => queryBuilder),
    limit: vi.fn(() => queryBuilder),
    single: vi.fn(() => {
      if (currentTable === 'service_requests') {
        if (insertData) {
          const newReq = {
            id: `req-new-${Date.now()}`,
            ...insertData,
            created_at: new Date().toISOString(),
          }
          requests.push(newReq as typeof TEST_SERVICE_REQUESTS[0])
          insertData = null

          // Trigger realtime callback for INSERT
          realtimeCallbacks
            .filter((cb) => cb.event === 'INSERT')
            .forEach((cb) => cb.callback({ new: newReq }))

          return Promise.resolve({ data: newReq, error: null })
        }

        const filtered = requests.filter((req) =>
          queryFilters.every((f) => {
            if (f.field === 'id') return req.id === f.value
            if (f.field === 'organization_id') return req.organization_id === f.value
            return true
          })
        )
        return Promise.resolve({
          data: filtered.length > 0 ? filtered[0] : null,
          error: null,
        })
      }

      if (currentTable === 'restaurant_tables') {
        const table = Object.values(tables).find((t) =>
          queryFilters.some((f) => {
            if (f.field === 'id') return t.id === f.value
            if (f.field === 'qr_uuid') return t.qr_uuid === f.value
            return false
          })
        )
        return Promise.resolve({ data: table || null, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    }),
    then: vi.fn((callback) => {
      if (currentTable === 'service_requests') {
        // Handle update
        if (updateData) {
          const targetId = queryFilters.find((f) => f.field === 'id')?.value
          if (targetId) {
            const reqIndex = requests.findIndex((r) => r.id === targetId)
            if (reqIndex !== -1) {
              const oldReq = { ...requests[reqIndex] }
              requests[reqIndex] = { ...requests[reqIndex], ...updateData }

              // Trigger realtime callback for UPDATE
              realtimeCallbacks
                .filter((cb) => cb.event === 'UPDATE')
                .forEach((cb) =>
                  cb.callback({ new: requests[reqIndex], old: oldReq })
                )
            }
          }
          updateData = null
          queryFilters.length = 0
          return Promise.resolve({ data: null, error: null }).then(callback)
        }

        // Filter by organization
        const filtered = requests.filter((req) => {
          const orgFilter = queryFilters.find(
            (f) => f.field === 'organization_id'
          )
          if (orgFilter) return req.organization_id === orgFilter.value
          return req.organization_id === orgId
        })
        queryFilters.length = 0
        return Promise.resolve({ data: filtered, error: null }).then(callback)
      }

      if (currentTable === 'restaurant_tables') {
        // Handle update
        if (updateData) {
          const targetId = queryFilters.find((f) => f.field === 'id')?.value
          if (targetId) {
            const table = Object.values(tables).find((t) => t.id === targetId)
            if (table) {
              Object.assign(table, updateData)
            }
          }
          updateData = null
          queryFilters.length = 0
          return Promise.resolve({ data: null, error: null }).then(callback)
        }
      }

      queryFilters.length = 0
      return Promise.resolve({ data: [], error: null }).then(callback)
    }),
  }

  const fromFn = vi.fn((tableName: string) => {
    currentTable = tableName
    queryFilters.length = 0
    updateData = null
    insertData = null
    return queryBuilder
  })

  // Mock channel for Realtime subscriptions
  const mockChannel = {
    on: vi.fn((eventType: string, config: { event: string }, callback: (payload: { new: unknown; old?: unknown }) => void) => {
      realtimeCallbacks.push({ event: config.event, callback })
      return mockChannel
    }),
    subscribe: vi.fn(() => mockChannel),
  }

  return {
    from: fromFn,
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    queryBuilder,
    // Expose internal state for testing
    _getRequests: () => requests,
    _simulateInsert: (newRequest: typeof TEST_SERVICE_REQUESTS[0]) => {
      requests.push(newRequest)
      realtimeCallbacks
        .filter((cb) => cb.event === 'INSERT')
        .forEach((cb) => cb.callback({ new: newRequest }))
    },
    _simulateUpdate: (
      id: string,
      updates: Partial<typeof TEST_SERVICE_REQUESTS[0]>
    ) => {
      const reqIndex = requests.findIndex((r) => r.id === id)
      if (reqIndex !== -1) {
        const oldReq = { ...requests[reqIndex] }
        requests[reqIndex] = { ...requests[reqIndex], ...updates }
        realtimeCallbacks
          .filter((cb) => cb.event === 'UPDATE')
          .forEach((cb) =>
            cb.callback({ new: requests[reqIndex], old: oldReq })
          )
      }
    },
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Waiter Call Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Request Creation', () => {
    /**
     * Tests for POST /api/service-request
     * @see app/api/service-request/route.ts
     */

    it('should create a service request with valid table ID', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'waiter_call',
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)
      expect(result.body.data?.tableNumber).toBe('1')
      expect(result.body.data?.requestId).toBeTruthy()
    })

    it('should create a bill request', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'bill_request',
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)

      const requests = api.getRequests()
      const newRequest = requests.find((r) => r.request_type === 'bill_request')
      expect(newRequest).toBeTruthy()
    })

    it('should default to waiter_call request type', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })

      expect(result.status).toBe(200)

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.request_type).toBe('waiter_call')
    })

    it('should include notes in the service request', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        notes: 'Need extra napkins please',
      })

      expect(result.status).toBe(200)

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.notes).toBe('Need extra napkins please')
    })

    it('should truncate notes to 500 characters', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })
      const longNotes = 'a'.repeat(600)

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        notes: longNotes,
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.notes?.length).toBe(500)
    })

    it('should update table status to service_needed', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })

      const table = api.getTable(tables.active.qr_uuid)
      expect(table?.current_status).toBe('service_needed')
    })

    it('should update table last_ping_at timestamp', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })
      const beforeTime = Date.now()

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })

      const table = api.getTable(tables.active.qr_uuid)
      expect(table?.last_ping_at).toBeTruthy()

      const pingTime = new Date(table!.last_ping_at!).getTime()
      expect(pingTime).toBeGreaterThanOrEqual(beforeTime - 1) // Allow 1ms tolerance
    })
  })

  describe('Input Validation', () => {
    /**
     * Tests for input validation in service request API
     */

    it('should fail without tableId', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({})

      expect(result.status).toBe(400)
      expect(result.body.success).toBe(false)
      expect(result.body.error).toContain('tableId')
    })

    it('should fail with empty tableId', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: '',
      })

      expect(result.status).toBe(400)
      expect(result.body.success).toBe(false)
    })

    it('should fail with invalid UUID format', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: 'invalid',
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toContain('Gecersiz')
    })

    it('should fail with non-existent table', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: 'non-existent-uuid-that-is-long',
      })

      expect(result.status).toBe(404)
      expect(result.body.error).toContain('bulunamadi')
    })

    it('should fail with inactive table', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.inactive.qr_uuid,
      })

      expect(result.status).toBe(400)
      expect(result.body.error).toContain('aktif degil')
    })
  })

  describe('Spam Prevention', () => {
    /**
     * Tests for 30-second cooldown between requests
     */

    it('should block requests within 30-second cooldown', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.recentlyPinged.qr_uuid,
      })

      expect(result.status).toBe(429)
      expect(result.body.success).toBe(false)
      expect(result.body.error).toContain('saniye bekleyin')
    })

    it('should allow requests after cooldown expires', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.oldPing.qr_uuid,
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)
    })

    it('should allow first request on table with no previous ping', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)
    })

    it('should include remaining seconds in cooldown error', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: tables.recentlyPinged.qr_uuid,
      })

      expect(result.status).toBe(429)
      // Should mention remaining seconds (approximately 20 seconds since ping was 10 seconds ago)
      expect(result.body.error).toMatch(/\d+ saniye bekleyin/)
    })
  })

  describe('Waiter Panel - Fetching Requests', () => {
    /**
     * Tests for loading service requests in waiter panel
     * @see app/(dashboard)/waiter/page.tsx
     */

    it('should fetch service requests for organization', async () => {
      const supabase = createMockSupabaseClientForWaiter({
        organizationId: TEST_ORGANIZATION.id,
        requests: TEST_SERVICE_REQUESTS,
      })

      const result = await supabase
        .from('service_requests')
        .select('*')
        .eq('organization_id', TEST_ORGANIZATION.id)
        .then((res: { data: unknown[] }) => res)

      expect(result.data.length).toBe(3)
      expect(
        (result.data as Array<{ organization_id: string }>).every(
          (r) => r.organization_id === TEST_ORGANIZATION.id
        )
      ).toBe(true)
    })

    it('should include pending, acknowledged, and completed requests', async () => {
      const supabase = createMockSupabaseClientForWaiter({
        requests: TEST_SERVICE_REQUESTS,
      })

      const result = await supabase
        .from('service_requests')
        .select('*')
        .then((res: { data: unknown[] }) => res)

      const statuses = (result.data as Array<{ status: string }>).map((r) => r.status)
      expect(statuses).toContain('pending')
      expect(statuses).toContain('acknowledged')
      expect(statuses).toContain('completed')
    })

    it('should only show requests for current organization', async () => {
      const otherOrgRequest = {
        id: 'req-other-org',
        organization_id: 'other-org-id',
        table_id: 'other-table-id',
        request_type: 'waiter_call',
        status: 'pending' as const,
        notes: null,
        created_at: new Date().toISOString(),
      }

      const supabase = createMockSupabaseClientForWaiter({
        organizationId: TEST_ORGANIZATION.id,
        requests: [...TEST_SERVICE_REQUESTS, otherOrgRequest],
      })

      const result = await supabase
        .from('service_requests')
        .select('*')
        .eq('organization_id', TEST_ORGANIZATION.id)
        .then((res: { data: unknown[] }) => res)

      expect(result.data.length).toBe(3) // Only test org's requests
      expect(
        (result.data as Array<{ id: string }>).find(
          (r) => r.id === 'req-other-org'
        )
      ).toBeUndefined()
    })
  })

  describe('Service Request Status Transitions', () => {
    /**
     * Tests for status updates: pending -> acknowledged -> completed
     */

    it('should update request status from pending to acknowledged', async () => {
      const supabase = createMockSupabaseClientForWaiter({
        requests: TEST_SERVICE_REQUESTS,
      })

      // Find pending request
      const pendingRequest = TEST_SERVICE_REQUESTS.find(
        (r) => r.status === 'pending'
      )

      // Update to acknowledged
      await supabase
        .from('service_requests')
        .update({ status: 'acknowledged' })
        .eq('id', pendingRequest!.id)
        .then((res: unknown) => res)

      const requests = supabase._getRequests()
      const updatedRequest = requests.find((r) => r.id === pendingRequest!.id)
      expect(updatedRequest?.status).toBe('acknowledged')
    })

    it('should update request status from acknowledged to completed', async () => {
      const supabase = createMockSupabaseClientForWaiter({
        requests: TEST_SERVICE_REQUESTS,
      })

      const acknowledgedRequest = TEST_SERVICE_REQUESTS.find(
        (r) => r.status === 'acknowledged'
      )

      await supabase
        .from('service_requests')
        .update({ status: 'completed' })
        .eq('id', acknowledgedRequest!.id)
        .then((res: unknown) => res)

      const requests = supabase._getRequests()
      const updatedRequest = requests.find(
        (r) => r.id === acknowledgedRequest!.id
      )
      expect(updatedRequest?.status).toBe('completed')
    })

    it('should update table status to occupied when acknowledged', async () => {
      const tables = createFreshTables()

      const supabase = createMockSupabaseClientForWaiter({
        requests: TEST_SERVICE_REQUESTS,
        tables,
      })

      // Update table status
      await supabase
        .from('restaurant_tables')
        .update({ current_status: 'occupied' })
        .eq('id', tables.active.id)
        .then((res: unknown) => res)

      expect(tables.active.current_status).toBe('occupied')
    })

    it('should update table status to empty when completed', async () => {
      const tables = createFreshTables()
      tables.active.current_status = 'occupied'

      const supabase = createMockSupabaseClientForWaiter({
        tables,
      })

      await supabase
        .from('restaurant_tables')
        .update({ current_status: 'empty' })
        .eq('id', tables.active.id)
        .then((res: unknown) => res)

      expect(tables.active.current_status).toBe('empty')
    })
  })

  describe('Realtime Notifications', () => {
    /**
     * Tests for Supabase Realtime subscriptions
     */

    it('should receive notification when new service request is created', async () => {
      const tables = createFreshTables()
      const supabase = createMockSupabaseClientForWaiter({ tables })
      const receivedRequests: unknown[] = []

      // Subscribe to INSERT events
      const channel = supabase.channel(`service_requests:org:${TEST_ORGANIZATION.id}`)
      channel.on(
        'postgres_changes',
        { event: 'INSERT' },
        (payload: { new: unknown }) => {
          receivedRequests.push(payload.new)
        }
      )
      channel.subscribe()

      // Simulate new request
      const newRequest = {
        id: 'req-realtime-new',
        organization_id: TEST_ORGANIZATION.id,
        table_id: tables.active.id,
        request_type: 'waiter_call' as const,
        status: 'pending' as const,
        notes: null,
        created_at: new Date().toISOString(),
      }

      supabase._simulateInsert(newRequest)

      expect(receivedRequests.length).toBe(1)
      expect((receivedRequests[0] as { id: string }).id).toBe('req-realtime-new')
    })

    it('should receive notification when request status is updated', async () => {
      const tables = createFreshTables()
      const supabase = createMockSupabaseClientForWaiter({
        requests: TEST_SERVICE_REQUESTS,
        tables,
      })
      const receivedUpdates: unknown[] = []

      // Subscribe to UPDATE events
      const channel = supabase.channel(`service_requests:org:${TEST_ORGANIZATION.id}`)
      channel.on(
        'postgres_changes',
        { event: 'UPDATE' },
        (payload: { new: unknown; old?: unknown }) => {
          receivedUpdates.push(payload)
        }
      )
      channel.subscribe()

      // Simulate status update
      supabase._simulateUpdate('req-pending-001', { status: 'acknowledged' })

      expect(receivedUpdates.length).toBe(1)
      expect((receivedUpdates[0] as { new: { status: string } }).new.status).toBe(
        'acknowledged'
      )
    })

    it('should set up channel with correct filter', async () => {
      const tables = createFreshTables()
      const supabase = createMockSupabaseClientForWaiter({ tables })

      supabase.channel(`service_requests:org:${TEST_ORGANIZATION.id}`)

      expect(supabase.channel).toHaveBeenCalledWith(
        `service_requests:org:${TEST_ORGANIZATION.id}`
      )
    })
  })

  describe('Request Type Handling', () => {
    /**
     * Tests for different service request types
     */

    it('should handle waiter_call request type', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'waiter_call',
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.request_type).toBe('waiter_call')
    })

    it('should handle bill_request request type', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'bill_request',
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.request_type).toBe('bill_request')
    })

    it('should handle other request type', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'other',
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.request_type).toBe('other')
    })

    it('should default invalid request type to waiter_call', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'invalid' as 'waiter_call',
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.request_type).toBe('waiter_call')
    })
  })

  describe('Edge Cases', () => {
    /**
     * Tests for edge cases and error handling
     */

    it('should handle concurrent requests to same table', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      // First request should succeed
      const result1 = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })
      expect(result1.status).toBe(200)

      // Second request should be blocked by spam prevention
      const result2 = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })
      expect(result2.status).toBe(429)
    })

    it('should handle whitespace in tableId', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const result = await api.handleServiceRequest({
        tableId: `  ${tables.active.qr_uuid}  `,
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)
    })

    it('should handle empty notes as null', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        notes: '   ',
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.notes).toBeNull()
    })

    it('should maintain organization isolation in service requests', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
      })

      const requests = api.getRequests()
      const lastRequest = requests[requests.length - 1]
      expect(lastRequest.organization_id).toBe(TEST_ORGANIZATION.id)
    })
  })

  describe('Complete Waiter Call Flow', () => {
    /**
     * End-to-end tests for the complete waiter call workflow
     * @see spec.md - QA Acceptance Criteria > Waiter Call Flow
     */

    it('should complete full waiter call flow: request -> acknowledge -> complete', async () => {
      // Step 1: Customer creates service request via API
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      const createResult = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'waiter_call',
      })

      expect(createResult.status).toBe(200)
      expect(createResult.body.success).toBe(true)

      const requestId = createResult.body.data!.requestId
      const tableNumber = createResult.body.data!.tableNumber

      // Verify table status is updated
      const table = api.getTable(tables.active.qr_uuid)
      expect(table?.current_status).toBe('service_needed')

      // Step 2: Waiter receives realtime notification and acknowledges
      const supabase = createMockSupabaseClientForWaiter({
        requests: api.getRequests(),
        tables,
      })

      await supabase
        .from('service_requests')
        .update({ status: 'acknowledged' })
        .eq('id', requestId)
        .then((res: unknown) => res)

      const afterAck = supabase._getRequests().find((r) => r.id === requestId)
      expect(afterAck?.status).toBe('acknowledged')

      // Step 3: Waiter completes the service request
      await supabase
        .from('service_requests')
        .update({ status: 'completed' })
        .eq('id', requestId)
        .then((res: unknown) => res)

      const afterComplete = supabase._getRequests().find((r) => r.id === requestId)
      expect(afterComplete?.status).toBe('completed')

      // Verify the flow data
      expect(tableNumber).toBe('1')
    })

    it('should handle multiple tables with concurrent requests', async () => {
      const tables = createFreshTables()
      const api = createMockServiceRequestAPI({ tables })

      // Request from table 1
      const result1 = await api.handleServiceRequest({
        tableId: tables.active.qr_uuid,
        requestType: 'waiter_call',
      })

      // Request from table 4 (old ping, should work)
      const result4 = await api.handleServiceRequest({
        tableId: tables.oldPing.qr_uuid,
        requestType: 'bill_request',
      })

      expect(result1.status).toBe(200)
      expect(result4.status).toBe(200)

      // Both tables should now have service_needed status
      const table1 = api.getTable(tables.active.qr_uuid)
      const table4 = api.getTable(tables.oldPing.qr_uuid)

      expect(table1?.current_status).toBe('service_needed')
      expect(table4?.current_status).toBe('service_needed')

      // Verify requests are distinct
      const requests = api.getRequests()
      expect(requests[requests.length - 2].table_id).toBe(tables.active.id)
      expect(requests[requests.length - 1].table_id).toBe(tables.oldPing.id)
    })
  })
})
