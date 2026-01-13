# Specification: e-menum.net - Hygienic QR Menu SaaS Platform

## Overview

This specification defines the complete implementation of e-menum.net, a multi-tenant QR Menu SaaS platform for Turkish restaurants, cafes, and similar establishments. The platform's core mission is singular: **Customer scans QR code and accesses the online menu**. Everything else is supplementary. The system must comply with Turkish Trade Ministry regulations for digital price labeling, providing an immutable audit trail for pricing changes via an insert-only price ledger with SHA-256 hash verification. Built on Next.js (App Router) + Node.js ecosystem with Supabase (PostgreSQL + Auth + Storage) and deployed on Vercel.

## Workflow Type

**Type**: feature

**Rationale**: This is a greenfield project requiring the complete implementation of a SaaS platform from scratch. It involves multiple interconnected modules (authentication, menu builder, product management, QR generation, subscription plans, admin panel) with complex business logic, database schema design, and regulatory compliance requirements.

## Task Scope

### Services Involved
- **Next.js Application** (primary) - Full-stack application handling both frontend UI and API routes
- **Supabase** (integration) - PostgreSQL database, authentication, realtime subscriptions, and file storage
- **Vercel** (deployment) - Hosting, edge functions, and ISR/SSG capabilities

### This Task Will:
- [ ] Set up Next.js 15.1 project with App Router, TypeScript, and Tailwind CSS 3.4.x
- [ ] Configure Supabase integration with RLS policies for multi-tenant isolation
- [ ] Implement immutable price ledger with insert-only pattern and DB triggers
- [ ] Create QR code generation system (SVG + PNG 1024/2048/4096 + A5 PDF)
- [ ] Build drag-drop menu builder with live preview, undo/redo, and autosave
- [ ] Implement dynamic plan/subscription system (no hard-coded plan checks)
- [ ] Create RBAC system with roles: Owner, Admin, Manager, Waiter, Viewer
- [ ] Build menu snapshot system with SHA-256 hash verification
- [ ] Implement public menu pages with ISR/SSG and revalidation on publish
- [ ] Create Super Admin panel for tenant management and impersonation
- [ ] Set up comprehensive testing (unit, integration, E2E)
- [ ] Generate CI/CD pipeline and deployment documentation

### Out of Scope:
- Payment gateway integration (EFT/manual activation only)
- ERPNext/Frappe integration (PIM concepts only, no external ERP)
- Mobile native applications (web-only PWA approach)
- WhatsApp revision channel (deprecated - support/notification only)
- "2x price revision limit" (deprecated - unlimited via ledger pattern)

## Service Context

### Next.js Application

**Tech Stack:**
- Language: TypeScript 5.7.x
- Framework: Next.js 15.1.x (App Router)
- UI: React 19.x + Tailwind CSS 3.4.x
- Key directories: `app/`, `components/`, `lib/`, `hooks/`, `types/`

**Entry Point:** `app/page.tsx` (Landing) + `app/layout.tsx` (Root Layout)

**How to Run:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

**Port:** 3000

### Supabase

**Tech Stack:**
- Database: PostgreSQL 15.x
- Auth: Supabase Auth with email/password + OAuth
- Storage: Supabase Storage for images and QR files
- Realtime: Supabase Realtime for waiter notifications

