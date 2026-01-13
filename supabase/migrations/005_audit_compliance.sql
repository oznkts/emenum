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
