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
