-- Migration: 001_core_tables
-- Description: Create core tables for organizations and organization members (RBAC)
-- Created: 2026-01-13

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
-- Organizations represent restaurants/cafes/establishments in the multi-tenant system.
-- Each organization has a unique slug used for public menu URLs (/menu/[slug])

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster slug lookups (public menu pages use slug to find organization)
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Index for filtering active organizations
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE organizations IS 'Multi-tenant organizations (restaurants, cafes, etc.)';
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier for public menu access (/menu/[slug])';
COMMENT ON COLUMN organizations.settings IS 'JSON configuration for theme, display options, etc.';
COMMENT ON COLUMN organizations.is_active IS 'Must be activated by super admin before organization is publicly accessible';


-- ============================================================================
-- ORGANIZATION MEMBERS TABLE (RBAC)
-- ============================================================================
-- Organization members define which users belong to which organization
-- and their role within that organization (owner, admin, manager, waiter, viewer)

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'waiter', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Index for finding all organizations a user belongs to
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);

-- Index for finding all members of an organization
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE organization_members IS 'RBAC: Maps users to organizations with role-based access';
COMMENT ON COLUMN organization_members.role IS 'Role hierarchy: owner > admin > manager > waiter > viewer';
COMMENT ON COLUMN organization_members.organization_id IS 'FK to organizations table';
COMMENT ON COLUMN organization_members.user_id IS 'FK to Supabase auth.users table';
-- Migration: 002_products_price_ledger
-- Description: Create categories, products, and immutable price_ledger tables
-- Created: 2026-01-13
--
-- IMPORTANT: Price ledger is INSERT-ONLY for Turkish Trade Ministry compliance.
-- UPDATE and DELETE operations are blocked by database trigger.

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
-- Categories organize products in a hierarchical taxonomy structure.
-- Parent-child relationships enable nested category trees.

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, slug)
);

-- Index for finding all categories of an organization
CREATE INDEX idx_categories_organization_id ON categories(organization_id);

-- Index for parent-child lookups (category tree traversal)
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Index for sorting categories within an organization
CREATE INDEX idx_categories_sort_order ON categories(organization_id, sort_order);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE categories IS 'Hierarchical product categories for menu organization';
COMMENT ON COLUMN categories.organization_id IS 'FK to organizations - tenant isolation';
COMMENT ON COLUMN categories.parent_id IS 'Self-referential FK for nested categories (null = root category)';
COMMENT ON COLUMN categories.slug IS 'URL-safe identifier, unique per organization';
COMMENT ON COLUMN categories.sort_order IS 'Display order within parent category (lower = first)';
COMMENT ON COLUMN categories.is_visible IS 'Whether category is shown on public menu';


-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================
-- Products represent menu items. IMPORTANT: Price is NOT stored here.
-- All prices are stored in the immutable price_ledger table for compliance.

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    allergens TEXT[] DEFAULT '{}',
    nutrition JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    sort_order INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding all products of an organization
CREATE INDEX idx_products_organization_id ON products(organization_id);

-- Index for finding products by category
CREATE INDEX idx_products_category_id ON products(category_id);

-- Index for filtering visible/available products
CREATE INDEX idx_products_visibility ON products(organization_id, is_visible, is_available);

-- Index for sorting products
CREATE INDEX idx_products_sort_order ON products(organization_id, category_id, sort_order);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE products IS 'Menu items - NOTE: Prices are in price_ledger, NOT here';
COMMENT ON COLUMN products.organization_id IS 'FK to organizations - tenant isolation';
COMMENT ON COLUMN products.category_id IS 'FK to categories - product grouping';
COMMENT ON COLUMN products.allergens IS 'Array of allergen codes (e.g., gluten, dairy, nuts)';
COMMENT ON COLUMN products.nutrition IS 'JSON nutritional information (calories, protein, etc.)';
COMMENT ON COLUMN products.tags IS 'Array of tags (e.g., vegan, spicy, chef_recommendation)';
COMMENT ON COLUMN products.is_visible IS 'Whether product is shown on public menu';
COMMENT ON COLUMN products.is_available IS 'Whether product is currently available for ordering';


-- ============================================================================
-- PRICE LEDGER TABLE (IMMUTABLE - INSERT ONLY)
-- ============================================================================
-- This table stores ALL price history for regulatory compliance.
-- Turkish Trade Ministry requires immutable audit trail for pricing.
-- UPDATE and DELETE are BLOCKED by database trigger.

CREATE TABLE price_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'TRY',
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding price history of a product
CREATE INDEX idx_price_ledger_product_id ON price_ledger(product_id);

-- Index for finding latest price (used by current_prices view)
CREATE INDEX idx_price_ledger_product_created ON price_ledger(product_id, created_at DESC);

-- Index for audit queries by user
CREATE INDEX idx_price_ledger_changed_by ON price_ledger(changed_by);

-- Index for time-based audit queries
CREATE INDEX idx_price_ledger_created_at ON price_ledger(created_at);

-- Add comments for documentation
COMMENT ON TABLE price_ledger IS 'IMMUTABLE price history - INSERT only, UPDATE/DELETE blocked by trigger';
COMMENT ON COLUMN price_ledger.product_id IS 'FK to products - which product this price is for';
COMMENT ON COLUMN price_ledger.price IS 'Price amount in specified currency';
COMMENT ON COLUMN price_ledger.currency IS 'ISO 4217 currency code (default TRY for Turkish Lira)';
COMMENT ON COLUMN price_ledger.change_reason IS 'Reason for price change (for audit purposes)';
COMMENT ON COLUMN price_ledger.changed_by IS 'FK to auth.users - who made this price change';


