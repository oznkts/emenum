/**
 * Price Ledger Service - Immutable Price Management
 *
 * This service implements the INSERT-only price ledger pattern for
 * Turkish Trade Ministry regulatory compliance. All price changes are
 * stored as append-only records with full audit trail.
 *
 * CRITICAL: Prices are NEVER updated or deleted!
 * - UPDATE and DELETE operations are blocked by database trigger
 * - Each price change creates a new ledger entry
 * - Use `current_prices` view to get latest price per product
 *
 * Database Tables:
 * - `price_ledger`: Immutable append-only price history
 * - `current_prices`: View showing latest price per product
 *
 * @example
 * // Add a new price entry (creates immutable record)
 * const entry = await addPriceEntry(productId, 99.90, 'Initial price')
 *
 * // Get current price for a product
 * const price = await getCurrentPrice(productId)
 *
 * // Get price history for audit/compliance
 * const history = await getPriceHistory(productId)
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PriceLedgerEntry, CurrentPrice } from '@/types/database'

/**
 * Result type for price operations
 */
export interface PriceOperationResult {
  /** Whether the operation succeeded */
  success: boolean
  /** The created/retrieved price entry */
  data?: PriceLedgerEntry | CurrentPrice | null
  /** Error message if operation failed */
  error?: string
}

/**
 * Result type for price history queries
 */
export interface PriceHistoryResult {
  /** Whether the operation succeeded */
  success: boolean
  /** Array of price ledger entries */
  data: PriceLedgerEntry[]
  /** Error message if operation failed */
  error?: string
  /** Total count for pagination */
  totalCount?: number
}

/**
 * Options for price history queries
 */
export interface PriceHistoryOptions {
  /** Maximum number of entries to return */
  limit?: number
  /** Number of entries to skip (for pagination) */
  offset?: number
  /** Sort order by created_at */
  order?: 'asc' | 'desc'
  /** Filter by start date */
  startDate?: Date
  /** Filter by end date */
  endDate?: Date
}

/**
 * Add a new price entry to the immutable price ledger.
 *
 * This is the primary function for recording price changes. Each call
 * creates a new immutable record in the price_ledger table. The database
 * trigger prevents any UPDATE or DELETE operations.
 *
 * Note: Only INSERT is allowed on price_ledger table.
 *
 * @param productId - The UUID of the product
 * @param price - The new price value (must be non-negative)
 * @param changeReason - Reason for price change (for audit trail)
 * @param currency - Currency code (default: 'TRY' for Turkish Lira)
 * @returns Promise<PriceOperationResult> - Result with created entry or error
 *
 * @example
 * ```typescript
 * // Record initial product price
 * const result = await addPriceEntry(
 *   productId,
 *   149.90,
 *   'Initial product listing'
 * )
 *
 * // Record price update with reason
 * const result = await addPriceEntry(
 *   productId,
 *   199.90,
 *   'Price adjustment due to supplier cost increase'
 * )
 * ```
 */
export async function addPriceEntry(
  productId: string,
  price: number,
  changeReason: string,
  currency: string = 'TRY'
): Promise<PriceOperationResult> {
  // Validate price
  if (price < 0) {
    return {
      success: false,
      error: 'Fiyat negatif olamaz',
    }
  }

  if (!productId) {
    return {
      success: false,
      error: 'Ürün ID gereklidir',
    }
  }

  const supabase = await createServerSupabaseClient()

  // Get current user for audit trail
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    return {
      success: false,
      error: 'Kullanıcı kimliği doğrulanamadı',
    }
  }

  // INSERT new price entry (only INSERT allowed - no UPDATE/DELETE)
  const { data, error } = await supabase
    .from('price_ledger')
    .insert({
      product_id: productId,
      price: price,
      currency: currency,
      change_reason: changeReason,
      changed_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    return {
      success: false,
      error: error.message || 'Fiyat kaydedilemedi',
    }
  }

  return {
    success: true,
    data: data as PriceLedgerEntry,
  }
}

