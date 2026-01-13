/**
 * Database types for Supabase tables
 * These types match the schema defined in spec.md
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * User roles for RBAC
 */
export type UserRole = 'owner' | 'admin' | 'manager' | 'waiter' | 'viewer'

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled'

/**
 * Table status for restaurant tables
 */
export type TableStatus = 'empty' | 'occupied' | 'service_needed'

/**
 * Service request status
 */
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'completed'

/**
 * Feature type for plan features
 */
export type FeatureType = 'boolean' | 'limit'

/**
 * Organization (Restaurant) entity
 */
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  settings: Json
  is_active: boolean
  created_at: string
}

/**
 * Organization member with RBAC role
 */
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  created_at: string
}

/**
 * Category for menu items
 */
export interface Category {
  id: string
  organization_id: string
  parent_id: string | null
  name: string
  slug: string
  sort_order: number
  is_visible: boolean
  created_at: string
}

/**
 * Product entity (NO price field - prices are in price_ledger)
 */
export interface Product {
  id: string
  organization_id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  allergens: string[] | null
  nutrition: Json | null
  is_visible: boolean
  created_at: string
}

/**
 * Price ledger entry (INSERT-ONLY, immutable)
 */
export interface PriceLedgerEntry {
  id: string
  product_id: string
  price: number
  currency: string
  change_reason: string | null
  changed_by: string | null
  created_at: string
}

/**
 * Current price view (latest price per product)
 */
export interface CurrentPrice {
  product_id: string
  price: number
  currency: string
  created_at: string
}

/**
 * Feature definition in the catalog
 */
export interface Feature {
  id: string
  key: string
  name: string
  description: string | null
  type: FeatureType
  created_at: string
}

/**
 * Subscription plan
 */
export interface Plan {
  id: string
  name: string
  price_monthly: number | null
  is_active: boolean
  sort_order: number
}

/**
 * Plan feature assignment
 */
export interface PlanFeature {
  plan_id: string
  feature_id: string
  value_boolean: boolean | null
  value_limit: number | null
}

/**
 * Organization subscription
 */
export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  valid_until: string | null
  created_at: string
}

/**
 * Feature override for specific organization (ABAC)
 */
export interface OrganizationFeatureOverride {
  organization_id: string
  feature_key: string
  override_value: boolean
  expires_at: string | null
  created_at: string
}

/**
 * Organization features view (joined from subscription + plan + features)
 */
export interface OrganizationFeature {
  organization_id: string
  feature_key: string
  feature_type: FeatureType
  value_boolean: boolean | null
  value_limit: number | null
}

/**
 * Menu snapshot for compliance
 */
export interface MenuSnapshot {
  id: string
  organization_id: string
  snapshot_data: Json
  hash: string
  version: number
  created_at: string
}

/**
 * Restaurant table with QR code
 */
export interface RestaurantTable {
  id: string
  organization_id: string
  table_number: string
  qr_uuid: string
  current_status: TableStatus | null
  last_ping_at: string | null
}

/**
 * Service request (waiter call)
 */
export interface ServiceRequest {
  id: string
  organization_id: string
  table_id: string
  request_type: string
  status: ServiceRequestStatus
  created_at: string
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string
  organization_id: string | null
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_data: Json | null
  new_data: Json | null
  created_at: string
}

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Organization, 'id'>>
      }
      organization_members: {
        Row: OrganizationMember
        Insert: Omit<OrganizationMember, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<OrganizationMember, 'id'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Category, 'id'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Product, 'id'>>
      }
      price_ledger: {
        Row: PriceLedgerEntry
        Insert: Omit<PriceLedgerEntry, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        // UPDATE not allowed on price_ledger
        Update: never
      }
      features: {
        Row: Feature
        Insert: Omit<Feature, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Feature, 'id'>>
      }
      plans: {
        Row: Plan
        Insert: Omit<Plan, 'id'> & { id?: string }
        Update: Partial<Omit<Plan, 'id'>>
      }
      plan_features: {
        Row: PlanFeature
        Insert: PlanFeature
        Update: Partial<PlanFeature>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Subscription, 'id'>>
      }
      organization_feature_overrides: {
        Row: OrganizationFeatureOverride
        Insert: Omit<OrganizationFeatureOverride, 'created_at'> & {
          created_at?: string
        }
        Update: Partial<OrganizationFeatureOverride>
      }
      menu_snapshots: {
        Row: MenuSnapshot
        Insert: Omit<MenuSnapshot, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<MenuSnapshot, 'id'>>
      }
      restaurant_tables: {
        Row: RestaurantTable
        Insert: Omit<RestaurantTable, 'id'> & { id?: string }
        Update: Partial<Omit<RestaurantTable, 'id'>>
      }
      service_requests: {
        Row: ServiceRequest
        Insert: Omit<ServiceRequest, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<ServiceRequest, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<AuditLog, 'id'>>
      }
    }
    Views: {
      current_prices: {
        Row: CurrentPrice
      }
      v_organization_features: {
        Row: OrganizationFeature
      }
    }
    Functions: {
      // Define any RPC functions here as needed
    }
    Enums: {
      user_role: UserRole
      subscription_status: SubscriptionStatus
      table_status: TableStatus
      service_request_status: ServiceRequestStatus
      feature_type: FeatureType
    }
  }
}