-- ============================================================================
-- IMMUTABILITY TRIGGER FOR PRICE LEDGER
-- ============================================================================
-- This trigger BLOCKS any UPDATE or DELETE operation on price_ledger.
-- This is a regulatory compliance requirement - prices must be append-only.

CREATE OR REPLACE FUNCTION prevent_price_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'UPDATE and DELETE are not allowed on price_ledger. This table is immutable for regulatory compliance.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_ledger_immutable
    BEFORE UPDATE OR DELETE ON price_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_price_modification();

-- Add comment for documentation
COMMENT ON FUNCTION prevent_price_modification() IS 'Blocks UPDATE/DELETE on price_ledger for regulatory compliance';
COMMENT ON TRIGGER price_ledger_immutable ON price_ledger IS 'Enforces immutability of price_ledger table';

-- Migration: 003_package_management
-- Description: Create dynamic package management tables for feature-based licensing
-- Created: 2026-01-13
--
-- This implements a "Feature Flagging" based licensing model where:
-- 1. Features define system capabilities (boolean or limit-based)
-- 2. Plans bundle features together (Lite, Pro, Premium, etc.)
-- 3. Subscriptions link organizations to plans
-- 4. Overrides allow per-tenant exceptions (ABAC layer)
--
-- IMPORTANT: No hard-coded plan checks in application code!
-- All permission checks must query these tables dynamically.

-- ============================================================================
-- FEATURES TABLE (System Capabilities Catalog)
-- ============================================================================
-- Features define the smallest units of system capability.
-- Type can be 'boolean' (enabled/disabled) or 'limit' (numeric value).
-- Examples: 'module_waiter_call' (boolean), 'limit_menu_items' (limit of 50)

CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('boolean', 'limit')),
    category TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for looking up features by key (used in permission checks)
CREATE INDEX idx_features_key ON features(key);

-- Index for grouping features by category in admin UI
CREATE INDEX idx_features_category ON features(category);

-- Index for sorting features in admin UI
CREATE INDEX idx_features_sort_order ON features(sort_order);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER features_updated_at
    BEFORE UPDATE ON features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE features IS 'System capabilities catalog - defines all licensable features';
COMMENT ON COLUMN features.key IS 'Unique identifier used in code (e.g., module_waiter_call, limit_products)';
COMMENT ON COLUMN features.name IS 'Human-readable feature name for admin UI';
COMMENT ON COLUMN features.description IS 'Detailed description of what this feature enables';
COMMENT ON COLUMN features.type IS 'boolean = on/off feature, limit = numeric limit (e.g., max products)';
COMMENT ON COLUMN features.category IS 'Feature grouping for admin UI (e.g., core, modules, limits)';
COMMENT ON COLUMN features.sort_order IS 'Display order within category in admin UI';


-- ============================================================================
-- PLANS TABLE (Package Definitions)
-- ============================================================================
-- Plans are bundles of features that can be assigned to organizations.
-- New plans can be created via Super Admin panel without code changes.
-- Examples: Free, Lite, Pro, Gold, Platinum, Enterprise

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency TEXT NOT NULL DEFAULT 'TRY',
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    features_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for filtering active plans
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- Index for public plans shown on pricing page
CREATE INDEX idx_plans_public ON plans(is_active, is_public, sort_order);

-- Index for sorting plans in UI
CREATE INDEX idx_plans_sort_order ON plans(sort_order);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE plans IS 'Subscription plans/packages - can be created dynamically via admin';
COMMENT ON COLUMN plans.name IS 'Plan display name (e.g., Lite, Pro, Enterprise)';
COMMENT ON COLUMN plans.description IS 'Plan description for marketing pages';
COMMENT ON COLUMN plans.price_monthly IS 'Monthly subscription price (null = contact sales)';
COMMENT ON COLUMN plans.price_yearly IS 'Yearly subscription price with discount';
COMMENT ON COLUMN plans.currency IS 'ISO 4217 currency code (default TRY for Turkish Lira)';
COMMENT ON COLUMN plans.is_active IS 'Whether plan is currently available for new subscriptions';
COMMENT ON COLUMN plans.is_public IS 'Whether plan is shown on public pricing page';
COMMENT ON COLUMN plans.features_summary IS 'Marketing summary of included features';


-- ============================================================================
-- PLAN_FEATURES TABLE (Plan-Feature Mapping)
-- ============================================================================
-- Maps which features are included in each plan and with what values.
-- For boolean features, value_boolean indicates if feature is enabled.
-- For limit features, value_limit indicates the numeric limit.

CREATE TABLE plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    value_boolean BOOLEAN,
    value_limit INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(plan_id, feature_id)
);

-- Index for finding all features of a plan
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);

-- Index for finding all plans that include a specific feature
CREATE INDEX idx_plan_features_feature_id ON plan_features(feature_id);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER plan_features_updated_at
    BEFORE UPDATE ON plan_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE plan_features IS 'Maps features to plans with their values';
COMMENT ON COLUMN plan_features.plan_id IS 'FK to plans - which plan this mapping belongs to';
COMMENT ON COLUMN plan_features.feature_id IS 'FK to features - which feature is being mapped';
COMMENT ON COLUMN plan_features.value_boolean IS 'For boolean features: true=enabled, false=disabled';
COMMENT ON COLUMN plan_features.value_limit IS 'For limit features: the numeric limit value';


-- ============================================================================
-- SUBSCRIPTIONS TABLE (Organization Plans)
-- ============================================================================
-- Links organizations to their current subscription plan.
-- An organization can have only one active subscription at a time.
-- Status tracks payment/validity state.

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding subscription by organization (most common query)
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);

-- Index for finding active subscriptions
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Index for finding subscriptions by plan (admin analytics)
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);

