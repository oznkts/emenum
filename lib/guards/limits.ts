/**
 * Limit Guards - Dynamic Numeric Limit Checking System
 *
 * This module provides specialized guard functions for checking numeric limits
 * in the e-menum.net SaaS platform. It works in conjunction with permission.ts
 * but focuses specifically on limit-type features.
 *
 * Supported limit features (from seed.sql):
 * - limit_categories: Max categories per organization
 * - limit_products: Max products per organization
 * - limit_languages: Number of language translations
 * - limit_retention_days: Audit log retention period
 * - limit_export_formats: Number of export format options
 * - ai_token_quota: Monthly AI token allocation
 *
 * IMPORTANT: All limit checks are dynamic from database!
 * NO hard-coded plan limits in application code.
 *
 * @example
 * // Check if org can add a new product
 * const result = await checkLimit(orgId, 'limit_products', 'products')
 * if (!result.canAdd) {
 *   showUpgradePrompt(result.message)
 * }
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Standard limit feature keys used in the system
 */
export const LIMIT_FEATURES = {
  CATEGORIES: 'limit_categories',
  PRODUCTS: 'limit_products',
  LANGUAGES: 'limit_languages',
  RETENTION_DAYS: 'limit_retention_days',
  EXPORT_FORMATS: 'limit_export_formats',
  AI_TOKENS: 'ai_token_quota',
} as const

export type LimitFeatureKey = typeof LIMIT_FEATURES[keyof typeof LIMIT_FEATURES]

/**
 * Entity types that can be counted for limit checking
 */
export type CountableEntity = 'categories' | 'products' | 'restaurant_tables'

/**
 * Result of a limit check operation
 */
export interface LimitCheckResult {
  /** Whether the organization can add more items */
  canAdd: boolean
  /** Current count of items */
  currentCount: number
  /** Maximum allowed (from plan or override) */
  limit: number
  /** Whether limit is unlimited (-1 in database) */
  isUnlimited: boolean
  /** Remaining items that can be added */
  remaining: number
  /** Source of the limit (plan or override) */
  source: 'plan' | 'override' | 'none'
  /** Plan name if applicable */
  planName?: string
  /** User-friendly message (Turkish) */
  message: string
}

/**
 * Result of a limit status query
 */
export interface LimitStatus {
  /** The feature key */
  featureKey: string
  /** Current count of items */
  currentCount: number
  /** Maximum allowed from plan */
  limit: number
  /** Whether unlimited */
  isUnlimited: boolean
  /** Usage percentage (0-100) */
  usagePercent: number
  /** Source of limit */
  source: 'plan' | 'override' | 'none'
  /** Plan name if applicable */
  planName?: string
}

/**
 * Check if an organization can add more items based on their plan limit.
 *
 * This is the main guard function for limit-type features. It:
 * 1. Gets the current count of items for the organization
 * 2. Gets the limit from plan features or overrides
 * 3. Returns whether adding one more item is allowed
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The limit feature key (e.g., 'limit_products')
 * @param entityType - The entity type to count (e.g., 'products')
 * @returns Promise<LimitCheckResult> - Detailed limit check result
 *
 * @example
 * ```typescript
 * const result = await checkLimit(orgId, 'limit_products', 'products')
 * if (!result.canAdd) {
 *   toast.error(result.message)
 *   return
 * }
 * // Proceed with adding product
 * ```
 */
export async function checkLimit(
  organizationId: string,
  featureKey: string,
  entityType: CountableEntity
): Promise<LimitCheckResult> {
  const supabase = await createServerSupabaseClient()

  // Step 1: Get current count of entities
  const currentCount = await getEntityCount(organizationId, entityType)

  // Step 2: Check for organization-specific override first (ABAC layer)
  const { data: override } = await supabase
    .from('organization_feature_overrides')
    .select(`
      override_value,
      value_limit,
      expires_at,
      features!inner(key)
    `)
    .eq('organization_id', organizationId)
    .eq('features.key', featureKey)
    .or('expires_at.is.null,expires_at.gt.now()')
    .maybeSingle()

  // If there's a valid override with a limit, use it
  if (override?.value_limit !== null && override?.value_limit !== undefined) {
    return buildLimitResult(currentCount, override.value_limit, 'override')
  }

  // Step 3: Check subscription plan features via v_organization_features view
  const { data: planFeature } = await supabase
    .from('v_organization_features')
    .select('value_boolean, value_limit, plan_name, feature_type')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .maybeSingle()

  if (!planFeature) {
    // No subscription or feature not found - deny by default
    return buildLimitResult(currentCount, 0, 'none')
  }

  const limit = planFeature.value_limit ?? 0
  return buildLimitResult(currentCount, limit, 'plan', planFeature.plan_name)
}

/**
 * Build a LimitCheckResult object with proper messaging
 */
function buildLimitResult(
  currentCount: number,
  limit: number,
  source: 'plan' | 'override' | 'none',
  planName?: string | null
): LimitCheckResult {
  const isUnlimited = limit < 0
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentCount)
  const canAdd = isUnlimited || currentCount < limit

  let message: string
  if (source === 'none') {
    message = 'Bu özellik mevcut paketinizde bulunmamaktadır.'
  } else if (isUnlimited) {
    message = 'Sınırsız kullanım hakkınız var.'
  } else if (canAdd) {
    message = `${remaining} adet daha ekleyebilirsiniz.`
  } else {
    message = `Limit aşıldı. Paketinizi yükselterek daha fazla ekleyebilirsiniz.`
  }

  return {
    canAdd,
    currentCount,
    limit,
    isUnlimited,
    remaining: isUnlimited ? Infinity : remaining,
    source,
    planName: planName ?? undefined,
    message,
  }
}

