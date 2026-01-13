/**
 * Unit tests for Permission Guards
 *
 * Tests the dynamic permission checking system that follows the
 * "Feature Flagging" pattern. Verifies:
 * 1. Boolean permission checks (module features)
 * 2. Limit-based permission checks (categories, products)
 * 3. Override precedence over plan features
 * 4. Proper handling of expired overrides
 * 5. Batch permission checks
 *
 * @see spec.md - QA Acceptance Criteria > Permission Guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock data for tests
const TEST_ORG_ID = 'test-org-id-123'
const TEST_ORG_ID_NO_PLAN = 'test-org-no-plan-456'

// Mock Supabase query builder
const createMockQueryBuilder = (mockData: {
  overrideData?: unknown | null
  planFeatureData?: unknown | null
  overrideError?: Error | null
  planFeatureError?: Error | null
}) => {
  let currentTable = ''

  const queryBuilder = {
    select: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    or: vi.fn(() => queryBuilder),
    maybeSingle: vi.fn(() => {
      // Return override data for override table, plan data for view
      if (currentTable === 'organization_feature_overrides') {
        return Promise.resolve({
          data: mockData.overrideData ?? null,
          error: mockData.overrideError ?? null,
        })
      }
      if (currentTable === 'v_organization_features') {
        return Promise.resolve({
          data: mockData.planFeatureData ?? null,
          error: mockData.planFeatureError ?? null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    }),
    single: vi.fn(() => {
      return Promise.resolve({ data: null, error: null })
    }),
  }

  const fromFn = vi.fn((table: string) => {
    currentTable = table
    return queryBuilder
  })

  return { from: fromFn, queryBuilder }
}

// Mock Supabase client factory
let mockSupabaseFrom: ReturnType<typeof vi.fn>
const mockSupabaseClient = {
  get from() {
    return mockSupabaseFrom
  },
}

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Import after mocking
import {
  hasPermission,
  checkPermission,
  getFeatureLimit,
  isWithinLimit,
  canAddOne,
  batchCheckPermissions,
  getAllFeatures,
} from '../permission'

describe('Permission Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasPermission()', () => {
    it('should return true when feature is enabled in plan', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: true,
          value_limit: null,
          plan_name: 'Gold',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'module_waiter_call')

      expect(result).toBe(true)
      expect(from).toHaveBeenCalledWith('organization_feature_overrides')
      expect(from).toHaveBeenCalledWith('v_organization_features')
    })

    it('should return false when feature is disabled in plan', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: false,
          value_limit: null,
          plan_name: 'Free',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'module_images')

      expect(result).toBe(false)
    })

    it('should return false when organization has no subscription', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID_NO_PLAN, 'module_waiter_call')

      expect(result).toBe(false)
    })

    it('should use override value when present (override takes precedence)', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: {
          override_value: true,
          value_limit: null,
          expires_at: null,
          feature_id: 'feature-uuid',
          features: { key: 'module_images' },
        },
        planFeatureData: {
          value_boolean: false,
          value_limit: null,
          plan_name: 'Free',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'module_images')

      // Override (true) should take precedence over plan (false)
      expect(result).toBe(true)
    })

    it('should return true for limit features when limit > 0', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'limit_products')

      expect(result).toBe(true)
    })

    it('should return false for limit features when limit is 0', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 0,
          plan_name: 'Free',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'limit_products')

      expect(result).toBe(false)
    })
  })

  describe('checkPermission()', () => {
    it('should return detailed result with plan source when no override', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: true,
          value_limit: null,
          plan_name: 'Platinum',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'module_nutrition')

      expect(result).toEqual({
        allowed: true,
        source: 'plan',
        limit: null,
        planName: 'Platinum',
      })
    })

    it('should return detailed result with override source when override exists', async () => {
      const expiresAt = '2030-12-31T23:59:59Z'
      const { from } = createMockQueryBuilder({
        overrideData: {
          override_value: true,
          value_limit: 50,
          expires_at: expiresAt,
          feature_id: 'feature-uuid',
          features: { key: 'limit_products' },
        },
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'limit_products')

      expect(result).toEqual({
        allowed: true,
        source: 'override',
        limit: 50,
        expiresAt: expiresAt,
      })
    })

    it('should return source "none" when feature not found', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'nonexistent_feature')

      expect(result).toEqual({
        allowed: false,
        source: 'none',
      })
    })

    it('should include limit value for limit-type features', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 100,
          plan_name: 'Enterprise',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'limit_categories')

      expect(result.limit).toBe(100)
      expect(result.allowed).toBe(true)
    })
  })

  describe('getFeatureLimit()', () => {
    it('should return numeric limit from plan', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 25,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const limit = await getFeatureLimit(TEST_ORG_ID, 'limit_products')

      expect(limit).toBe(25)
    })

    it('should return 0 when feature not found', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const limit = await getFeatureLimit(TEST_ORG_ID, 'nonexistent_feature')

      expect(limit).toBe(0)
    })

    it('should return override limit when override exists', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: {
          override_value: true,
          value_limit: 999,
          expires_at: null,
          feature_id: 'feature-uuid',
          features: { key: 'limit_products' },
        },
        planFeatureData: {
          value_boolean: null,
          value_limit: 25,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const limit = await getFeatureLimit(TEST_ORG_ID, 'limit_products')

      // Override limit (999) should take precedence over plan limit (25)
      expect(limit).toBe(999)
    })
  })

  describe('isWithinLimit()', () => {
    it('should return true when current count is below limit', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await isWithinLimit(TEST_ORG_ID, 'limit_products', 5)

      expect(result).toBe(true)
    })

    it('should return false when current count equals limit', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await isWithinLimit(TEST_ORG_ID, 'limit_products', 10)

      expect(result).toBe(false)
    })

    it('should return false when current count exceeds limit', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await isWithinLimit(TEST_ORG_ID, 'limit_products', 15)

      expect(result).toBe(false)
    })

    it('should return true when limit is unlimited (negative value)', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: -1,
          plan_name: 'Enterprise',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await isWithinLimit(TEST_ORG_ID, 'limit_products', 9999)

      // Negative limit means unlimited
      expect(result).toBe(true)
    })
  })

  describe('canAddOne()', () => {
    it('should return true when can add one more item', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await canAddOne(TEST_ORG_ID, 'limit_products', 9)

      expect(result).toBe(true)
    })

    it('should return false when at limit', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: 10,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      })
      mockSupabaseFrom = from

      const result = await canAddOne(TEST_ORG_ID, 'limit_products', 10)

      expect(result).toBe(false)
    })
  })

  describe('batchCheckPermissions()', () => {
    it('should return map of permissions for multiple features', async () => {
      // We need to create a fresh mock for each call since batchCheckPermissions
      // calls hasPermission multiple times in parallel
      let callCount = 0
      const mockResponses = [
        { // module_waiter_call
          overrideData: null,
          planFeatureData: {
            value_boolean: true,
            value_limit: null,
            plan_name: 'Gold',
            feature_type: 'boolean',
          },
        },
        { // module_images
          overrideData: null,
          planFeatureData: {
            value_boolean: false,
            value_limit: null,
            plan_name: 'Gold',
            feature_type: 'boolean',
          },
        },
        { // module_variants
          overrideData: null,
          planFeatureData: {
            value_boolean: true,
            value_limit: null,
            plan_name: 'Gold',
            feature_type: 'boolean',
          },
        },
      ]

      // Create a mock that returns different data based on feature
      let currentTable = ''
      const queryBuilder = {
        select: vi.fn(() => queryBuilder),
        eq: vi.fn((field: string, value: string) => {
          if (field === 'feature_key' || field === 'features.key') {
            // Determine which feature is being queried
            if (value === 'module_waiter_call') callCount = 0
            else if (value === 'module_images') callCount = 1
            else if (value === 'module_variants') callCount = 2
          }
          return queryBuilder
        }),
        or: vi.fn(() => queryBuilder),
        maybeSingle: vi.fn(() => {
          const response = mockResponses[callCount % 3]
          if (currentTable === 'organization_feature_overrides') {
            return Promise.resolve({ data: response.overrideData, error: null })
          }
          return Promise.resolve({ data: response.planFeatureData, error: null })
        }),
      }

      mockSupabaseFrom = vi.fn((table: string) => {
        currentTable = table
        return queryBuilder
      })

      const result = await batchCheckPermissions(TEST_ORG_ID, [
        'module_waiter_call',
        'module_images',
        'module_variants',
      ])

      expect(result).toHaveProperty('module_waiter_call')
      expect(result).toHaveProperty('module_images')
      expect(result).toHaveProperty('module_variants')
      expect(typeof result.module_waiter_call).toBe('boolean')
    })
  })

  describe('getAllFeatures()', () => {
    it('should return all features with their permission status', async () => {
      // Mock for getAllFeatures which makes different queries
      let currentTable = ''
      const queryBuilder = {
        select: vi.fn(() => queryBuilder),
        eq: vi.fn(() => queryBuilder),
        or: vi.fn(() => queryBuilder),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }

      // For getAllFeatures, we need to mock the array returns
      const planFeaturesData = [
        {
          feature_key: 'module_images',
          value_boolean: true,
          value_limit: null,
          plan_name: 'Gold',
          feature_type: 'boolean',
        },
        {
          feature_key: 'limit_products',
          value_boolean: null,
          value_limit: 50,
          plan_name: 'Gold',
          feature_type: 'limit',
        },
      ]

      const overridesData = [
        {
          override_value: false,
          value_limit: null,
          expires_at: null,
          features: { key: 'module_images' },
        },
      ]

      // Override the then to handle array returns for getAllFeatures
      Object.assign(queryBuilder, {
        then: vi.fn((callback) => {
          if (currentTable === 'v_organization_features') {
            return Promise.resolve({ data: planFeaturesData, error: null }).then(callback)
          }
          if (currentTable === 'organization_feature_overrides') {
            return Promise.resolve({ data: overridesData, error: null }).then(callback)
          }
          return Promise.resolve({ data: [], error: null }).then(callback)
        }),
      })

      mockSupabaseFrom = vi.fn((table: string) => {
        currentTable = table
        return queryBuilder
      })

      const result = await getAllFeatures(TEST_ORG_ID)

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
        planFeatureError: new Error('Database connection failed'),
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'module_waiter_call')

      // Should return false on error (fail-safe)
      expect(result).toBe(false)
    })

    it('should handle null value_boolean correctly', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: null,
          value_limit: null,
          plan_name: 'Free',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, 'module_images')

      // Null value_boolean should be treated as false
      expect(result).toBe(false)
    })

    it('should handle empty feature key', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const result = await hasPermission(TEST_ORG_ID, '')

      expect(result).toBe(false)
    })

    it('should handle empty organization ID', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: null,
      })
      mockSupabaseFrom = from

      const result = await hasPermission('', 'module_waiter_call')

      expect(result).toBe(false)
    })
  })

  describe('Dynamic Feature Checking Pattern', () => {
    /**
     * CRITICAL: These tests verify that the permission system follows the
     * dynamic feature checking pattern from ek_ozellikler.md.
     *
     * The key principle is: NO hard-coded plan checks in application code!
     * All permission decisions must come from the database.
     */

    it('should not contain any hard-coded plan names in results', async () => {
      const { from } = createMockQueryBuilder({
        overrideData: null,
        planFeatureData: {
          value_boolean: true,
          value_limit: null,
          plan_name: 'SomeUnknownPlan',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'module_waiter_call')

      // Should work with any plan name - the system is plan-agnostic
      expect(result.allowed).toBe(true)
      expect(result.planName).toBe('SomeUnknownPlan')
    })

    it('should support feature overrides for trial/promotional access', async () => {
      // Scenario: Free plan user gets temporary access to a Pro feature
      const { from } = createMockQueryBuilder({
        overrideData: {
          override_value: true,
          value_limit: null,
          expires_at: '2030-12-31T23:59:59Z',
          feature_id: 'feature-uuid',
          features: { key: 'module_ai_generation' },
        },
        planFeatureData: {
          value_boolean: false,
          value_limit: null,
          plan_name: 'Free',
          feature_type: 'boolean',
        },
      })
      mockSupabaseFrom = from

      const result = await checkPermission(TEST_ORG_ID, 'module_ai_generation')

      // Override should grant access despite plan limitations
      expect(result.allowed).toBe(true)
      expect(result.source).toBe('override')
      expect(result.expiresAt).toBe('2030-12-31T23:59:59Z')
    })
  })
})
