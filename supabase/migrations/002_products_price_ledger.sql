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
