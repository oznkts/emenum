/**
 * Menu Snapshot Service - Immutable Menu State with SHA-256 Hashing
 *
 * This service implements menu snapshot creation and verification for
 * Turkish Trade Ministry regulatory compliance. Each menu publish creates
 * an immutable snapshot with a SHA-256 hash for proof of integrity.
 *
 * CRITICAL: Snapshots are immutable compliance records!
 * - Each publish creates a new versioned snapshot
 * - Hash provides cryptographic proof of menu content
 * - Snapshots can be exported for regulatory audits
 *
 * Database Tables:
 * - `menu_snapshots`: Stores complete menu state with hash
 *
 * @example
 * // Create a new snapshot when publishing menu
 * const result = await createMenuSnapshot(organizationId)
 *
 * // Verify snapshot integrity
 * const isValid = await verifySnapshotHash(snapshotId)
 *
 * // Get latest published menu
 * const current = await getCurrentMenuSnapshot(organizationId)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type {
  MenuSnapshot,
  CurrentPrice,
  Json,
} from '@/types/database'

/**
 * Complete menu data structure for snapshot
 */
export interface MenuSnapshotData {
  /** Organization/restaurant information */
  organization: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    cover_url: string | null
    settings: Json
  }
  /** All visible categories with hierarchy */
  categories: Array<{
    id: string
    name: string
    slug: string
    parent_id: string | null
    sort_order: number
  }>
  /** All visible products with current prices */
  products: Array<{
    id: string
    name: string
    description: string | null
    category_id: string | null
    image_url: string | null
    allergens: string[] | null
    nutrition: Json | null
    price: number | null
    currency: string
  }>
  /** Snapshot metadata */
  metadata: {
    generated_at: string
    product_count: number
    category_count: number
  }
}

/**
 * Result type for snapshot operations
 */
export interface SnapshotOperationResult {
  /** Whether the operation succeeded */
  success: boolean
  /** The created/retrieved snapshot */
  data?: MenuSnapshot | null
  /** Error message if operation failed */
  error?: string
}

/**
 * Result type for snapshot verification
 */
export interface SnapshotVerificationResult {
  /** Whether the verification succeeded */
  success: boolean
  /** Whether the hash matches the content */
  isValid: boolean
  /** The stored hash */
  storedHash?: string
  /** The computed hash from current data */
  computedHash?: string
  /** Error message if operation failed */
  error?: string
}

/**
 * Result type for snapshot listing
 */
export interface SnapshotListResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Array of snapshots */
  data: MenuSnapshot[]
  /** Error message if operation failed */
  error?: string
  /** Total count for pagination */
  totalCount?: number
}

/**
 * Generate SHA-256 hash from data using Web Crypto API
 *
 * This function creates a cryptographic hash of the snapshot data
 * for integrity verification and compliance proof.
 *
 * @param data - The data to hash (will be stringified)
 * @returns Promise<string> - Hex-encoded SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = await generateSHA256Hash({ menu: 'data' })
 * // Returns: 'a1b2c3d4...' (64 character hex string)
 * ```
 */
export async function generateSHA256Hash(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data, null, 0) // Deterministic JSON
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(jsonString)

  // Use Web Crypto API for SHA-256 hashing
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Collect complete menu data for an organization
 *
 * Gathers all visible categories, products with current prices,
 * and organization info for creating a menu snapshot.
 *
 * @param organizationId - The UUID of the organization
 * @returns Promise<MenuSnapshotData | null> - Complete menu data or null on error
 */
