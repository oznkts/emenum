/**
 * Permission Guard - Dynamic Feature Permission System
 *
 * This module implements the dynamic permission checking system for the
 * e-menum.net SaaS platform. It follows the "Feature Flagging" pattern
 * described in ek_ozellikler.md.
 *
 * IMPORTANT: NO hard-coded plan checks are allowed in application code!
 * All permission checks must go through these guard functions.
 *
 * Permission Check Flow:
 * 1. Check v_organization_features view (subscription plan features)
 * 2. Check organization_feature_overrides table (ABAC exceptions)
 * 3. Override takes precedence if not expired
 *
 * @example
 * // CORRECT: Dynamic permission check
 * if (await hasPermission(organizationId, 'module_waiter_call')) {
 *   showCallWaiterButton()
 * }
 *
 * // WRONG: Never do this!
 * // if (user.package === 'Pro') { ... } // FORBIDDEN!
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Result type for permission checks
 */
export interface PermissionResult {
  /** Whether the organization has this permission */
  allowed: boolean
  /** Source of the permission decision */
  source: 'plan' | 'override' | 'none'
  /** For limit-type features, the numeric limit value */
  limit?: number | null
  /** Plan name if permission comes from plan */
  planName?: string
  /** Override expiration if applicable */
  expiresAt?: string | null
}

/**
 * Check if an organization has permission for a specific boolean feature.
 *
 * This is the primary guard function for feature access. It checks:
 * 1. The organization's subscription plan features (via v_organization_features view)
 * 2. Any per-organization overrides (ABAC layer)
 *
 * Override always takes precedence over plan features (if not expired).
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The feature key to check (e.g., 'module_waiter_call')
 * @returns Promise<boolean> - true if organization has permission
 *
 * @example
 * ```typescript
 * if (await hasPermission(orgId, 'module_waiter_call')) {
 *   // Show waiter call feature
 * } else {
 *   // Show upgrade prompt
 * }
 * ```
 */
export async function hasPermission(
  organizationId: string,
  featureKey: string
): Promise<boolean> {
  const result = await checkPermission(organizationId, featureKey)
  return result.allowed
}

/**
 * Check permission with detailed result information.
 *
 * Use this when you need to know the source of the permission decision
 * (plan vs override) or for displaying upgrade prompts with context.
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The feature key to check
 * @returns Promise<PermissionResult> - Detailed permission result
 *
 * @example
 * ```typescript
 * const result = await checkPermission(orgId, 'module_images')
 * if (!result.allowed) {
 *   showUpgradePrompt({
 *     feature: 'module_images',
 *     currentPlan: result.planName
 *   })
 * }
 * ```
 */
export async function checkPermission(
  organizationId: string,
  featureKey: string
): Promise<PermissionResult> {
  const supabase = await createServerSupabaseClient()

  // Step 1: Check for organization-specific override (ABAC layer)
  // Override takes precedence over plan features
  // We need to join with features table since overrides use feature_id
  const { data: override, error: overrideError } = await supabase
    .from('organization_feature_overrides')
    .select(`
      override_value,
      value_limit,
      expires_at,
      feature_id,
      features!inner(key)
    `)
    .eq('organization_id', organizationId)
    .eq('features.key', featureKey)
    .or('expires_at.is.null,expires_at.gt.now()')
    .maybeSingle()

  // If there's a valid (non-expired) override, use it
  if (!overrideError && override) {
    return {
      allowed: override.override_value,
      source: 'override',
      limit: override.value_limit,
      expiresAt: override.expires_at,
    }
  }

  // Step 2: Check subscription plan features via v_organization_features view
  const { data: planFeature, error: planError } = await supabase
    .from('v_organization_features')
    .select('value_boolean, value_limit, plan_name, feature_type')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .maybeSingle()

  if (planError || !planFeature) {
    // No subscription or feature not found in plan
    return {
      allowed: false,
      source: 'none',
    }
  }

  // For boolean features, return value_boolean
  // For limit features, check if limit > 0
  const isAllowed = planFeature.feature_type === 'boolean'
    ? planFeature.value_boolean ?? false
    : (planFeature.value_limit ?? 0) > 0

  return {
    allowed: isAllowed,
    source: 'plan',
    limit: planFeature.value_limit,
    planName: planFeature.plan_name,
  }
}

/**
 * Get the numeric limit for a limit-type feature.
 *
 * Use this for features like 'limit_products', 'limit_categories', etc.
 * Returns the effective limit considering both plan and overrides.
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The feature key to check (e.g., 'limit_products')
 * @returns Promise<number> - The numeric limit (0 if not allowed or unlimited)
 *
 * @example
 * ```typescript
 * const maxProducts = await getFeatureLimit(orgId, 'limit_products')
 * if (currentProductCount >= maxProducts) {
 *   showUpgradePrompt('Ürün limitinize ulaştınız')
 * }
 * ```
 */