-- Index for finding expiring subscriptions
CREATE INDEX idx_subscriptions_valid_until ON subscriptions(valid_until);

-- Composite index for permission checks (org + active status)
CREATE INDEX idx_subscriptions_org_active ON subscriptions(organization_id, status)
    WHERE status = 'active';

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE subscriptions IS 'Organization subscription records - links orgs to plans';
COMMENT ON COLUMN subscriptions.organization_id IS 'FK to organizations - which org owns this subscription';
COMMENT ON COLUMN subscriptions.plan_id IS 'FK to plans - which plan is subscribed to';
COMMENT ON COLUMN subscriptions.status IS 'Subscription state: active, past_due, cancelled, trialing, paused';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'monthly or yearly billing';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN subscriptions.valid_until IS 'Subscription expiration date (for EFT/manual payments)';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'When subscription was cancelled (if applicable)';
COMMENT ON COLUMN subscriptions.cancellation_reason IS 'Reason for cancellation (for analytics)';


-- ============================================================================
-- ORGANIZATION_FEATURE_OVERRIDES TABLE (ABAC Exceptions)
-- ============================================================================
-- Allows per-organization feature overrides outside of their plan.
-- This implements ABAC (Attribute-Based Access Control) layer on top of RBAC.
-- Use cases: Trial features, custom deals, temporary promotions.
-- Overrides take precedence over plan features in permission checks.

CREATE TABLE organization_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    override_value BOOLEAN NOT NULL,
    value_limit INT,
    reason TEXT,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, feature_id)
);

-- Index for finding all overrides for an organization (permission checks)
CREATE INDEX idx_feature_overrides_organization_id ON organization_feature_overrides(organization_id);

-- Index for finding non-expired overrides
CREATE INDEX idx_feature_overrides_expires_at ON organization_feature_overrides(expires_at);

-- Index for finding overrides by feature (admin analytics)
CREATE INDEX idx_feature_overrides_feature_id ON organization_feature_overrides(feature_id);

-- Composite index for permission check query
CREATE INDEX idx_feature_overrides_org_feature ON organization_feature_overrides(organization_id, feature_id);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER organization_feature_overrides_updated_at
    BEFORE UPDATE ON organization_feature_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE organization_feature_overrides IS 'ABAC layer - per-org feature exceptions outside their plan';
COMMENT ON COLUMN organization_feature_overrides.organization_id IS 'FK to organizations - which org this override applies to';
COMMENT ON COLUMN organization_feature_overrides.feature_id IS 'FK to features - which feature is being overridden';
COMMENT ON COLUMN organization_feature_overrides.override_value IS 'true=grant feature, false=revoke feature (even if plan has it)';
COMMENT ON COLUMN organization_feature_overrides.value_limit IS 'Override numeric limit for limit-type features';
COMMENT ON COLUMN organization_feature_overrides.reason IS 'Why this override was granted (for audit)';
COMMENT ON COLUMN organization_feature_overrides.granted_by IS 'FK to auth.users - who granted this override';
COMMENT ON COLUMN organization_feature_overrides.expires_at IS 'When override expires (null = permanent until manually removed)';

-- Migration: 004_tables_service_requests
-- Description: Create restaurant_tables and service_requests tables for waiter call feature
-- Created: 2026-01-13
--
-- This implements the table-based QR and smart waiter call system:
-- 1. restaurant_tables: Define physical tables with unique QR UUIDs
-- 2. service_requests: Track waiter call requests for realtime notifications
--
-- QR Security: Uses UUIDs instead of sequential IDs to prevent guessing
-- Spam Prevention: last_ping_at column prevents rapid repeated calls

-- ============================================================================
-- RESTAURANT_TABLES TABLE
-- ============================================================================
-- Represents physical tables at each organization/restaurant.
-- Each table has a unique qr_uuid used in QR codes for identification.
-- URL format: app.menu.com/[slug]?table_id=[qr_uuid]

CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    qr_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    current_status TEXT NOT NULL DEFAULT 'empty' CHECK (current_status IN ('empty', 'occupied', 'service_needed')),
    last_ping_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, table_number)
);

-- Index for looking up tables by organization
CREATE INDEX idx_restaurant_tables_organization_id ON restaurant_tables(organization_id);

-- Index for QR UUID lookups (used when customer scans QR code)
CREATE INDEX idx_restaurant_tables_qr_uuid ON restaurant_tables(qr_uuid);

-- Index for filtering active tables
CREATE INDEX idx_restaurant_tables_is_active ON restaurant_tables(is_active);

-- Index for finding tables needing service
CREATE INDEX idx_restaurant_tables_status ON restaurant_tables(current_status)
    WHERE current_status = 'service_needed';

-- Composite index for organization table lookups
CREATE INDEX idx_restaurant_tables_org_active ON restaurant_tables(organization_id, is_active)
    WHERE is_active = true;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER restaurant_tables_updated_at
    BEFORE UPDATE ON restaurant_tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE restaurant_tables IS 'Physical tables at restaurants with unique QR identifiers';
COMMENT ON COLUMN restaurant_tables.organization_id IS 'FK to organizations - which restaurant this table belongs to';
COMMENT ON COLUMN restaurant_tables.table_number IS 'Human-readable table identifier (e.g., "Bahce-1", "Teras-5", "A12")';
COMMENT ON COLUMN restaurant_tables.qr_uuid IS 'Unique UUID for QR code URL - never use sequential IDs for security';
COMMENT ON COLUMN restaurant_tables.current_status IS 'empty=no customer, occupied=customer present, service_needed=waiter called';
COMMENT ON COLUMN restaurant_tables.last_ping_at IS 'Last waiter call timestamp - used for spam prevention (e.g., 30s cooldown)';
COMMENT ON COLUMN restaurant_tables.is_active IS 'Whether table is active and accepting orders';


