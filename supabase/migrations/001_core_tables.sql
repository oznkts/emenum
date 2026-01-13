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