/**
 * Get the current (latest) price for a product.
 *
 * Uses the `current_prices` database view which returns the most recent
 * price entry for each product (DISTINCT ON product_id, ordered by created_at DESC).
 *
 * @param productId - The UUID of the product
 * @returns Promise<PriceOperationResult> - Result with current price or error
 *
 * @example
 * ```typescript
 * const result = await getCurrentPrice(productId)
 * if (result.success && result.data) {
 *   const price = (result.data as CurrentPrice).price
 *   console.log(`Current price: ${price} TRY`)
 * }
 * ```
 */
export async function getCurrentPrice(
  productId: string
): Promise<PriceOperationResult> {
  if (!productId) {
    return {
      success: false,
      error: 'Ürün ID gereklidir',
    }
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('current_prices')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: error.message || 'Fiyat alınamadı',
    }
  }

  return {
    success: true,
    data: data as CurrentPrice | null,
  }
}

/**
 * Get current prices for multiple products in a single query.
 *
 * Efficient batch operation for fetching prices for multiple products,
 * useful for menu display and product listings.
 *
 * @param productIds - Array of product UUIDs
 * @returns Promise<Map<string, CurrentPrice>> - Map of product ID to current price
 *
 * @example
 * ```typescript
 * const productIds = ['uuid1', 'uuid2', 'uuid3']
 * const prices = await getCurrentPricesBatch(productIds)
 * // Map { 'uuid1' => { price: 99.90, ... }, ... }
 * ```
 */