async function collectMenuData(
  organizationId: string
): Promise<MenuSnapshotData | null> {
  const supabase = await createServerSupabaseClient()

  // Fetch organization details
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, cover_url, settings')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    return null
  }

  // Fetch all visible categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, sort_order')
    .eq('organization_id', organizationId)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })

  if (catError) {
    return null
  }

  // Fetch all visible products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, description, category_id, image_url, allergens, nutrition')
    .eq('organization_id', organizationId)
    .eq('is_visible', true)

  if (prodError) {
    return null
  }

  // Fetch current prices for all products
  const productIds = products?.map((p) => p.id) || []
  let priceMap = new Map<string, CurrentPrice>()

  if (productIds.length > 0) {
    const { data: prices } = await supabase
      .from('current_prices')
      .select('product_id, price, currency')
      .in('product_id', productIds)

    if (prices) {
      priceMap = new Map(prices.map((p) => [p.product_id, p as CurrentPrice]))
    }
  }

  // Combine products with prices
  const productsWithPrices = (products || []).map((product) => {
    const price = priceMap.get(product.id)
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      image_url: product.image_url,
      allergens: product.allergens,
      nutrition: product.nutrition,
      price: price?.price ?? null,
      currency: price?.currency ?? 'TRY',
    }
  })

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo_url: organization.logo_url,
      cover_url: organization.cover_url,
      settings: organization.settings,
    },
    categories: (categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id,
      sort_order: cat.sort_order,
    })),
    products: productsWithPrices,
    metadata: {
      generated_at: new Date().toISOString(),
      product_count: productsWithPrices.length,
      category_count: (categories || []).length,
    },
  }
}

/**
 * Create a new menu snapshot with SHA-256 hash.
 *
 * This is the primary function for creating compliance snapshots.
 * It collects all menu data, generates a cryptographic hash, and
 * stores an immutable record for regulatory auditing.
 *
 * @param organizationId - The UUID of the organization
 * @returns Promise<SnapshotOperationResult> - Result with created snapshot or error
 *
 * @example
 * ```typescript
 * // Create snapshot on menu publish
 * const result = await createMenuSnapshot(organizationId)
 * if (result.success && result.data) {
 *   console.log(`Snapshot created: v${result.data.version}`)
 *   console.log(`Hash: ${result.data.hash}`)
 * }
 * ```
 */
export async function createMenuSnapshot(
  organizationId: string
): Promise<SnapshotOperationResult> {
  if (!organizationId) {
    return {
      success: false,
      error: 'Organizasyon ID gereklidir',
    }
  }

  // Collect all menu data
  const menuData = await collectMenuData(organizationId)

  if (!menuData) {
    return {
      success: false,
      error: 'Men\u00fc verileri toplanamad\u0131',
    }
  }

  // Generate SHA-256 hash for integrity verification
  const hash = await generateSHA256Hash(menuData)

  const supabase = await createServerSupabaseClient()

  // Get next version number
  const { data: latestSnapshot } = await supabase
    .from('menu_snapshots')
    .select('version')
    .eq('organization_id', organizationId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latestSnapshot?.version ?? 0) + 1

  // Insert new snapshot
  const { data, error } = await supabase
    .from('menu_snapshots')
    .insert({
      organization_id: organizationId,
      snapshot_data: menuData as unknown as Json,
      hash: hash,
      version: nextVersion,
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.message || 'Snapshot olu\u015fturulamad\u0131',
    }
  }

  return {
    success: true,
    data: data as MenuSnapshot,
  }
}

/**
 * Get the current (latest) menu snapshot for an organization.
 *
 * Returns the most recent published menu snapshot for display
 * on the public menu page.
 *
 * @param organizationId - The UUID of the organization
 * @returns Promise<SnapshotOperationResult> - Result with current snapshot or error
 *
 * @example
 * ```typescript
 * const result = await getCurrentMenuSnapshot(organizationId)
 * if (result.success && result.data) {
 *   const menuData = result.data.snapshot_data as MenuSnapshotData
 *   // Render menu from snapshot data
 * }
 * ```
 */
export async function getCurrentMenuSnapshot(
  organizationId: string
): Promise<SnapshotOperationResult> {
  if (!organizationId) {
    return {
      success: false,
      error: 'Organizasyon ID gereklidir',
    }
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: error.message || 'Snapshot al\u0131namad\u0131',
    }
  }

  return {
    success: true,
    data: data as MenuSnapshot | null,
  }
}

/**
 * Get a specific menu snapshot by ID.
 *
 * @param snapshotId - The UUID of the snapshot
 * @returns Promise<SnapshotOperationResult> - Result with snapshot or error
 *
 * @example
 * ```typescript
 * const result = await getSnapshotById(snapshotId)
 * if (result.success && result.data) {
 *   console.log(`Snapshot version: ${result.data.version}`)
 * }
 * ```
 */