-- ============================================================================
-- SERVICE_REQUESTS TABLE (Waiter Call Requests)
-- ============================================================================
-- Records waiter call requests from customers.
-- Used with Supabase Realtime for instant notifications to waiters.
-- Waiters subscribe to INSERT events on this table for their organization.

CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL DEFAULT 'waiter_call' CHECK (request_type IN ('waiter_call', 'bill_request', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
    notes TEXT,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding requests by organization (realtime subscription filter)
CREATE INDEX idx_service_requests_organization_id ON service_requests(organization_id);

-- Index for finding requests by table
CREATE INDEX idx_service_requests_table_id ON service_requests(table_id);

-- Index for filtering pending requests (waiter dashboard)
CREATE INDEX idx_service_requests_status ON service_requests(status);

-- Index for recent requests (default sort by newest)
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at DESC);

-- Composite index for organization pending requests (most common query)
CREATE INDEX idx_service_requests_org_pending ON service_requests(organization_id, status, created_at DESC)
    WHERE status = 'pending';

-- Composite index for organization realtime subscription
CREATE INDEX idx_service_requests_org_created ON service_requests(organization_id, created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER service_requests_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE service_requests IS 'Waiter call requests - use with Supabase Realtime for instant notifications';
COMMENT ON COLUMN service_requests.organization_id IS 'FK to organizations - for RLS and realtime subscription filtering';
COMMENT ON COLUMN service_requests.table_id IS 'FK to restaurant_tables - which table made the request';
COMMENT ON COLUMN service_requests.request_type IS 'waiter_call=general call, bill_request=wants to pay, other=special request';
COMMENT ON COLUMN service_requests.status IS 'pending=new, acknowledged=waiter saw it, completed=handled, cancelled=dismissed';
COMMENT ON COLUMN service_requests.notes IS 'Optional message from customer (e.g., "Need more napkins")';
COMMENT ON COLUMN service_requests.acknowledged_at IS 'When waiter acknowledged the request';
COMMENT ON COLUMN service_requests.acknowledged_by IS 'FK to auth.users - which waiter acknowledged';
COMMENT ON COLUMN service_requests.completed_at IS 'When request was fully handled';
COMMENT ON COLUMN service_requests.completed_by IS 'FK to auth.users - who completed the request';

-- Migration: 005_audit_compliance
-- Description: Create audit and compliance tables for menu snapshots and audit logging
-- Created: 2026-01-13
--
-- This implements the compliance and audit trail system required by Turkish Trade Ministry:
-- 1. menu_snapshots: Immutable menu snapshots with SHA-256 hash verification
-- 2. audit_logs: Complete audit trail for all entity changes
--
-- Menu Publishing: Each publish creates a versioned snapshot with cryptographic hash
-- Audit Trail: All changes to entities are logged with before/after state

-- ============================================================================
-- MENU_SNAPSHOTS TABLE
-- ============================================================================
-- Stores immutable snapshots of published menus for regulatory compliance.
-- Each snapshot includes the complete menu state and a SHA-256 hash for verification.
-- Snapshots are never modified - they serve as proof of menu state at a point in time.

CREATE TABLE menu_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    snapshot_data JSONB NOT NULL,
    hash TEXT NOT NULL,
    version INT NOT NULL,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding snapshots by organization
CREATE INDEX idx_menu_snapshots_organization_id ON menu_snapshots(organization_id);

-- Index for finding snapshots by hash (verification lookups)
CREATE INDEX idx_menu_snapshots_hash ON menu_snapshots(hash);

-- Index for finding current snapshot per organization
CREATE INDEX idx_menu_snapshots_current ON menu_snapshots(organization_id, is_current)
    WHERE is_current = true;

-- Index for version ordering within organization
CREATE INDEX idx_menu_snapshots_org_version ON menu_snapshots(organization_id, version DESC);

-- Index for recent snapshots (audit trail)
CREATE INDEX idx_menu_snapshots_created_at ON menu_snapshots(created_at DESC);

-- Composite index for organization snapshot history queries
CREATE INDEX idx_menu_snapshots_org_created ON menu_snapshots(organization_id, created_at DESC);

-- Ensure only one current snapshot per organization
CREATE UNIQUE INDEX idx_menu_snapshots_unique_current
    ON menu_snapshots(organization_id)
    WHERE is_current = true;

-- Add comments for documentation
COMMENT ON TABLE menu_snapshots IS 'Immutable menu snapshots for regulatory compliance with SHA-256 hash verification';
COMMENT ON COLUMN menu_snapshots.organization_id IS 'FK to organizations - which restaurant published this menu';
COMMENT ON COLUMN menu_snapshots.snapshot_data IS 'Complete JSON representation of menu state (categories, products, prices)';
COMMENT ON COLUMN menu_snapshots.hash IS 'SHA-256 hash of snapshot_data for integrity verification';
COMMENT ON COLUMN menu_snapshots.version IS 'Incrementing version number for this organization';
COMMENT ON COLUMN menu_snapshots.published_by IS 'FK to auth.users - who published this version';
COMMENT ON COLUMN menu_snapshots.notes IS 'Optional release notes or change description';
COMMENT ON COLUMN menu_snapshots.is_current IS 'Whether this is the currently active published menu';
COMMENT ON COLUMN menu_snapshots.created_at IS 'When this snapshot was created/published';


-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
-- Comprehensive audit trail for all entity modifications.
-- Records who changed what, when, and captures before/after state.
-- Used for regulatory compliance, debugging, and accountability.
-- This table is insert-only by design - audit records should never be modified.

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'login', 'logout', 'impersonate', 'activate', 'deactivate', 'plan_change', 'override_add', 'override_remove', 'export', 'import', 'price_change')),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding audit logs by organization
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);

