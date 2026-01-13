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