export async function getCurrentPricesBatch(
  productIds: string[]
): Promise<Map<string, CurrentPrice>> {
  const result = new Map<string, CurrentPrice>()

  if (!productIds || productIds.length === 0) {
    return result
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('current_prices')
    .select('*')
    .in('product_id', productIds)

  if (error || !data) {
    return result
  }

  for (const price of data) {
    result.set(price.product_id, price as CurrentPrice)
  }

  return result
}

/**
 * Get complete price history for a product.
 *
 * Returns all price ledger entries for a product, ordered by creation date.
 * Useful for compliance audits, price trend analysis, and dispute resolution.
 *
 * @param productId - The UUID of the product
 * @param options - Query options for pagination and filtering
 * @returns Promise<PriceHistoryResult> - Result with price history array
 *
 * @example
 * ```typescript
 * // Get full history
 * const history = await getPriceHistory(productId)
 *
 * // Get paginated history
 * const history = await getPriceHistory(productId, {
 *   limit: 10,
 *   offset: 0,
 *   order: 'desc'
 * })
 *
 * // Get history for specific date range
 * const history = await getPriceHistory(productId, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31')
 * })
 * ```
 */
export async function getPriceHistory(
  productId: string,
  options: PriceHistoryOptions = {}
): Promise<PriceHistoryResult> {
  if (!productId) {
    return {
      success: false,
      data: [],
      error: 'Ürün ID gereklidir',
    }
  }

  const { limit = 100, offset = 0, order = 'desc', startDate, endDate } = options

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('price_ledger')
    .select('*', { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  // Apply date filters if provided
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  const { data, error, count } = await query

  if (error) {
    return {
      success: false,
      data: [],
      error: error.message || 'Fiyat geçmişi alınamadı',
    }
  }

  return {
    success: true,
    data: (data as PriceLedgerEntry[]) || [],
    totalCount: count ?? undefined,
  }
}

/**
 * Get all price changes for an organization (across all products).
 *
 * Useful for organization-wide price audit reports and compliance exports.
 * Joins with products table to include organization_id filtering.
 *
 * @param organizationId - The UUID of the organization
 * @param options - Query options for pagination and filtering
 * @returns Promise<PriceHistoryResult> - Result with price history array
 *
 * @example
 * ```typescript
 * // Export all price changes for compliance report
 * const allPriceChanges = await getOrganizationPriceHistory(orgId, {
 *   startDate: new Date('2024-01-01'),
 *   order: 'asc'
 * })
 * ```
 */
export async function getOrganizationPriceHistory(
  organizationId: string,
  options: PriceHistoryOptions = {}
): Promise<PriceHistoryResult> {
  if (!organizationId) {
    return {
      success: false,
      data: [],
      error: 'Organizasyon ID gereklidir',
    }
  }

  const { limit = 100, offset = 0, order = 'desc', startDate, endDate } = options

  const supabase = await createServerSupabaseClient()

  // First, get all product IDs for this organization
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('organization_id', organizationId)

  if (productsError || !products || products.length === 0) {
    return {
      success: false,
      data: [],
      error: productsError?.message || 'Ürünler bulunamadı',
    }
  }

  const productIds = products.map((p) => p.id)

  // Then, get price history for all those products
  let query = supabase
    .from('price_ledger')
    .select('*', { count: 'exact' })
    .in('product_id', productIds)
    .order('created_at', { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  // Apply date filters if provided
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  const { data, error, count } = await query

  if (error) {
    return {
      success: false,
      data: [],
      error: error.message || 'Fiyat geçmişi alınamadı',
    }
  }

  return {
    success: true,
    data: (data as PriceLedgerEntry[]) || [],
    totalCount: count ?? undefined,
  }
}

/**
 * Check if a product has any price entries.
 *
 * Useful for validation before operations that require a price to exist.
 *
 * @param productId - The UUID of the product
 * @returns Promise<boolean> - true if product has at least one price entry
 *
 * @example
 * ```typescript
 * if (!await hasPrice(productId)) {
 *   await addPriceEntry(productId, defaultPrice, 'Initial price')
 * }
 * ```
 */
export async function hasPrice(productId: string): Promise<boolean> {
  const result = await getCurrentPrice(productId)
  return result.success && result.data !== null
}

/**
 * Calculate price change statistics for a product.
 *
 * Returns statistics about price changes including count, min, max,
 * and average prices. Useful for analytics and reporting.
 *
 * @param productId - The UUID of the product
 * @returns Promise with price statistics or null if no prices
 *
 * @example
 * ```typescript
 * const stats = await getPriceStatistics(productId)
 * if (stats) {
 *   console.log(`Price changed ${stats.changeCount} times`)
 *   console.log(`Range: ${stats.minPrice} - ${stats.maxPrice}`)
 * }
 * ```
 */
export async function getPriceStatistics(productId: string): Promise<{
  changeCount: number
  minPrice: number
  maxPrice: number
  averagePrice: number
  currentPrice: number
  firstPrice: number
  priceChange: number
  priceChangePercent: number
} | null> {
  if (!productId) {
    return null
  }

  const historyResult = await getPriceHistory(productId, { order: 'asc' })

  if (!historyResult.success || historyResult.data.length === 0) {
    return null
  }

  const prices = historyResult.data.map((entry) => entry.price)
  const firstPrice = prices[0]
  const currentPrice = prices[prices.length - 1]
  const priceChange = currentPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

  return {
    changeCount: prices.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    averagePrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    currentPrice,
    firstPrice,
    priceChange,
    priceChangePercent: Math.round(priceChangePercent * 100) / 100,
  }
}

/**
 * Export price ledger data for compliance reporting.
 *
 * Formats price history data for regulatory compliance exports
 * (Turkish Trade Ministry requirements).
 *
 * @param organizationId - The UUID of the organization
 * @param startDate - Start date for export range
 * @param endDate - End date for export range
 * @returns Promise with formatted export data
 *
 * @example
 * ```typescript
 * const exportData = await exportPriceLedgerForCompliance(
 *   orgId,
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31')
 * )
 * // Convert to CSV or JSON for regulatory submission
 * ```
 */
export async function exportPriceLedgerForCompliance(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean
  data: Array<{
    product_id: string
    price: number
    currency: string
    change_reason: string | null
    changed_by: string | null
    created_at: string
  }>
  error?: string
  exportedAt: string
  dateRange: { start: string; end: string }
}> {
  const result = await getOrganizationPriceHistory(organizationId, {
    startDate,
    endDate,
    order: 'asc',
    limit: 10000, // High limit for compliance exports
  })

  return {
    success: result.success,
    data: result.data.map((entry) => ({
      product_id: entry.product_id,
      price: entry.price,
      currency: entry.currency,
      change_reason: entry.change_reason,
      changed_by: entry.changed_by,
      created_at: entry.created_at,
    })),
    error: result.error,
    exportedAt: new Date().toISOString(),
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  }
}
