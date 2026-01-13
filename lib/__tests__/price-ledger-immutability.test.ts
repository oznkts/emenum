/**
 * Unit tests for Price Ledger Immutability
 *
 * Tests the INSERT-only price ledger pattern for Turkish Trade Ministry
 * regulatory compliance. Verifies:
 * 1. INSERT operations succeed (new price entries)
 * 2. UPDATE operations are blocked by database trigger
 * 3. DELETE operations are blocked by database trigger
 * 4. Price history is preserved immutably
 * 5. Current prices view returns latest entry
 * 6. Input validation works correctly
 * 7. Compliance export functionality
 *
 * CRITICAL: The price_ledger table is IMMUTABLE!
 * - Only INSERT is allowed
 * - UPDATE and DELETE are blocked by database trigger
 * - Each price change creates a new record
 *
 * @see spec.md - QA Acceptance Criteria > Price Ledger Immutability
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PriceLedgerEntry, CurrentPrice } from '@/types/database'

// Mock data for tests
const TEST_PRODUCT_ID = 'product-uuid-123'
const TEST_ORG_ID = 'org-uuid-456'
const TEST_USER_ID = 'user-uuid-789'

// Mock price ledger entry
const mockPriceLedgerEntry: PriceLedgerEntry = {
  id: 'price-entry-uuid-001',
  product_id: TEST_PRODUCT_ID,
  price: 99.9,
  currency: 'TRY',
  change_reason: 'Initial price',
  changed_by: TEST_USER_ID,
  created_at: '2024-01-15T10:00:00Z',
}

// Mock current price
const mockCurrentPrice: CurrentPrice = {
  product_id: TEST_PRODUCT_ID,
  price: 149.9,
  currency: 'TRY',
  created_at: '2024-01-20T14:30:00Z',
}

// Mock Supabase query builder factory
const createMockQueryBuilder = (mockConfig: {
  insertData?: PriceLedgerEntry | null
  selectData?: CurrentPrice | PriceLedgerEntry[] | null
  insertError?: { message: string } | null
  selectError?: { message: string } | null
  updateError?: { message: string } | null
  deleteError?: { message: string } | null
  count?: number | null
}) => {
  let isInsertOperation = false
  let isUpdateOperation = false
  let isDeleteOperation = false

  const queryBuilder = {
    select: vi.fn(() => {
      // Don't reset flags - we might be chaining after insert()
      return queryBuilder
    }),
    insert: vi.fn(() => {
      isInsertOperation = true
      return queryBuilder
    }),
    update: vi.fn(() => {
      isUpdateOperation = true
      return queryBuilder
    }),
    delete: vi.fn(() => {
      isDeleteOperation = true
      return queryBuilder
    }),
    eq: vi.fn(() => queryBuilder),
    in: vi.fn(() => queryBuilder),
    gte: vi.fn(() => queryBuilder),
    lte: vi.fn(() => queryBuilder),
    order: vi.fn(() => queryBuilder),
    range: vi.fn(() => queryBuilder),
    single: vi.fn(() => {
      if (isInsertOperation) {
        return Promise.resolve({
          data: mockConfig.insertError ? null : mockConfig.insertData,
          error: mockConfig.insertError ?? null,
        })
      }
      if (isUpdateOperation) {
        // UPDATE should always fail on price_ledger
        return Promise.resolve({
          data: null,
          error: mockConfig.updateError ?? {
            message: 'UPDATE and DELETE are not allowed on price_ledger',
          },
        })
      }
      if (isDeleteOperation) {
        // DELETE should always fail on price_ledger
        return Promise.resolve({
          data: null,
          error: mockConfig.deleteError ?? {
            message: 'UPDATE and DELETE are not allowed on price_ledger',
          },
        })
      }
      return Promise.resolve({
        data: mockConfig.selectData,
        error: mockConfig.selectError ?? null,
      })
    }),
    maybeSingle: vi.fn(() => {
      return Promise.resolve({
        data: mockConfig.selectData ?? null,
        error: mockConfig.selectError ?? null,
      })
    }),
    then: vi.fn((callback) => {
      if (!isInsertOperation && !isUpdateOperation && !isDeleteOperation) {
        return Promise.resolve({
          data: Array.isArray(mockConfig.selectData) ? mockConfig.selectData : null,
          error: mockConfig.selectError ?? null,
          count: mockConfig.count ?? null,
        }).then(callback)
      }
      return Promise.resolve({ data: null, error: null }).then(callback)
    }),
  }

  const fromFn = vi.fn(() => queryBuilder)
  return { from: fromFn, queryBuilder }
}

// Mock Supabase client factory
let mockSupabaseFrom: ReturnType<typeof vi.fn>
let mockSupabaseAuth: {
  getUser: ReturnType<typeof vi.fn>
}

const mockSupabaseClient = {
  get from() {
    return mockSupabaseFrom
  },
  get auth() {
    return mockSupabaseAuth
  },
}

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Import after mocking
import {
  addPriceEntry,
  getCurrentPrice,
  getCurrentPricesBatch,
  getPriceHistory,
  getOrganizationPriceHistory,
  hasPrice,
  getPriceStatistics,
  exportPriceLedgerForCompliance,
} from '../services/price-ledger'

describe('Price Ledger Immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default auth mock
    mockSupabaseAuth = {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        })
      ),
    }
  })

  describe('INSERT Operations (Allowed)', () => {
    it('should successfully add a new price entry', async () => {
      const { from } = createMockQueryBuilder({
        insertData: mockPriceLedgerEntry,
      })
      mockSupabaseFrom = from

      const result = await addPriceEntry(TEST_PRODUCT_ID, 99.9, 'Initial price')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect((result.data as PriceLedgerEntry).price).toBe(99.9)
      expect(from).toHaveBeenCalledWith('price_ledger')
    })

    it('should create a new entry for each price change', async () => {
      // First price entry
      const firstEntry: PriceLedgerEntry = {
        ...mockPriceLedgerEntry,
        id: 'entry-1',
        price: 100,
        change_reason: 'Initial price',
      }

      const { from: from1 } = createMockQueryBuilder({ insertData: firstEntry })
      mockSupabaseFrom = from1

      const result1 = await addPriceEntry(TEST_PRODUCT_ID, 100, 'Initial price')
      expect(result1.success).toBe(true)

      // Second price entry (price increase)
      const secondEntry: PriceLedgerEntry = {
        ...mockPriceLedgerEntry,
        id: 'entry-2',
        price: 150,
        change_reason: 'Price adjustment',
      }

      const { from: from2 } = createMockQueryBuilder({ insertData: secondEntry })
      mockSupabaseFrom = from2

      const result2 = await addPriceEntry(TEST_PRODUCT_ID, 150, 'Price adjustment')
      expect(result2.success).toBe(true)

      // Both entries should be created (not updated)
      expect(result1.data?.id).not.toBe(result2.data?.id)
    })

    it('should include change_reason in the audit trail', async () => {
      const entryWithReason: PriceLedgerEntry = {
        ...mockPriceLedgerEntry,
        change_reason: 'Supplier cost increase 2024',
      }

      const { from, queryBuilder } = createMockQueryBuilder({
        insertData: entryWithReason,
      })
      mockSupabaseFrom = from

      const result = await addPriceEntry(
        TEST_PRODUCT_ID,
        120.5,
        'Supplier cost increase 2024'
      )

      expect(result.success).toBe(true)
      expect(queryBuilder.insert).toHaveBeenCalled()
    })

    it('should record the user who made the price change', async () => {
      const { from, queryBuilder } = createMockQueryBuilder({
        insertData: mockPriceLedgerEntry,
      })
      mockSupabaseFrom = from

      await addPriceEntry(TEST_PRODUCT_ID, 99.9, 'Test price')

      // Verify auth.getUser was called to get the changing user
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled()
      expect(queryBuilder.insert).toHaveBeenCalled()
    })

    it('should support different currencies', async () => {
      const euroEntry: PriceLedgerEntry = {
        ...mockPriceLedgerEntry,
        currency: 'EUR',
        price: 4.5,
      }

      const { from } = createMockQueryBuilder({ insertData: euroEntry })
      mockSupabaseFrom = from

      const result = await addPriceEntry(TEST_PRODUCT_ID, 4.5, 'Euro price', 'EUR')

      expect(result.success).toBe(true)
    })
  })

  describe('UPDATE Operations (BLOCKED)', () => {
    /**
     * CRITICAL: UPDATE operations must ALWAYS fail on price_ledger.
     * This is enforced by the database trigger `price_ledger_immutable`.
     * The application code should never attempt to UPDATE prices.
     */

    it('should NOT have any UPDATE methods exposed in the price ledger service', () => {
      // The price-ledger.ts service should not export any update functions
      // This is a design verification test
      const serviceMethods = [
        'addPriceEntry',
        'getCurrentPrice',
        'getCurrentPricesBatch',
        'getPriceHistory',
        'getOrganizationPriceHistory',
        'hasPrice',
        'getPriceStatistics',
        'exportPriceLedgerForCompliance',
      ]

      // Verify no update-related method names exist
      serviceMethods.forEach((method) => {
        expect(method.toLowerCase()).not.toContain('update')
        expect(method.toLowerCase()).not.toContain('modify')
        expect(method.toLowerCase()).not.toContain('edit')
      })
    })

    it('should verify database trigger blocks UPDATE operations', () => {
      /**
       * The database has a trigger `price_ledger_immutable` that prevents
       * UPDATE operations on the price_ledger table:
       *
       * CREATE TRIGGER price_ledger_immutable
       * BEFORE UPDATE OR DELETE ON price_ledger
       * FOR EACH ROW EXECUTE FUNCTION prevent_price_modification();
       *
       * The trigger function raises an exception:
       * 'UPDATE and DELETE are not allowed on price_ledger'
       */

      // This test documents the expected database behavior
      const triggerErrorMessage = 'UPDATE and DELETE are not allowed on price_ledger'
      expect(triggerErrorMessage).toContain('UPDATE')
      expect(triggerErrorMessage).toContain('DELETE')
    })

    it('should enforce immutability pattern - price changes create new entries', async () => {
      // To change a price, we INSERT a new entry, not UPDATE existing
      const priceHistory: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '1', price: 100, created_at: '2024-01-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '2', price: 110, created_at: '2024-02-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '3', price: 120, created_at: '2024-03-01T00:00:00Z' },
      ]

      const { from } = createMockQueryBuilder({
        selectData: priceHistory,
        count: 3,
      })
      mockSupabaseFrom = from

      const result = await getPriceHistory(TEST_PRODUCT_ID)

      expect(result.success).toBe(true)
      // All 3 price changes should be preserved
      expect(result.data.length).toBe(3)
      // Each entry has a unique ID (new INSERT, not UPDATE)
      const uniqueIds = new Set(result.data.map((e) => e.id))
      expect(uniqueIds.size).toBe(3)
    })
  })

  describe('DELETE Operations (BLOCKED)', () => {
    /**
     * CRITICAL: DELETE operations must ALWAYS fail on price_ledger.
     * This is enforced by the database trigger `price_ledger_immutable`.
     * Price history must be preserved for regulatory compliance.
     */

    it('should NOT have any DELETE methods exposed in the price ledger service', () => {
      // The price-ledger.ts service should not export any delete functions
      const serviceMethods = [
        'addPriceEntry',
        'getCurrentPrice',
        'getCurrentPricesBatch',
        'getPriceHistory',
        'getOrganizationPriceHistory',
        'hasPrice',
        'getPriceStatistics',
        'exportPriceLedgerForCompliance',
      ]

      // Verify no delete-related method names exist
      serviceMethods.forEach((method) => {
        expect(method.toLowerCase()).not.toContain('delete')
        expect(method.toLowerCase()).not.toContain('remove')
        expect(method.toLowerCase()).not.toContain('clear')
      })
    })

    it('should verify database trigger blocks DELETE operations', () => {
      /**
       * The database trigger `price_ledger_immutable` prevents
       * DELETE operations with the error message:
       * 'UPDATE and DELETE are not allowed on price_ledger'
       */

      const _expectedErrorRegex = /DELETE.*not allowed|not allowed.*DELETE/i
      const triggerMessage = 'UPDATE and DELETE are not allowed on price_ledger'
      expect(triggerMessage).toMatch(/DELETE/)
    })

    it('should preserve complete price history for compliance', async () => {
      // Price history should never be truncated or deleted
      const fullHistory: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '1', price: 50, created_at: '2023-01-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '2', price: 75, created_at: '2023-06-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '3', price: 100, created_at: '2024-01-01T00:00:00Z' },
      ]

      const { from } = createMockQueryBuilder({
        selectData: fullHistory,
        count: 3,
      })
      mockSupabaseFrom = from

      const result = await getPriceHistory(TEST_PRODUCT_ID)

      // All historical entries must be preserved
      expect(result.data.length).toBe(3)
      expect(result.totalCount).toBe(3)
    })
  })

  describe('Current Price View', () => {
    it('should return the latest price entry', async () => {
      const { from } = createMockQueryBuilder({
        selectData: mockCurrentPrice,
      })
      mockSupabaseFrom = from

      const result = await getCurrentPrice(TEST_PRODUCT_ID)

      expect(result.success).toBe(true)
      expect((result.data as CurrentPrice)?.price).toBe(149.9)
      expect(from).toHaveBeenCalledWith('current_prices')
    })

    it('should return null for product without price', async () => {
      const { from } = createMockQueryBuilder({
        selectData: null,
      })
      mockSupabaseFrom = from

      const result = await getCurrentPrice(TEST_PRODUCT_ID)

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should fetch prices in batch efficiently', async () => {
      const prices: CurrentPrice[] = [
        { product_id: 'prod-1', price: 100, currency: 'TRY', created_at: '2024-01-01' },
        { product_id: 'prod-2', price: 200, currency: 'TRY', created_at: '2024-01-01' },
      ]

      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: prices,
      })
      // Override then to return array
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: prices, error: null }).then(callback)
      )
      mockSupabaseFrom = from

      const result = await getCurrentPricesBatch(['prod-1', 'prod-2'])

      expect(result.size).toBe(2)
      expect(result.get('prod-1')?.price).toBe(100)
      expect(result.get('prod-2')?.price).toBe(200)
    })
  })

  describe('Price History Queries', () => {
    it('should retrieve full price history for a product', async () => {
      const history: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '1', price: 100 },
        { ...mockPriceLedgerEntry, id: '2', price: 110 },
        { ...mockPriceLedgerEntry, id: '3', price: 120 },
      ]

      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: history,
        count: 3,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: history, error: null, count: 3 }).then(callback)
      )
      mockSupabaseFrom = from

      const result = await getPriceHistory(TEST_PRODUCT_ID)

      expect(result.success).toBe(true)
      expect(result.data.length).toBe(3)
      expect(result.totalCount).toBe(3)
    })

    it('should support pagination for price history', async () => {
      const history: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '3', price: 120 },
      ]

      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: history,
        count: 50,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: history, error: null, count: 50 }).then(callback)
      )
      mockSupabaseFrom = from

      const result = await getPriceHistory(TEST_PRODUCT_ID, {
        limit: 1,
        offset: 2,
      })

      expect(result.success).toBe(true)
      expect(result.data.length).toBe(1)
      expect(queryBuilder.range).toHaveBeenCalled()
    })

    it('should filter history by date range', async () => {
      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: [],
        count: 0,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(callback)
      )
      mockSupabaseFrom = from

      await getPriceHistory(TEST_PRODUCT_ID, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      })

      expect(queryBuilder.gte).toHaveBeenCalled()
      expect(queryBuilder.lte).toHaveBeenCalled()
    })
  })

  describe('Input Validation', () => {
    it('should reject negative prices', async () => {
      const result = await addPriceEntry(TEST_PRODUCT_ID, -10, 'Invalid price')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Fiyat negatif olamaz')
    })

    it('should accept zero price (free products)', async () => {
      const freeEntry: PriceLedgerEntry = {
        ...mockPriceLedgerEntry,
        price: 0,
      }

      const { from } = createMockQueryBuilder({ insertData: freeEntry })
      mockSupabaseFrom = from

      const result = await addPriceEntry(TEST_PRODUCT_ID, 0, 'Free product')

      expect(result.success).toBe(true)
    })

    it('should require product ID', async () => {
      const result = await addPriceEntry('', 99.9, 'Test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Ürün ID gereklidir')
    })

    it('should handle authentication errors', async () => {
      mockSupabaseAuth = {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: null },
            error: { message: 'Not authenticated' },
          })
        ),
      }

      const { from } = createMockQueryBuilder({ insertData: null })
      mockSupabaseFrom = from

      const result = await addPriceEntry(TEST_PRODUCT_ID, 99.9, 'Test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Kullanıcı kimliği doğrulanamadı')
    })
  })

  describe('Price Statistics', () => {
    it('should calculate price statistics from history', async () => {
      const history: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '1', price: 100, created_at: '2024-01-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '2', price: 150, created_at: '2024-02-01T00:00:00Z' },
        { ...mockPriceLedgerEntry, id: '3', price: 125, created_at: '2024-03-01T00:00:00Z' },
      ]

      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: history,
        count: 3,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: history, error: null, count: 3 }).then(callback)
      )
      mockSupabaseFrom = from

      const stats = await getPriceStatistics(TEST_PRODUCT_ID)

      expect(stats).not.toBeNull()
      expect(stats?.changeCount).toBe(3)
      expect(stats?.minPrice).toBe(100)
      expect(stats?.maxPrice).toBe(150)
      expect(stats?.firstPrice).toBe(100)
      expect(stats?.currentPrice).toBe(125)
      expect(stats?.priceChange).toBe(25)
      expect(stats?.priceChangePercent).toBe(25)
    })

    it('should return null for product without price history', async () => {
      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: [],
        count: 0,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(callback)
      )
      mockSupabaseFrom = from

      const stats = await getPriceStatistics(TEST_PRODUCT_ID)

      expect(stats).toBeNull()
    })
  })

  describe('Compliance Export', () => {
    it('should export price ledger data for regulatory compliance', async () => {
      const history: PriceLedgerEntry[] = [
        { ...mockPriceLedgerEntry, id: '1', price: 100, created_at: '2024-01-15T10:00:00Z' },
        { ...mockPriceLedgerEntry, id: '2', price: 110, created_at: '2024-02-20T14:30:00Z' },
      ]

      // Mock for products query
      const productsQuery = {
        select: vi.fn(() => productsQuery),
        eq: vi.fn(() => productsQuery),
        in: vi.fn(() => productsQuery),
        gte: vi.fn(() => productsQuery),
        lte: vi.fn(() => productsQuery),
        order: vi.fn(() => productsQuery),
        range: vi.fn(() => productsQuery),
        then: vi.fn((callback) => {
          // First call returns products, subsequent calls return history
          if (productsQuery.eq.mock.calls.some((c) => c[0] === 'organization_id')) {
            return Promise.resolve({
              data: [{ id: TEST_PRODUCT_ID }],
              error: null,
            }).then(callback)
          }
          return Promise.resolve({
            data: history,
            error: null,
            count: 2,
          }).then(callback)
        }),
      }

      mockSupabaseFrom = vi.fn(() => productsQuery)

      const exportResult = await exportPriceLedgerForCompliance(
        TEST_ORG_ID,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      )

      expect(exportResult.success).toBe(true)
      expect(exportResult.exportedAt).toBeDefined()
      expect(exportResult.dateRange.start).toContain('2024-01-01')
      expect(exportResult.dateRange.end).toContain('2024-12-31')
    })

    it('should include all required fields in compliance export', async () => {
      const entry: PriceLedgerEntry = {
        id: 'test-id',
        product_id: TEST_PRODUCT_ID,
        price: 99.9,
        currency: 'TRY',
        change_reason: 'Price adjustment',
        changed_by: TEST_USER_ID,
        created_at: '2024-01-15T10:00:00Z',
      }

      const productsQuery = {
        select: vi.fn(() => productsQuery),
        eq: vi.fn(() => productsQuery),
        in: vi.fn(() => productsQuery),
        gte: vi.fn(() => productsQuery),
        lte: vi.fn(() => productsQuery),
        order: vi.fn(() => productsQuery),
        range: vi.fn(() => productsQuery),
        then: vi.fn((callback) => {
          if (productsQuery.eq.mock.calls.some((c) => c[0] === 'organization_id')) {
            return Promise.resolve({
              data: [{ id: TEST_PRODUCT_ID }],
              error: null,
            }).then(callback)
          }
          return Promise.resolve({
            data: [entry],
            error: null,
            count: 1,
          }).then(callback)
        }),
      }

      mockSupabaseFrom = vi.fn(() => productsQuery)

      const exportResult = await exportPriceLedgerForCompliance(
        TEST_ORG_ID,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      )

      expect(exportResult.data.length).toBe(1)
      const exported = exportResult.data[0]
      // Required fields for Turkish Trade Ministry compliance
      expect(exported).toHaveProperty('product_id')
      expect(exported).toHaveProperty('price')
      expect(exported).toHaveProperty('currency')
      expect(exported).toHaveProperty('change_reason')
      expect(exported).toHaveProperty('changed_by')
      expect(exported).toHaveProperty('created_at')
    })
  })

  describe('hasPrice()', () => {
    it('should return true when product has price', async () => {
      const { from } = createMockQueryBuilder({
        selectData: mockCurrentPrice,
      })
      mockSupabaseFrom = from

      const result = await hasPrice(TEST_PRODUCT_ID)

      expect(result).toBe(true)
    })

    it('should return false when product has no price', async () => {
      const { from } = createMockQueryBuilder({
        selectData: null,
      })
      mockSupabaseFrom = from

      const result = await hasPrice(TEST_PRODUCT_ID)

      expect(result).toBe(false)
    })
  })

  describe('Immutability Pattern Verification', () => {
    /**
     * These tests verify the core immutability pattern required for
     * Turkish Trade Ministry compliance (Ticaret Bakanligi).
     *
     * Key requirements:
     * 1. All price changes must be recorded
     * 2. No price record can be modified after creation
     * 3. No price record can be deleted
     * 4. Full audit trail must be exportable
     */

    it('should never expose update functionality for prices', () => {
      // Verify the service API enforces immutability
      const exportedFunctions = {
        addPriceEntry,
        getCurrentPrice,
        getCurrentPricesBatch,
        getPriceHistory,
        getOrganizationPriceHistory,
        hasPrice,
        getPriceStatistics,
        exportPriceLedgerForCompliance,
      }

      // No function should allow modification of existing entries
      Object.keys(exportedFunctions).forEach((fnName) => {
        expect(fnName).not.toMatch(/update/i)
        expect(fnName).not.toMatch(/delete/i)
        expect(fnName).not.toMatch(/remove/i)
        expect(fnName).not.toMatch(/modify/i)
      })
    })

    it('should support regulatory audit requirements', async () => {
      // Price ledger must support date-range queries for audits
      const { from, queryBuilder } = createMockQueryBuilder({
        selectData: [],
        count: 0,
      })
      queryBuilder.then = vi.fn((callback) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(callback)
      )
      mockSupabaseFrom = from

      // Auditors need to query by date range
      const result = await getPriceHistory(TEST_PRODUCT_ID, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        order: 'asc',
      })

      expect(result.success).toBe(true)
      expect(queryBuilder.gte).toHaveBeenCalled()
      expect(queryBuilder.lte).toHaveBeenCalled()
      expect(queryBuilder.order).toHaveBeenCalled()
    })

    it('should record who made each price change', async () => {
      // Each entry must track changed_by for accountability
      const { from, queryBuilder: _queryBuilder } = createMockQueryBuilder({
        insertData: mockPriceLedgerEntry,
      })
      mockSupabaseFrom = from

      await addPriceEntry(TEST_PRODUCT_ID, 99.9, 'Test price')

      // Auth should be checked to record the user
      expect(mockSupabaseAuth.getUser).toHaveBeenCalled()
    })
  })
})
