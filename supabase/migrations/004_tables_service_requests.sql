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