-- Index for finding audit logs by user
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Index for filtering by action type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index for filtering by entity type
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Index for finding logs for specific entity
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Index for chronological ordering (most common access pattern)
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for organization audit trail queries
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);

-- Composite index for entity history queries
CREATE INDEX idx_audit_logs_entity_history ON audit_logs(entity_type, entity_id, created_at DESC);

-- Composite index for user activity queries
CREATE INDEX idx_audit_logs_user_activity ON audit_logs(user_id, created_at DESC);

-- Composite index for organization action filtering
CREATE INDEX idx_audit_logs_org_action ON audit_logs(organization_id, action, created_at DESC);

-- Trigger to prevent modification of audit logs (insert-only)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'UPDATE and DELETE are not allowed on audit_logs - audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all entity changes - insert-only by design';
COMMENT ON COLUMN audit_logs.organization_id IS 'FK to organizations - NULL for super admin actions or system events';
COMMENT ON COLUMN audit_logs.user_id IS 'FK to auth.users - who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: create, update, delete, publish, login, logout, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected: product, category, organization, subscription, etc.';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the affected entity (if applicable)';
COMMENT ON COLUMN audit_logs.old_data IS 'JSON snapshot of entity state before change (NULL for create)';
COMMENT ON COLUMN audit_logs.new_data IS 'JSON snapshot of entity state after change (NULL for delete)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address for security auditing';
COMMENT ON COLUMN audit_logs.user_agent IS 'Client user agent string for debugging';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context-specific data for the audit entry';
COMMENT ON COLUMN audit_logs.created_at IS 'When this audit event occurred';
-- Migration: 006_views
-- Description: Create database views for current prices and organization features
-- Created: 2026-01-13
--
-- Views provide optimized, denormalized access to commonly queried data:
-- 1. current_prices - Latest price per product from immutable price_ledger
-- 2. v_organization_features - Organization feature access from subscription plan

-- ============================================================================
-- CURRENT_PRICES VIEW
-- ============================================================================
-- Provides the current (most recent) price for each product.
-- Since price_ledger is immutable (append-only), we need this view to get
-- the latest price entry for each product without complex queries.
--
-- Usage: SELECT * FROM current_prices WHERE product_id = 'uuid'
-- Join with products: SELECT p.*, cp.price FROM products p JOIN current_prices cp ON cp.product_id = p.id

CREATE VIEW current_prices AS
SELECT DISTINCT ON (product_id)
    product_id,
    price,
    currency,
    change_reason,
    changed_by,
    created_at AS effective_from
FROM price_ledger
ORDER BY product_id, created_at DESC;

-- Add comment for documentation
COMMENT ON VIEW current_prices IS 'Latest price per product from immutable price_ledger';


-- ============================================================================
-- V_ORGANIZATION_FEATURES VIEW
-- ============================================================================
-- Provides a unified view of all features available to an organization.
-- Joins subscriptions with plan_features and features to enable easy
-- permission checking without complex joins in application code.
--
-- Usage:
--   SELECT * FROM v_organization_features WHERE organization_id = 'uuid' AND feature_key = 'module_waiter_call'
--
-- IMPORTANT: This view only shows features from the plan.
-- The permission guard must also check organization_feature_overrides for exceptions.

CREATE VIEW v_organization_features AS
SELECT
    s.organization_id,
    f.key AS feature_key,
    f.name AS feature_name,
    f.type AS feature_type,
    pf.value_boolean,
    pf.value_limit,
    s.status AS subscription_status,
    s.valid_until AS subscription_valid_until,
    p.id AS plan_id,
    p.name AS plan_name
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
JOIN plan_features pf ON pf.plan_id = s.plan_id
JOIN features f ON f.id = pf.feature_id
WHERE s.status = 'active';

-- Add comment for documentation
COMMENT ON VIEW v_organization_features IS 'Organization feature access based on active subscription plan - check overrides table separately for exceptions';

-- Migration: 007_rls_policies
-- Description: Create Row Level Security (RLS) policies for all tenant-scoped tables
-- Created: 2026-01-13
--
-- RLS implements multi-tenant isolation at the database level.
-- All tenant-specific queries are automatically filtered by organization membership.
-- Key principle: auth.uid() identifies the current user, organization_members maps users to orgs.
--
-- IMPORTANT: Without proper RLS, Tenant A could access Tenant B's data!
-- Test thoroughly: Tenant isolation must work even with direct API calls.

-- ============================================================================
-- ENABLE RLS ON ALL TENANT-SCOPED TABLES
-- ============================================================================
-- RLS must be enabled before policies take effect.
-- Once enabled, queries return NO data unless a policy grants access.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- HELPER FUNCTION: Check if user is member of organization
-- ============================================================================
-- Reusable function for RLS policies to check organization membership.
-- Returns TRUE if user belongs to the given organization.

CREATE OR REPLACE FUNCTION auth.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_org_member(UUID) IS 'Check if current user is a member of the given organization';


-- ============================================================================
-- HELPER FUNCTION: Get all organization IDs for current user
-- ============================================================================
-- Returns set of organization_ids the current user belongs to.
-- Used in RLS policies for efficient membership filtering.

CREATE OR REPLACE FUNCTION auth.user_org_ids()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.user_org_ids() IS 'Get all organization IDs the current user belongs to';


-- ============================================================================
-- POLICY 1: ORGANIZATIONS - SELECT
-- ============================================================================
-- Users can only view organizations they are members of.
-- Public menu pages bypass RLS via service role key.

