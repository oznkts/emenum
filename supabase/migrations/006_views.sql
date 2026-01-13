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
