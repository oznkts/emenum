/**
 * Central type exports for the application
 *
 * Import types from this file:
 * import type { Organization, Product, UserRole } from '@/types'
 */

// Database types
export type {
  Json,
  UserRole,
  SubscriptionStatus,
  TableStatus,
  ServiceRequestStatus,
  FeatureType,
  Organization,
  OrganizationMember,
  Category,
  Product,
  PriceLedgerEntry,
  CurrentPrice,
  Feature,
  Plan,
  PlanFeature,
  Subscription,
  OrganizationFeatureOverride,
  OrganizationFeature,
  MenuSnapshot,
  RestaurantTable,
  ServiceRequest,
  AuditLog,
  Database,
} from './database'

/**
 * API response wrapper type
 */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number
  limit: number
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'
  value: string | number | boolean | string[] | number[]
}

/**
 * Session user with organization context
 */
export interface SessionUser {
  id: string
  email: string
  organizationId: string | null
  role: import('./database').UserRole | null
}

/**
 * Menu builder component types
 */
export type MenuComponentType =
  | 'category'
  | 'product'
  | 'divider'
  | 'header'
  | 'footer'
  | 'banner'

/**
 * Menu builder component configuration
 */
export interface MenuComponent {
  id: string
  type: MenuComponentType
  props: Record<string, unknown>
  children?: MenuComponent[]
}

/**
 * Theme configuration for public menu
 */
export interface MenuTheme {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
  borderRadius: number
  spacing: number
}

/**
 * QR code generation options
 */
export interface QRCodeOptions {
  format: 'svg' | 'png'
  size?: 1024 | 2048 | 4096
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'
  includeTableId?: string
}

/**
 * QR code download format
 */
export type QRDownloadFormat = 'svg' | 'png-1024' | 'png-2048' | 'png-4096' | 'pdf-a5'