export async function getSnapshotById(
  snapshotId: string
): Promise<SnapshotOperationResult> {
  if (!snapshotId) {
    return {
      success: false,
      error: 'Snapshot ID gereklidir',
    }
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (error) {
    return {
      success: false,
      error: error.message || 'Snapshot bulunamad\u0131',
    }
  }

  return {
    success: true,
    data: data as MenuSnapshot,
  }
}

/**
 * Verify the integrity of a menu snapshot using SHA-256 hash.
 *
 * Re-computes the hash from the stored snapshot data and compares
 * it with the stored hash to verify data integrity.
 *
 * @param snapshotId - The UUID of the snapshot to verify
 * @returns Promise<SnapshotVerificationResult> - Verification result
 *
 * @example
 * ```typescript
 * const result = await verifySnapshotHash(snapshotId)
 * if (result.success && result.isValid) {
 *   console.log('Snapshot integrity verified!')
 * } else {
 *   console.error('Snapshot has been tampered with!')
 * }
 * ```
 */
export async function verifySnapshotHash(
  snapshotId: string
): Promise<SnapshotVerificationResult> {
  if (!snapshotId) {
    return {
      success: false,
      isValid: false,
      error: 'Snapshot ID gereklidir',
    }
  }

  const snapshotResult = await getSnapshotById(snapshotId)

  if (!snapshotResult.success || !snapshotResult.data) {
    return {
      success: false,
      isValid: false,
      error: snapshotResult.error || 'Snapshot bulunamad\u0131',
    }
  }

  const snapshot = snapshotResult.data
  const storedHash = snapshot.hash

  // Re-compute hash from stored data
  const computedHash = await generateSHA256Hash(snapshot.snapshot_data)

  return {
    success: true,
    isValid: storedHash === computedHash,
    storedHash,
    computedHash,
  }
}

/**
 * Get all menu snapshots for an organization (version history).
 *
 * Returns paginated list of all snapshots for audit and compliance.
 *
 * @param organizationId - The UUID of the organization
 * @param options - Pagination options
 * @returns Promise<SnapshotListResult> - Result with snapshot list
 *
 * @example
 * ```typescript
 * // Get first page of snapshots
 * const result = await getSnapshotHistory(organizationId, {
 *   limit: 10,
 *   offset: 0
 * })
 * ```
 */
export async function getSnapshotHistory(
  organizationId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<SnapshotListResult> {
  if (!organizationId) {
    return {
      success: false,
      data: [],
      error: 'Organizasyon ID gereklidir',
    }
  }

  const { limit = 50, offset = 0 } = options
  const supabase = await createServerSupabaseClient()

  const { data, error, count } = await supabase
    .from('menu_snapshots')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('version', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return {
      success: false,
      data: [],
      error: error.message || 'Snapshot ge\u00e7mi\u015fi al\u0131namad\u0131',
    }
  }

  return {
    success: true,
    data: (data as MenuSnapshot[]) || [],
    totalCount: count ?? undefined,
  }
}

/**
 * Get a specific snapshot version by version number.
 *
 * @param organizationId - The UUID of the organization
 * @param version - The version number to retrieve
 * @returns Promise<SnapshotOperationResult> - Result with snapshot or error
 *
 * @example
 * ```typescript
 * const result = await getSnapshotByVersion(organizationId, 5)
 * if (result.success && result.data) {
 *   console.log(`Retrieved version ${result.data.version}`)
 * }
 * ```
 */
export async function getSnapshotByVersion(
  organizationId: string,
  version: number
): Promise<SnapshotOperationResult> {
  if (!organizationId) {
    return {
      success: false,
      error: 'Organizasyon ID gereklidir',
    }
  }

  if (version < 1) {
    return {
      success: false,
      error: 'Ge\u00e7ersiz versiyon numaras\u0131',
    }
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('menu_snapshots')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('version', version)
    .single()

  if (error) {
    return {
      success: false,
      error: error.message || 'Snapshot bulunamad\u0131',
    }
  }

  return {
    success: true,
    data: data as MenuSnapshot,
  }
}

/**
 * Compare two snapshot versions to identify changes.
 *
 * Useful for showing what changed between menu publishes.
 *
 * @param organizationId - The UUID of the organization
 * @param versionA - First version number
 * @param versionB - Second version number
 * @returns Promise with comparison result
 *
 * @example
 * ```typescript
 * const diff = await compareSnapshots(orgId, 1, 2)
 * if (diff.success) {
 *   console.log(`Added products: ${diff.addedProducts.length}`)
 *   console.log(`Removed products: ${diff.removedProducts.length}`)
 * }
 * ```
 */
export async function compareSnapshots(
  organizationId: string,
  versionA: number,
  versionB: number
): Promise<{
  success: boolean
  addedProducts: string[]
  removedProducts: string[]
  addedCategories: string[]
  removedCategories: string[]
  error?: string
}> {
  const [resultA, resultB] = await Promise.all([
    getSnapshotByVersion(organizationId, versionA),
    getSnapshotByVersion(organizationId, versionB),
  ])

  if (!resultA.success || !resultA.data || !resultB.success || !resultB.data) {
    return {
      success: false,
      addedProducts: [],
      removedProducts: [],
      addedCategories: [],
      removedCategories: [],
      error: 'Bir veya daha fazla snapshot bulunamad\u0131',
    }
  }

  const dataA = resultA.data.snapshot_data as unknown as MenuSnapshotData
  const dataB = resultB.data.snapshot_data as unknown as MenuSnapshotData

  const productIdsA = new Set(dataA.products.map((p) => p.id))
  const productIdsB = new Set(dataB.products.map((p) => p.id))
  const categoryIdsA = new Set(dataA.categories.map((c) => c.id))
  const categoryIdsB = new Set(dataB.categories.map((c) => c.id))

  return {
    success: true,
    addedProducts: [...productIdsB].filter((id) => !productIdsA.has(id)),
    removedProducts: [...productIdsA].filter((id) => !productIdsB.has(id)),
    addedCategories: [...categoryIdsB].filter((id) => !categoryIdsA.has(id)),
    removedCategories: [...categoryIdsA].filter((id) => !categoryIdsB.has(id)),
  }
}

/**
 * Export snapshot data for compliance reporting.
 *
 * Formats snapshot data for regulatory export, including
 * hash verification proof.
 *
 * @param snapshotId - The UUID of the snapshot to export
 * @returns Promise with formatted export data
 *
 * @example
 * ```typescript
 * const exportData = await exportSnapshotForCompliance(snapshotId)
 * // Convert to JSON/CSV for regulatory submission
 * ```
 */
export async function exportSnapshotForCompliance(snapshotId: string): Promise<{
  success: boolean
  data?: {
    snapshot: MenuSnapshot
    menuData: MenuSnapshotData
    verification: {
      hash: string
      verified: boolean
      verified_at: string
    }
  }
  error?: string
}> {
  const snapshotResult = await getSnapshotById(snapshotId)

  if (!snapshotResult.success || !snapshotResult.data) {
    return {
      success: false,
      error: snapshotResult.error || 'Snapshot bulunamad\u0131',
    }
  }

  const verificationResult = await verifySnapshotHash(snapshotId)

  return {
    success: true,
    data: {
      snapshot: snapshotResult.data,
      menuData: snapshotResult.data.snapshot_data as unknown as MenuSnapshotData,
      verification: {
        hash: snapshotResult.data.hash,
        verified: verificationResult.isValid,
        verified_at: new Date().toISOString(),
      },
    },
  }
}

/**
 * Get the current snapshot for an organization by slug.
 *
 * Useful for public menu pages that identify organizations by slug.
 *
 * @param slug - The organization slug
 * @returns Promise<SnapshotOperationResult> - Result with snapshot or error
 *
 * @example
 * ```typescript
 * const result = await getCurrentMenuSnapshotBySlug('my-restaurant')
 * if (result.success && result.data) {
 *   // Render public menu
 * }
 * ```
 */
export async function getCurrentMenuSnapshotBySlug(
  slug: string
): Promise<SnapshotOperationResult> {
  if (!slug) {
    return {
      success: false,
      error: 'Slug gereklidir',
    }
  }

  const supabase = await createServerSupabaseClient()

  // First, find organization by slug
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (orgError || !organization) {
    return {
      success: false,
      error: 'Restoran bulunamad\u0131',
    }
  }

  return getCurrentMenuSnapshot(organization.id)
}
