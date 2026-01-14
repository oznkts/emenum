# e-menum.net Route Documentation

This document provides a comprehensive overview of all routes in the e-menum.net platform, including pages, API endpoints, and their access requirements.

---

## Table of Contents

- [Overview](#overview)
- [Route Groups](#route-groups)
- [Public Routes](#public-routes)
- [Auth Routes](#auth-routes)
- [Dashboard Routes (Protected)](#dashboard-routes-protected)
- [Admin Routes (Super Admin Only)](#admin-routes-super-admin-only)
- [API Routes](#api-routes)
- [Route Patterns](#route-patterns)
- [Middleware](#middleware)

---

## Overview

The e-menum.net platform uses Next.js App Router with route groups for organization:

| Route Group | Purpose | Auth Required |
|-------------|---------|---------------|
| `(public)` | Public pages (landing, features, pricing) | No |
| `(auth)` | Authentication pages (login, register) | No |
| `(dashboard)` | Merchant dashboard pages | Yes |
| `(admin)` | Super Admin panel | Yes (Super Admin) |
| `/menu/[slug]` | Public menu pages (QR target) | No |
| `/api/*` | API endpoints | Varies |

---

## Route Groups

### Next.js Route Group Structure

```
app/
├── (auth)/              # Auth pages - no auth required
├── (dashboard)/         # Protected dashboard - auth required
├── (admin)/             # Super Admin panel - admin role required
├── menu/                # Public menu pages - no auth required
├── r/                   # Restaurant landing pages - no auth required
├── api/                 # API endpoints
├── auth/                # Auth callbacks
├── features/            # Public features page
├── pricing/             # Public pricing page
└── page.tsx             # Landing page
```

---

## Public Routes

These routes are accessible without authentication.

| Route | File | Description | SEO |
|-------|------|-------------|-----|
| `/` | `app/page.tsx` | Landing page (awwwards-level design) | Yes |
| `/features` | `app/features/page.tsx` | Features showcase | Yes |
| `/pricing` | `app/pricing/page.tsx` | Pricing plans comparison | Yes |
| `/menu/[slug]` | `app/menu/[slug]/page.tsx` | Public menu (QR code target) | ISR |
| `/r/[slug]` | `app/r/[slug]/page.tsx` | Restaurant landing page | Yes |

### Key Public Route: `/menu/[slug]`

This is the **most important route** in the platform - the QR code target.

- **Purpose**: Display restaurant menu to customers
- **URL Pattern**: `https://e-menum.net/menu/{restaurant-slug}`
- **Query Parameters**:
  - `?table_id={uuid}` - Table identification for waiter calls
- **Rendering**: ISR (Incremental Static Regeneration) with revalidation on publish
- **Performance Target**: LCP < 2.5s, CLS < 0.1

---

## Auth Routes

Authentication routes handled by the `(auth)` route group.

| Route | File | Description |
|-------|------|-------------|
| `/login` | `app/(auth)/login/page.tsx` | User login form |
| `/register` | `app/(auth)/register/page.tsx` | Merchant registration |
| `/password-recovery` | `app/(auth)/password-recovery/page.tsx` | Password reset request |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Password reset form |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | Email verification |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth callback handler |

### Auth Flow

```
1. Register → /register
2. Email verification sent → /verify-email
3. Click link in email → /auth/callback
4. Login → /login
5. Forgot password → /password-recovery → /reset-password
```

---

## Dashboard Routes (Protected)

Protected routes requiring authentication. Access controlled by organization membership and role.

| Route | File | Description | Min Role |
|-------|------|-------------|----------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Main dashboard, QR access | Viewer |
| `/products` | `app/(dashboard)/products/page.tsx` | Product management | Manager |
| `/products/new` | `app/(dashboard)/products/new/page.tsx` | Add new product | Manager |
| `/products/[id]` | `app/(dashboard)/products/[id]/page.tsx` | Edit product | Manager |
| `/categories` | `app/(dashboard)/categories/page.tsx` | Category management | Manager |
| `/tables` | `app/(dashboard)/tables/page.tsx` | Table QR management | Manager |
| `/waiter` | `app/(dashboard)/waiter/page.tsx` | Waiter call panel (realtime) | Waiter |
| `/audit` | `app/(dashboard)/audit/page.tsx` | Audit log viewer | Admin |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Organization settings | Admin |

### Role Hierarchy

```
Owner > Admin > Manager > Waiter > Viewer
```

| Role | Permissions |
|------|-------------|
| Owner | Full access, billing, delete organization |
| Admin | Settings, audit, team management |
| Manager | Products, categories, tables |
| Waiter | Waiter panel, view dashboard |
| Viewer | Read-only dashboard access |

---

## Admin Routes (Super Admin Only)

Super Admin panel for platform management. Requires `super_admin` role.

| Route | File | Description |
|-------|------|-------------|
| `/admin` | `app/(admin)/admin/page.tsx` | Admin dashboard overview |
| `/admin/organizations` | `app/(admin)/admin/organizations/page.tsx` | Tenant management |
| `/admin/plans` | `app/(admin)/admin/plans/page.tsx` | Plan/feature management |
| `/admin/overrides` | `app/(admin)/admin/overrides/page.tsx` | Feature overrides (ABAC) |
| `/admin/ai` | `app/(admin)/admin/ai/page.tsx` | AI token management |

### Admin Capabilities

- Activate/deactivate tenants
- Assign subscription plans
- Create feature overrides with expiration
- Impersonate users (audit logged)
- Export compliance data
- Manage AI quotas

---

## API Routes

Backend API endpoints for frontend interactions.

### Authentication

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/logout` | POST | Sign out user |

### Locations

| Route | Method | Description |
|-------|--------|-------------|
| `/api/locations` | GET | List locations |
| `/api/locations` | POST | Create location |
| `/api/locations/[id]` | GET | Get single location |
| `/api/locations/[id]` | PUT | Update location |
| `/api/locations/[id]` | DELETE | Delete location |

### Menu Operations

| Route | Method | Description |
|-------|--------|-------------|
| `/api/menu/publish` | POST | Publish menu (creates snapshot) |
| `/api/menu/snapshot` | GET | Get menu snapshot with hash |

### QR Generation

| Route | Method | Description |
|-------|--------|-------------|
| `/api/qr/generate` | POST | Generate QR codes (SVG, PNG, PDF) |

### Service Requests

| Route | Method | Description |
|-------|--------|-------------|
| `/api/service-request` | POST | Create waiter call request |

### API Response Format

All API responses follow a consistent format:

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## Route Patterns

### Dynamic Routes

| Pattern | Example | Usage |
|---------|---------|-------|
| `[slug]` | `/menu/kebapci-mehmet` | Restaurant identifier |
| `[id]` | `/products/uuid-here` | Resource ID |

### Route Group Conventions

- `(auth)` - Parentheses indicate route group (not in URL)
- Routes inside `(auth)/login` become `/login`
- Route groups share layouts within the group

### Protected Route Pattern

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/products/:path*',
    '/categories/:path*',
    '/tables/:path*',
    '/waiter/:path*',
    '/audit/:path*',
    '/settings/:path*',
    '/admin/:path*'
  ]
}
```

---

## Middleware

### Authentication Middleware

The `middleware.ts` file protects dashboard and admin routes:

1. Check for valid Supabase session
2. Redirect to `/login` if unauthenticated
3. Check role for admin routes
4. Redirect to `/dashboard` if unauthorized

### Rate Limiting

API routes implement rate limiting:

| Route Type | Limit |
|------------|-------|
| Auth endpoints | 5 req/min |
| API endpoints | 100 req/min |
| QR generation | 10 req/min |

---

## URL Examples

### Production URLs

```
# Landing
https://e-menum.net/

# Public Menu (QR Target)
https://e-menum.net/menu/kebapci-mehmet

# Menu with Table
https://e-menum.net/menu/kebapci-mehmet?table_id=uuid

# Dashboard
https://e-menum.net/dashboard

# Admin Panel
https://e-menum.net/admin
```

### Development URLs

```
# Landing
http://localhost:3000/

# Public Menu
http://localhost:3000/menu/demo-restaurant

# Dashboard
http://localhost:3000/dashboard

# Admin Panel
http://localhost:3000/admin
```

---

## Related Documentation

- [README.md](../README.md) - Project overview and setup
- [Database Schema](../supabase/migrations/) - Database structure
- [API Documentation](./API.md) - Detailed API reference

---

*Last updated: January 2025*