CREATE POLICY "Users can view own organizations"
ON organizations FOR SELECT
USING (
    id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can view own organizations" ON organizations
IS 'Users can only see organizations they belong to';


-- ============================================================================
-- POLICY 2: ORGANIZATION_MEMBERS - SELECT
-- ============================================================================
-- Users can view membership records for organizations they belong to.
-- This allows seeing who else is in their organization (for team management).

CREATE POLICY "Users can view members of their organizations"
ON organization_members FOR SELECT
USING (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can view members of their organizations" ON organization_members
IS 'Users can see all members of organizations they belong to';


-- ============================================================================
-- POLICY 3: CATEGORIES - ALL OPERATIONS
-- ============================================================================
-- Users can manage categories for organizations they belong to.
-- Combines SELECT, INSERT, UPDATE, DELETE into one policy for simplicity.

CREATE POLICY "Users can manage categories in their organizations"
ON categories FOR ALL
USING (
    organization_id IN (SELECT auth.user_org_ids())
)
WITH CHECK (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can manage categories in their organizations" ON categories
IS 'Full CRUD access to categories for organization members';


-- ============================================================================
-- POLICY 4: PRODUCTS - ALL OPERATIONS
-- ============================================================================
-- Users can manage products for organizations they belong to.
-- Note: Price changes go to price_ledger, not products table.

CREATE POLICY "Users can manage products in their organizations"
ON products FOR ALL
USING (
    organization_id IN (SELECT auth.user_org_ids())
)
WITH CHECK (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can manage products in their organizations" ON products
IS 'Full CRUD access to products for organization members';


-- ============================================================================
-- POLICY 5: PRICE_LEDGER - SELECT AND INSERT ONLY
-- ============================================================================
-- Users can view and add price entries for products in their organizations.
-- UPDATE and DELETE are blocked at trigger level (immutability).
-- This policy adds tenant isolation on top of immutability.

CREATE POLICY "Users can view and add prices in their organizations"
ON price_ledger FOR ALL
USING (
    product_id IN (
        SELECT id FROM products
        WHERE organization_id IN (SELECT auth.user_org_ids())
    )
)
WITH CHECK (
    product_id IN (
        SELECT id FROM products
        WHERE organization_id IN (SELECT auth.user_org_ids())
    )
);

COMMENT ON POLICY "Users can view and add prices in their organizations" ON price_ledger
IS 'View and insert price entries for products in member organizations (UPDATE/DELETE blocked by trigger)';


-- ============================================================================
-- POLICY 6: RESTAURANT_TABLES - ALL OPERATIONS
-- ============================================================================
-- Users can manage tables for organizations they belong to.
-- Table QR codes contain qr_uuid which is used for public table identification.

CREATE POLICY "Users can manage tables in their organizations"
ON restaurant_tables FOR ALL
USING (
    organization_id IN (SELECT auth.user_org_ids())
)
WITH CHECK (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can manage tables in their organizations" ON restaurant_tables
IS 'Full CRUD access to restaurant tables for organization members';


-- ============================================================================
-- POLICY 7: SERVICE_REQUESTS - ALL OPERATIONS
-- ============================================================================
-- Users can view and manage service requests for their organizations.
-- Waiters need to see all requests, acknowledge and complete them.
-- Customers create requests via public API (service role bypasses RLS).

CREATE POLICY "Users can manage service requests in their organizations"
ON service_requests FOR ALL
USING (
    organization_id IN (SELECT auth.user_org_ids())
)
WITH CHECK (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can manage service requests in their organizations" ON service_requests
IS 'Full CRUD access to service requests for organization members';


-- ============================================================================
-- POLICY 8: MENU_SNAPSHOTS - ALL OPERATIONS
-- ============================================================================
-- Users can view and create menu snapshots for their organizations.
-- Snapshots are created on publish and are immutable (append-only).

CREATE POLICY "Users can manage menu snapshots in their organizations"
ON menu_snapshots FOR ALL
USING (
    organization_id IN (SELECT auth.user_org_ids())
)
WITH CHECK (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can manage menu snapshots in their organizations" ON menu_snapshots
IS 'Full CRUD access to menu snapshots for organization members';


-- ============================================================================
-- POLICY 9: AUDIT_LOGS - SELECT ONLY
-- ============================================================================
-- Users can view audit logs for their organizations.
-- INSERT is done via service role (bypass RLS) from server-side code.
-- UPDATE and DELETE are blocked by trigger (immutability).

CREATE POLICY "Users can view audit logs for their organizations"
ON audit_logs FOR SELECT
USING (
    organization_id IN (SELECT auth.user_org_ids())
    OR organization_id IS NULL  -- Allow viewing system-level logs (super admin actions)
);

COMMENT ON POLICY "Users can view audit logs for their organizations" ON audit_logs
IS 'Users can view audit logs for their organizations (INSERT via service role only)';


-- ============================================================================
-- POLICY 10: SUBSCRIPTIONS - SELECT ONLY
-- ============================================================================
-- Users can view subscription status for their organizations.
-- Subscription management is done by super admin via service role.
-- This allows dashboard to show subscription info without exposing modification.

CREATE POLICY "Users can view subscriptions for their organizations"
ON subscriptions FOR SELECT
USING (
    organization_id IN (SELECT auth.user_org_ids())
);

COMMENT ON POLICY "Users can view subscriptions for their organizations" ON subscriptions
IS 'Users can view their organization subscription (management via super admin only)';


-- ============================================================================
-- PUBLIC ACCESS: Organizations (for public menu pages)
-- ============================================================================
-- Public menu pages need to access organization data without authentication.
-- This is handled by the service role key on server-side, not RLS bypass.
-- For true public access, create a separate public schema or use service role.


-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'RLS: Members can view their own organizations';
COMMENT ON TABLE organization_members IS 'RLS: Members can view membership of their organizations';
COMMENT ON TABLE categories IS 'RLS: Members have full CRUD on their organization categories';
COMMENT ON TABLE products IS 'RLS: Members have full CRUD on their organization products';
COMMENT ON TABLE price_ledger IS 'RLS: Members can view/insert prices (UPDATE/DELETE blocked by trigger)';
COMMENT ON TABLE restaurant_tables IS 'RLS: Members have full CRUD on their organization tables';
COMMENT ON TABLE service_requests IS 'RLS: Members have full CRUD on their organization service requests';
COMMENT ON TABLE menu_snapshots IS 'RLS: Members have full CRUD on their organization snapshots';
COMMENT ON TABLE audit_logs IS 'RLS: Members can view their organization audit logs (INSERT via service role)';
COMMENT ON TABLE subscriptions IS 'RLS: Members can view their organization subscriptions (management via admin)';
-- Seed Data for e-menum.net QR Menu SaaS Platform
-- Description: Initial features, plans, and plan-feature mappings
-- Created: 2026-01-13
--
-- This seed file populates the dynamic package management system with:
-- 1. Features catalog (system capabilities)
-- 2. Plans (subscription packages)
-- 3. Plan-feature mappings (what each plan includes)
--
-- IMPORTANT: This follows the dynamic permission system pattern.
-- No hard-coded plan checks in application code!

-- ============================================================================
-- FEATURES SEED DATA
-- ============================================================================
-- Categories: 'limits', 'modules', 'support', 'ai'
-- Types: 'boolean' (on/off), 'limit' (numeric)

INSERT INTO features (key, name, description, type, category, sort_order) VALUES
    -- Limits
    ('limit_categories', 'Kategori Limiti', 'Maksimum kategori sayisi', 'limit', 'limits', 1),
    ('limit_products', 'Urun Limiti', 'Maksimum urun sayisi', 'limit', 'limits', 2),
    ('limit_languages', 'Dil Limiti', 'Desteklenen dil sayisi', 'limit', 'limits', 3),
    ('retention_days', 'Kayit Saklama Suresi', 'Denetim kayitlarinin saklanma suresi (gun)', 'limit', 'limits', 4),
    ('export_formats', 'Disa Aktarma Formatlari', 'Desteklenen disa aktarma format sayisi', 'limit', 'limits', 5),
    ('ai_token_quota', 'AI Token Kotasi', 'Aylik AI token limiti', 'limit', 'ai', 6),

    -- Core Modules
    ('module_images', 'Gorsel Sistemi', 'Urun gorseli yukleme ve gosterme', 'boolean', 'modules', 10),
    ('module_logo', 'Logo Kullanimi', 'Ozel logo gosterimi', 'boolean', 'modules', 11),
    ('module_theme', 'Tema Ozellestirme', 'Arka plan rengi ve tema ayarlari', 'boolean', 'modules', 12),
    ('module_chef_recommendation', 'Sefin Tavsiyesi', 'Urunlere "Sefin Tavsiyesi" rozeti', 'boolean', 'modules', 13),
    ('module_daily_special', 'Gunun Spesiyeli', 'Urunlere "Gunun Spesiyeli" rozeti', 'boolean', 'modules', 14),
    ('module_allergens', 'Alerjen Bilgisi', 'Urunlerde alerjen uyarilari', 'boolean', 'modules', 15),
    ('module_nutrition', 'Besin Degerleri', 'Kalori, protein, karbonhidrat bilgisi', 'boolean', 'modules', 16),

    -- Advanced Modules
    ('module_waiter_call', 'Garson Cagirma', 'QR ile garson cagirma sistemi', 'boolean', 'modules', 20),
    ('module_happy_hour', 'Happy Hour', 'Zamanlanmis indirim kampanyalari', 'boolean', 'modules', 21),
    ('module_social_share', 'Sosyal Paylasim', 'Urunleri sosyal medyada paylasma', 'boolean', 'modules', 22),
    ('module_google_business', 'Google Benim Isletmem', 'Google My Business entegrasyonu', 'boolean', 'modules', 23),
    ('module_cross_sell', 'Capraz Satis', 'Bununla Iyi Gider onerisi', 'boolean', 'modules', 24),
    ('module_variants', 'Urun Varyantlari', 'Boyut, porsiyon varyantlari', 'boolean', 'modules', 25),
    ('module_modifiers', 'Urun Eklemeleri', 'Ekstra malzeme ve modifierlar', 'boolean', 'modules', 26),
    ('module_bundles', 'Menu Paketleri', 'Set menu ve paket olusturma', 'boolean', 'modules', 27),

    -- Operations
    ('bulk_operations', 'Toplu Islemler', 'Toplu ice/disa aktarma', 'boolean', 'modules', 30),
    ('module_ai_generation', 'AI Icerik Uretimi', 'Yapay zeka ile icerik olusturma', 'boolean', 'ai', 31),

    -- Support
    ('priority_support', 'Oncelikli Destek', 'Hizli destek hatti erisimi', 'boolean', 'support', 40);

-- ============================================================================
-- PLANS SEED DATA
-- ============================================================================
-- Plans follow Turkish market pricing with TRY currency
-- Note: spec.md DON'T section says "Use seed SQL for initial data (use migrations + import packages)"
-- However, seed data for features/plans is explicitly required by the implementation plan.

INSERT INTO plans (name, description, price_monthly, price_yearly, currency, is_active, is_public, sort_order, features_summary) VALUES
    ('Free', 'Ucretsiz Baslangic', 0.00, 0.00, 'TRY', true, true, 1,
     'Sinirli kategori ve urun, temel menu ozellikleri'),
    ('Lite', 'Kucuk Isletmeler Icin', 149.00, 1490.00, 'TRY', true, true, 2,
     'Daha fazla urun, gorsel sistemi, logo kullanimi'),
    ('Gold', 'Buyuyen Isletmeler Icin', 299.00, 2990.00, 'TRY', true, true, 3,
     'Sefin tavsiyesi, gunun spesiyeli, coklu dil destegi'),
    ('Platinum', 'Profesyonel Isletmeler Icin', 499.00, 4990.00, 'TRY', true, true, 4,
     'Garson cagirma, happy hour, sosyal paylasim, besin degerleri'),
    ('Enterprise', 'Kurumsal Cozumler', NULL, NULL, 'TRY', true, false, 5,
     'Ozel limitsiz ozellikler, oncelikli destek, ozel entegrasyonlar');

-- ============================================================================
-- PLAN_FEATURES SEED DATA
-- ============================================================================
-- Maps features to plans with their values
-- value_boolean: true/false for boolean features
-- value_limit: numeric value for limit features

INSERT INTO plan_features (plan_id, feature_id, value_boolean, value_limit)
SELECT
    p.id AS plan_id,
    f.id AS feature_id,
    CASE
        -- Free Plan
        WHEN p.name = 'Free' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Free' AND f.type = 'boolean' THEN false

        -- Lite Plan
        WHEN p.name = 'Lite' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens') THEN true
        WHEN p.name = 'Lite' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Lite' AND f.type = 'boolean' THEN false

        -- Gold Plan
        WHEN p.name = 'Gold' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens',
            'module_chef_recommendation', 'module_daily_special', 'module_nutrition') THEN true
        WHEN p.name = 'Gold' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Gold' AND f.type = 'boolean' THEN false

        -- Platinum Plan
        WHEN p.name = 'Platinum' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens',
            'module_chef_recommendation', 'module_daily_special', 'module_nutrition',
            'module_waiter_call', 'module_happy_hour', 'module_social_share', 'module_google_business',
            'module_cross_sell', 'module_variants', 'module_modifiers', 'bulk_operations') THEN true
        WHEN p.name = 'Platinum' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Platinum' AND f.type = 'boolean' THEN false

        -- Enterprise Plan (all features enabled)
        WHEN p.name = 'Enterprise' AND f.type = 'boolean' THEN true
        WHEN p.name = 'Enterprise' AND f.type = 'limit' THEN NULL

        ELSE false
    END AS value_boolean,
    CASE
        -- Free Plan Limits
        WHEN p.name = 'Free' AND f.key = 'limit_categories' THEN 3
        WHEN p.name = 'Free' AND f.key = 'limit_products' THEN 20
        WHEN p.name = 'Free' AND f.key = 'limit_languages' THEN 1
        WHEN p.name = 'Free' AND f.key = 'retention_days' THEN 7
        WHEN p.name = 'Free' AND f.key = 'export_formats' THEN 1
        WHEN p.name = 'Free' AND f.key = 'ai_token_quota' THEN 0

        -- Lite Plan Limits
        WHEN p.name = 'Lite' AND f.key = 'limit_categories' THEN 10
        WHEN p.name = 'Lite' AND f.key = 'limit_products' THEN 50
        WHEN p.name = 'Lite' AND f.key = 'limit_languages' THEN 1
        WHEN p.name = 'Lite' AND f.key = 'retention_days' THEN 30
        WHEN p.name = 'Lite' AND f.key = 'export_formats' THEN 2
        WHEN p.name = 'Lite' AND f.key = 'ai_token_quota' THEN 0

        -- Gold Plan Limits
        WHEN p.name = 'Gold' AND f.key = 'limit_categories' THEN 25
        WHEN p.name = 'Gold' AND f.key = 'limit_products' THEN 150
        WHEN p.name = 'Gold' AND f.key = 'limit_languages' THEN 3
        WHEN p.name = 'Gold' AND f.key = 'retention_days' THEN 90
        WHEN p.name = 'Gold' AND f.key = 'export_formats' THEN 3
        WHEN p.name = 'Gold' AND f.key = 'ai_token_quota' THEN 1000

        -- Platinum Plan Limits
        WHEN p.name = 'Platinum' AND f.key = 'limit_categories' THEN 100
        WHEN p.name = 'Platinum' AND f.key = 'limit_products' THEN 500
        WHEN p.name = 'Platinum' AND f.key = 'limit_languages' THEN 5
        WHEN p.name = 'Platinum' AND f.key = 'retention_days' THEN 365
        WHEN p.name = 'Platinum' AND f.key = 'export_formats' THEN 5
        WHEN p.name = 'Platinum' AND f.key = 'ai_token_quota' THEN 10000

        -- Enterprise Plan Limits (unlimited represented as high values)
        WHEN p.name = 'Enterprise' AND f.key = 'limit_categories' THEN 999999
        WHEN p.name = 'Enterprise' AND f.key = 'limit_products' THEN 999999
        WHEN p.name = 'Enterprise' AND f.key = 'limit_languages' THEN 10
        WHEN p.name = 'Enterprise' AND f.key = 'retention_days' THEN 3650
        WHEN p.name = 'Enterprise' AND f.key = 'export_formats' THEN 10
        WHEN p.name = 'Enterprise' AND f.key = 'ai_token_quota' THEN 100000

        ELSE NULL
    END AS value_limit
FROM plans p
CROSS JOIN features f
ORDER BY p.sort_order, f.sort_order;