**How to Run (Local):**
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push
```

**Ports:**
- API: 54321
- Database: 54322
- Studio: 54323

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `app/page.tsx` | Next.js | Create awwwards-level landing page |
| `app/(auth)/login/page.tsx` | Next.js | Implement login with Supabase Auth |
| `app/(auth)/register/page.tsx` | Next.js | Implement merchant registration flow |
| `app/(dashboard)/dashboard/page.tsx` | Next.js | Create main dashboard with QR access |
| `app/(dashboard)/products/page.tsx` | Next.js | Product CRUD with variants/modifiers |
| `app/(dashboard)/categories/page.tsx` | Next.js | Category management with taxonomy tree |
| `app/menu/[slug]/page.tsx` | Next.js | Public menu page with ISR |
| `app/api/auth/callback/route.ts` | Next.js | OAuth callback handler |
| `app/api/qr/generate/route.ts` | Next.js | QR code generation endpoint |
| `lib/supabase/client.ts` | Next.js | Browser Supabase client |
| `lib/supabase/server.ts` | Next.js | Server Supabase client |
| `lib/guards/permission.ts` | Next.js | Feature permission guard (dynamic) |
| `lib/services/price-ledger.ts` | Next.js | Price ledger service |
| `lib/services/snapshot.ts` | Next.js | Menu snapshot + hash service |
| `middleware.ts` | Next.js | Auth middleware for route protection |
| `supabase/migrations/*.sql` | Supabase | Database schema migrations |
| `supabase/seed.sql` | Supabase | Initial features/plans data |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `README.md` | Project structure, tech stack, deployment process |
| `menu.md` | Canonical route definitions and routing patterns |
| `ek_ozellikler.md` | Database schema patterns for tables/features/plans |
| `mimari.dev.dosya-adlandirma.md` | File naming conventions and architecture patterns |
| `temel.md` | Package features matrix and business requirements |

## Patterns to Follow

### 1. Supabase Client Pattern

From `lib/supabase/` (to be created):

```typescript
// lib/supabase/client.ts - Browser client
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts - Server client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

**Key Points:**
- Use `createBrowserClient` for client components
- Use `createServerClient` with cookies for server components/API routes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client

### 2. Permission Guard Pattern (Dynamic Plan Checks)

From `lib/guards/permission.ts` (to be created):

```typescript
// CORRECT: Dynamic permission check
export async function hasPermission(
  organizationId: string,
  featureKey: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  // 1. Check subscription plan features
  const { data: planFeature } = await supabase
    .from('v_organization_features')
    .select('value_boolean, value_limit')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .single()

  // 2. Check for override (ABAC layer) - only non-expired overrides
  const { data: override } = await supabase
    .from('organization_feature_overrides')
    .select('override_value, expires_at')
    .eq('organization_id', organizationId)
    .eq('feature_key', featureKey)
    .or('expires_at.is.null,expires_at.gt.now()')
    .single()

  // Override takes precedence (if not expired)
  if (override) return override.override_value
  return planFeature?.value_boolean ?? false
}

// WRONG: Never do this
// if (user.package === 'Pro') { ... } // FORBIDDEN!
```

**Key Points:**
- All plan checks must be dynamic from database
- Override table allows per-tenant exceptions
- No hard-coded plan names in application code

### 3. Price Ledger Pattern (Immutable)

From `lib/services/price-ledger.ts` (to be created):

```typescript
// INSERT only - never UPDATE or DELETE prices
export async function addPriceEntry(
  productId: string,
  price: number,
  changeReason: string
) {
  const supabase = await createServerSupabaseClient()

  // Only INSERT allowed - DB trigger blocks UPDATE/DELETE
  const { data, error } = await supabase
    .from('price_ledger')
    .insert({
      product_id: productId,
      price: price,
      change_reason: changeReason,
      changed_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// View for current prices (always latest entry)
// SELECT * FROM current_prices WHERE product_id = ?
```

**Key Points:**
- Prices stored in separate `price_ledger` table, not `products`
- UPDATE/DELETE blocked by database trigger
- Use `current_prices` view for latest price per product

### 4. RLS Policy Pattern

```sql
-- Multi-tenant isolation via RLS
CREATE POLICY "Users can view own organization products"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- All tenant-specific queries must include organization_id filter
-- Queries without tenant filter are FORBIDDEN
```

**Key Points:**
- Every table with tenant data must have RLS policies
- Use `auth.uid()` to identify current user
- Test isolation between tenant A and tenant B

## Requirements

### Functional Requirements

1. **QR Code Generation**
   - Description: Auto-generate QR codes when merchant registers, providing stable links to menu
   - Acceptance: QR codes available in SVG, PNG (1024/2048/4096px), and A5 PDF formats; links remain stable after menu updates

2. **Immutable Price Ledger**
   - Description: All price changes stored as append-only records for regulatory compliance
   - Acceptance: UPDATE/DELETE on price_ledger fails; full price history preserved; export available

3. **Menu Builder (Drag-Drop)**
   - Description: Visual editor for menu layout with component registry
   - Acceptance: Drag-drop works with keyboard navigation; live preview updates; undo/redo functional; autosave enabled

4. **Multi-Tenant Isolation**
   - Description: Complete data isolation between restaurants via RLS
   - Acceptance: Tenant A cannot access Tenant B data even with direct API calls

5. **Dynamic Plan System**
   - Description: Feature access determined by database configuration, not code
   - Acceptance: New plan can be created in Super Admin without code deployment

6. **Menu Publishing + Snapshot**
   - Description: Publish creates immutable snapshot with hash for compliance proof
   - Acceptance: Each publish generates JSON snapshot + SHA-256 hash; snapshot exportable

7. **Table-Based QR + Waiter Call**
   - Description: QR codes with table context enabling real-time waiter notifications
   - Acceptance: URL includes `?table_id=uuid`; waiter receives real-time notification

8. **Super Admin Panel**
   - Description: Tenant activation, plan assignment, impersonation, compliance export
   - Acceptance: Can activate/deactivate tenants; assign plans; impersonate users; export audit data

### Edge Cases

1. **Concurrent Price Updates** - Use optimistic locking; last write wins with full audit trail
2. **QR Code After Slug Change** - Old slug should redirect to new slug (301) to preserve QR codes
3. **Plan Downgrade** - Gracefully disable features; preserve data; show upgrade prompts
4. **Session Expiry During Edit** - Autosave to localStorage; restore on re-auth
5. **Large Menu Import** - Batch processing with progress indicator; idempotent upsert
6. **Realtime Connection Loss** - Reconnect with exponential backoff; queue waiter calls
7. **Image Upload Failure** - Retry with feedback; allow text-only fallback
8. **Multi-Tab Editing** - Detect conflicts; offer merge or overwrite options

## Implementation Notes

### DO
- Follow the pattern in `lib/supabase/server.ts` for all server-side Supabase access
- Reuse `hasPermission()` guard for all feature access checks
- Use `'use client'` directive only for interactive components (menu builder, forms)
- Implement ISR with `revalidatePath('/menu/[slug]')` on menu publish
- Store builder/theme/layout configs as JSON in database
- Use relative paths for all internal links (domain-independent)
- Include `organization_id` filter in every tenant-specific query
- Generate QR codes server-side with high error correction level

### DON'T
- Create hard-coded plan checks (`if plan === 'Pro'` is FORBIDDEN)
- Store prices in `products` table (use `price_ledger` only)
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Use absolute URLs for internal navigation
- Skip RLS policies on any tenant data table
- Use seed SQL for initial data (use migrations + import packages)
- Block core QR-to-menu flow with non-essential features

## Development Environment

### Start Services

```bash
# Terminal 1: Start local Supabase
npx supabase start

# Terminal 2: Start Next.js dev server
npm run dev
```

### Service URLs
- Next.js App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- Supabase API: http://localhost:54321

### Required Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SITE_URL=http://localhost:3000

# Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
SITE_URL=https://e-menum.net
```

## Database Schema

### Core Tables

```sql
-- Organizations (Restaurants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organization Members (RBAC)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'waiter', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  parent_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products (NO price field here!)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  allergens TEXT[],
  nutrition JSONB,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Price Ledger (INSERT-ONLY, immutable)
CREATE TABLE price_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to prevent UPDATE/DELETE on price_ledger
CREATE OR REPLACE FUNCTION prevent_price_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE and DELETE are not allowed on price_ledger';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_ledger_immutable
BEFORE UPDATE OR DELETE ON price_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_price_modification();

-- Current Prices View
CREATE VIEW current_prices AS
SELECT DISTINCT ON (product_id)
  product_id, price, currency, created_at
FROM price_ledger
ORDER BY product_id, created_at DESC;

-- Features Catalog
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('boolean', 'limit')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- Plan Features
CREATE TABLE plan_features (
  plan_id UUID REFERENCES plans(id),
  feature_id UUID REFERENCES features(id),
  value_boolean BOOLEAN,
  value_limit INT,
  PRIMARY KEY (plan_id, feature_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  plan_id UUID REFERENCES plans(id),
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled')),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature Overrides (ABAC)
CREATE TABLE organization_feature_overrides (
  organization_id UUID REFERENCES organizations(id),
  feature_key TEXT REFERENCES features(key),
  override_value BOOLEAN,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (organization_id, feature_key)
);

-- View: Organization Features (joins subscription + plan + features)
CREATE VIEW v_organization_features AS
SELECT
  s.organization_id,
  f.key AS feature_key,
  f.type AS feature_type,
  pf.value_boolean,
  pf.value_limit
FROM subscriptions s
JOIN plan_features pf ON pf.plan_id = s.plan_id
JOIN features f ON f.id = pf.feature_id
WHERE s.status = 'active';

-- Menu Snapshots
CREATE TABLE menu_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  snapshot_data JSONB NOT NULL,
  hash TEXT NOT NULL,
  version INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Restaurant Tables
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  table_number TEXT NOT NULL,
  qr_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
  current_status TEXT CHECK (current_status IN ('empty', 'occupied', 'service_needed')),
  last_ping_at TIMESTAMPTZ
);

-- Service Requests (Waiter Calls)
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  table_id UUID REFERENCES restaurant_tables(id),
  request_type TEXT DEFAULT 'waiter_call',
  status TEXT CHECK (status IN ('pending', 'acknowledged', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Route Inventory

### Public Routes (No Auth Required)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Landing page (awwwards-level) |
| `/features` | `app/features/page.tsx` | Features showcase |
| `/pricing` | `app/pricing/page.tsx` | Pricing plans |
| `/menu/[slug]` | `app/menu/[slug]/page.tsx` | Public menu (QR target) |
| `/r/[slug]` | `app/r/[slug]/page.tsx` | Restaurant landing (optional) |

### Auth Routes

| Route | File | Description |
|-------|------|-------------|
| `/login` | `app/(auth)/login/page.tsx` | User login |
| `/register` | `app/(auth)/register/page.tsx` | Merchant registration |
| `/password-recovery` | `app/(auth)/password-recovery/page.tsx` | Password reset request |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Password reset form |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | Email verification |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth callback |

### Protected Routes (Auth Required)

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Main dashboard |
| `/products` | `app/(dashboard)/products/page.tsx` | Product management |
| `/products/new` | `app/(dashboard)/products/new/page.tsx` | Add product |
| `/products/[id]` | `app/(dashboard)/products/[id]/page.tsx` | Edit product |
| `/categories` | `app/(dashboard)/categories/page.tsx` | Category management |
| `/tables` | `app/(dashboard)/tables/page.tsx` | Table QR management |
| `/waiter` | `app/(dashboard)/waiter/page.tsx` | Waiter call panel |
| `/audit` | `app/(dashboard)/audit/page.tsx` | Audit log viewer |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Organization settings |

### Admin Routes (Super Admin Only)

| Route | File | Description |
|-------|------|-------------|
| `/admin` | `app/(admin)/admin/page.tsx` | Admin dashboard |
| `/admin/organizations` | `app/(admin)/admin/organizations/page.tsx` | Tenant management |
| `/admin/plans` | `app/(admin)/admin/plans/page.tsx` | Plan/feature management |
| `/admin/overrides` | `app/(admin)/admin/overrides/page.tsx` | Feature overrides |
| `/admin/ai` | `app/(admin)/admin/ai/page.tsx` | AI token management |

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/logout` | POST | Logout handler |
| `/api/locations` | GET, POST | Location CRUD |
| `/api/locations/[id]` | GET, PUT, DELETE | Single location |
| `/api/service-request` | POST | Waiter call |
| `/api/qr/generate` | POST | QR generation |
| `/api/menu/publish` | POST | Publish menu |
| `/api/menu/snapshot` | GET | Get snapshot |

## Success Criteria

The task is complete when:

1. [ ] QR code scans reliably open menu at `/menu/[slug]`
2. [ ] Price changes create new ledger entries (no UPDATE/DELETE possible)
3. [ ] Menu publish creates verifiable snapshot with SHA-256 hash
4. [ ] Tenant A cannot access Tenant B data via any method
5. [ ] New plans can be added via Super Admin without code changes
6. [ ] All listed routes return 200 (or appropriate auth redirect)
7. [ ] No console errors in production build
8. [ ] Existing tests still pass
9. [ ] Register-to-QR-download flow completes in under 10 minutes
10. [ ] Lighthouse performance scores meet targets (LCP < 2.5s, CLS < 0.1)

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| RLS Isolation | `tests/integration/rls-isolation.test.ts` | Tenant A cannot query Tenant B data |
| Price Ledger Immutability | `lib/__tests__/price-ledger-immutability.test.ts` | UPDATE/DELETE on price_ledger fails |
| Snapshot Hash | `lib/__tests__/snapshot-hash.test.ts` | SHA-256 hash matches snapshot content |
| Permission Guard | `lib/guards/__tests__/permission.test.ts` | Dynamic feature checks work correctly |
| Import Idempotency | `lib/__tests__/import-idempotency.test.ts` | Same import twice produces same result |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Auth Flow | Next.js ↔ Supabase Auth | Login/register/logout work correctly |
| Price Change Flow | Next.js ↔ Supabase DB | Price added to ledger, current_prices view updates |
| Menu Publish Flow | Next.js ↔ Supabase DB | Snapshot created, hash generated, ISR triggered |
| Waiter Call Flow | Next.js ↔ Supabase Realtime | Service request created, realtime notification received |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Merchant Onboarding | 1. Register 2. Verify email 3. Create restaurant 4. Download QR | QR code downloads, scans to menu page |
| Menu Builder | 1. Add category 2. Add product 3. Set price 4. Publish | Menu visible at public URL with correct data |
| Waiter Call | 1. Scan table QR 2. Click "Call Waiter" | Waiter panel shows notification in real-time |
| Plan Upgrade | 1. As Admin, assign Gold plan 2. As Merchant, access Gold feature | Feature becomes accessible |

### Browser Verification (Frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Landing Page | `http://localhost:3000/` | Renders without errors, responsive design |
| Login | `http://localhost:3000/login` | Form submits, error handling works |
| Dashboard | `http://localhost:3000/dashboard` | Protected route redirects if not auth'd |
| Public Menu | `http://localhost:3000/menu/[slug]` | Displays menu, prices, images correctly |
| Menu Builder | `http://localhost:3000/products` | Drag-drop works, keyboard accessible |
| QR Download | Dashboard QR section | SVG/PNG/PDF download works |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Migrations applied | `npx supabase db push --dry-run` | No pending migrations |
| RLS enabled | `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` | All tenant tables have RLS |
| Price trigger exists | `SELECT tgname FROM pg_trigger WHERE tgname = 'price_ledger_immutable'` | Trigger exists |
| Seed data present | `SELECT COUNT(*) FROM features` | >= 20 features defined |
| Plans exist | `SELECT COUNT(*) FROM plans` | >= 5 plans (Free, Lite, Gold, Platinum, Enterprise) |

### Performance Verification

| Metric | Target | How to Measure |
|--------|--------|----------------|
| LCP | < 2.5s | Lighthouse audit on `/menu/[slug]` |
| CLS | < 0.1 | Lighthouse audit on all pages |
| INP | < 200ms | Chrome DevTools Performance panel |
| Bundle Size | < 200KB (first load) | `npm run build` output |

### Security Verification

| Check | How to Verify | Expected |
|-------|---------------|----------|
| Service key hidden | Check network requests in browser | No `service_role` key exposed |
| RLS enforced | Direct API call without auth | 401 or empty result |
| SQL injection | Test forms with `'; DROP TABLE --` | Input sanitized, no error |
| XSS prevention | Test forms with `<script>alert(1)</script>` | HTML escaped |

### QA Sign-off Requirements

- [ ] All unit tests pass (`npm run test`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Browser verification complete (all routes return 200)
- [ ] Database state verified (migrations, RLS, triggers)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns (no hard-coded plans)
- [ ] No security vulnerabilities introduced
- [ ] Performance targets met (Lighthouse scores)
- [ ] Accessibility verified (keyboard nav, WCAG 2.1 AA)
- [ ] Documentation complete (README, ROUTES.md, API docs)

## Appendix: Feature Catalog

Initial features to seed in database:

| Key | Description | Type |
|-----|-------------|------|
| `limit_categories` | Max categories allowed | limit |
| `limit_products` | Max products allowed | limit |
| `module_images` | Image upload capability | boolean |
| `module_logo` | Custom logo display | boolean |
| `module_theme` | Background customization | boolean |
| `module_chef_recommendation` | Chef's recommendation badge | boolean |
| `module_daily_special` | Daily special badge | boolean |
| `module_languages` | Multi-language support | limit |
| `module_waiter_call` | Waiter call system | boolean |
| `module_happy_hour` | Scheduled discounts | boolean |
| `module_social_share` | Social media sharing | boolean |
| `module_nutrition` | Nutritional information | boolean |
| `module_google_business` | Google My Business integration | boolean |
| `module_cross_sell` | "Goes well with" feature | boolean |
| `module_variants` | Product variants | boolean |
| `module_modifiers` | Product modifiers/extras | boolean |
| `module_bundles` | Bundle/set menu support | boolean |
| `module_allergens` | Allergen display | boolean |
| `retention_days` | Audit log retention | limit |
| `export_formats` | Available export formats | limit |
| `bulk_operations` | Bulk import/export | boolean |
| `priority_support` | Priority support access | boolean |
| `module_ai_generation` | AI-powered content | boolean |
| `ai_token_quota` | Monthly AI token limit | limit |