export async function getFeatureLimit(
  organizationId: string,
  featureKey: string
): Promise<number> {
  const result = await checkPermission(organizationId, featureKey)
  return result.limit ?? 0
}

/**
 * Check if an organization is within their limit for a feature.
 *
 * Convenience function that checks if currentCount is below the feature limit.
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The limit feature key to check
 * @param currentCount - The current count to compare against limit
 * @returns Promise<boolean> - true if within limit, false if at or over limit
 *
 * @example
 * ```typescript
 * const canAddProduct = await isWithinLimit(orgId, 'limit_products', productCount)
 * if (!canAddProduct) {
 *   showLimitReachedMessage()
 * }
 * ```
 */
export async function isWithinLimit(
  organizationId: string,
  featureKey: string,
  currentCount: number
): Promise<boolean> {
  const limit = await getFeatureLimit(organizationId, featureKey)

  // Special case: limit of 0 or negative means unlimited (Enterprise plan)
  // Or feature is not a limit type (use -1 for unlimited in seed data)
  if (limit < 0) {
    return true
  }

  return currentCount < limit
}

/**
 * Check if an organization can add one more item within their limit.
 *
 * Convenience wrapper around isWithinLimit that handles the common case
 * of checking if one more item can be added.
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKey - The limit feature key to check
 * @param currentCount - The current count of items
 * @returns Promise<boolean> - true if can add one more, false if at limit
 *
 * @example
 * ```typescript
 * const canAddCategory = await canAddOne(orgId, 'limit_categories', categoryCount)
 * ```
 */
export async function canAddOne(
  organizationId: string,
  featureKey: string,
  currentCount: number
): Promise<boolean> {
  return isWithinLimit(organizationId, featureKey, currentCount)
}

/**
 * Batch check multiple permissions at once.
 *
 * More efficient than calling hasPermission multiple times when you need
 * to check several features for the same organization.
 *
 * @param organizationId - The UUID of the organization to check
 * @param featureKeys - Array of feature keys to check
 * @returns Promise<Record<string, boolean>> - Map of feature key to permission
 *
 * @example
 * ```typescript
 * const permissions = await batchCheckPermissions(orgId, [
 *   'module_waiter_call',
 *   'module_images',
 *   'module_variants'
 * ])
 * // { module_waiter_call: true, module_images: false, module_variants: true }
 * ```
 */
export async function batchCheckPermissions(
  organizationId: string,
  featureKeys: string[]
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    featureKeys.map(async (key) => ({
      key,
      allowed: await hasPermission(organizationId, key),
    }))
  )

  return results.reduce(
    (acc, { key, allowed }) => {
      acc[key] = allowed
      return acc
    },
    {} as Record<string, boolean>
  )
}

/**
 * Get all features for an organization with their values.
 *
 * Useful for rendering feature matrices or settings pages.
 * Includes both plan features and any overrides.
 *
 * @param organizationId - The UUID of the organization
 * @returns Promise<Record<string, PermissionResult>> - Map of all features
 */
export async function getAllFeatures(
  organizationId: string
): Promise<Record<string, PermissionResult>> {
  const supabase = await createServerSupabaseClient()

  // Get all plan features for this organization
  const { data: planFeatures } = await supabase
    .from('v_organization_features')
    .select('feature_key, value_boolean, value_limit, plan_name, feature_type')
    .eq('organization_id', organizationId)

  // Get all overrides for this organization
  const { data: overrides } = await supabase
    .from('organization_feature_overrides')
    .select(`
      override_value,
      value_limit,
      expires_at,
      features!inner(key)
    `)
    .eq('organization_id', organizationId)
    .or('expires_at.is.null,expires_at.gt.now()')

  const result: Record<string, PermissionResult> = {}

  // First, add all plan features
  if (planFeatures) {
    for (const pf of planFeatures) {
      const isAllowed = pf.feature_type === 'boolean'
        ? pf.value_boolean ?? false
        : (pf.value_limit ?? 0) > 0

      result[pf.feature_key] = {
        allowed: isAllowed,
        source: 'plan',
        limit: pf.value_limit,
        planName: pf.plan_name,
      }
    }
  }

  // Then, apply overrides (they take precedence)
  if (overrides) {
    for (const override of overrides) {
      // Handle the nested features relation - Supabase returns it as an object when using !inner
      const features = override.features as unknown as { key: string } | null
      if (features?.key) {
        result[features.key] = {
          allowed: override.override_value,
          source: 'override',
          limit: override.value_limit,
          expiresAt: override.expires_at,
        }
      }
    }
  }

  return result
}