/**
 * Get the current count of entities for an organization.
 *
 * This helper queries the database to count items owned by the organization.
 *
 * @param organizationId - The UUID of the organization
 * @param entityType - The type of entity to count
 * @returns Promise<number> - Current count of entities
 */
export async function getEntityCount(
  organizationId: string,
  entityType: CountableEntity
): Promise<number> {
  const supabase = await createServerSupabaseClient()

  let count = 0

  switch (entityType) {
    case 'categories': {
      const { count: catCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      count = catCount ?? 0
      break
    }
    case 'products': {
      const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      count = prodCount ?? 0
      break
    }
    case 'restaurant_tables': {
      const { count: tableCount } = await supabase
        .from('restaurant_tables')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      count = tableCount ?? 0
      break
    }
  }

  return count
}

/**
 * Get detailed limit status for all limit-type features of an organization.
 *
 * Useful for displaying a usage dashboard or account settings page.
 *
 * @param organizationId - The UUID of the organization
 * @returns Promise<LimitStatus[]> - Array of limit statuses
 *
 * @example
 * ```typescript
 * const limits = await getAllLimitStatuses(orgId)
 * limits.forEach(limit => {
 *   console.log(`${limit.featureKey}: ${limit.currentCount}/${limit.limit}`)
 * })
 * ```
 */
export async function getAllLimitStatuses(
  organizationId: string
): Promise<LimitStatus[]> {
  const supabase = await createServerSupabaseClient()

  // Get all limit-type features for this organization
  const { data: features } = await supabase
    .from('v_organization_features')
    .select('feature_key, value_limit, plan_name, feature_type')
    .eq('organization_id', organizationId)
    .eq('feature_type', 'limit')

  if (!features || features.length === 0) {
    return []
  }

  // Get counts for countable entities
  const [categoryCount, productCount] = await Promise.all([
    getEntityCount(organizationId, 'categories'),
    getEntityCount(organizationId, 'products'),
  ])

  const countMap: Record<string, number> = {
    limit_categories: categoryCount,
    limit_products: productCount,
    // Other limit features don't have direct entity counts
    limit_languages: 0,
    limit_retention_days: 0,
    limit_export_formats: 0,
    ai_token_quota: 0,
  }

  return features.map((feature) => {
    const limit = feature.value_limit ?? 0
    const isUnlimited = limit < 0
    const currentCount = countMap[feature.feature_key] ?? 0
    const usagePercent = isUnlimited ? 0 : limit > 0 ? Math.min(100, (currentCount / limit) * 100) : 0

    return {
      featureKey: feature.feature_key,
      currentCount,
      limit,
      isUnlimited,
      usagePercent: Math.round(usagePercent),
      source: 'plan' as const,
      planName: feature.plan_name,
    }
  })
}

/**
 * Quick check if an organization can add a specific entity type.
 *
 * Convenience wrapper for the most common use case.
 *
 * @param organizationId - The UUID of the organization
 * @param entityType - The entity type to check ('categories' | 'products')
 * @returns Promise<boolean> - true if can add, false if at limit
 *
 * @example
 * ```typescript
 * if (await canAddEntity(orgId, 'products')) {
 *   // Show add product button
 * } else {
 *   // Show upgrade prompt
 * }
 * ```
 */
export async function canAddEntity(
  organizationId: string,
  entityType: 'categories' | 'products'
): Promise<boolean> {
  const featureKey = entityType === 'categories'
    ? LIMIT_FEATURES.CATEGORIES
    : LIMIT_FEATURES.PRODUCTS

  const result = await checkLimit(organizationId, featureKey, entityType)
  return result.canAdd
}

/**
 * Get remaining capacity for an entity type.
 *
 * @param organizationId - The UUID of the organization
 * @param entityType - The entity type to check
 * @returns Promise<number> - Remaining capacity (Infinity if unlimited)
 */
export async function getRemainingCapacity(
  organizationId: string,
  entityType: 'categories' | 'products'
): Promise<number> {
  const featureKey = entityType === 'categories'
    ? LIMIT_FEATURES.CATEGORIES
    : LIMIT_FEATURES.PRODUCTS

  const result = await checkLimit(organizationId, featureKey, entityType)
  return result.remaining
}

/**
 * Validate that adding N items would not exceed the limit.
 *
 * Use this for bulk operations where you need to add multiple items at once.
 *
 * @param organizationId - The UUID of the organization
 * @param entityType - The entity type to check
 * @param countToAdd - Number of items to add
 * @returns Promise<LimitCheckResult> - Result indicating if bulk add is allowed
 *
 * @example
 * ```typescript
 * // Importing 10 products from CSV
 * const result = await validateBulkAdd(orgId, 'products', 10)
 * if (!result.canAdd) {
 *   toast.error(`Sadece ${result.remaining} ürün daha ekleyebilirsiniz.`)
 *   return
 * }
 * ```
 */
export async function validateBulkAdd(
  organizationId: string,
  entityType: 'categories' | 'products',
  countToAdd: number
): Promise<LimitCheckResult> {
  const featureKey = entityType === 'categories'
    ? LIMIT_FEATURES.CATEGORIES
    : LIMIT_FEATURES.PRODUCTS

  const result = await checkLimit(organizationId, featureKey, entityType)

  // Adjust canAdd based on bulk count
  const canAddBulk = result.isUnlimited || result.remaining >= countToAdd

  return {
    ...result,
    canAdd: canAddBulk,
    message: canAddBulk
      ? result.message
      : `${countToAdd} adet eklemek istiyorsunuz ancak sadece ${result.remaining} adet ekleyebilirsiniz.`,
  }
}
