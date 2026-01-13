import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route definitions for access control
 */
const PUBLIC_ROUTES = ['/', '/features', '/pricing']
const AUTH_ROUTES = ['/login', '/register', '/password-recovery', '/reset-password', '/verify-email']
const ADMIN_ROUTE_PREFIX = '/admin'

/**
 * Routes that are publicly accessible (no auth required)
 * Includes: public routes, auth routes, public menu pages, API routes, static assets
 */
function isPublicPath(pathname: string): boolean {
  // Public static routes
  if (PUBLIC_ROUTES.includes(pathname)) return true

  // Auth routes
  if (AUTH_ROUTES.includes(pathname)) return true

  // Public menu pages: /menu/[slug]
  if (pathname.startsWith('/menu/')) return true

  // Restaurant landing pages: /r/[slug]
  if (pathname.startsWith('/r/')) return true

  // OAuth callback
  if (pathname.startsWith('/auth/callback')) return true

  // API routes (protected via their own auth)
  if (pathname.startsWith('/api/')) return true

  // Static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions (favicon.ico, etc.)
  ) {
    return true
  }

  return false
}

/**
 * Check if path requires admin access
 */
function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_ROUTE_PREFIX)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check authentication status
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  // If no user, redirect to login for protected routes
  if (!user || authError) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin access for admin routes
  if (isAdminPath(pathname)) {
    // Query user's super admin status from app_metadata or a dedicated table
    // Super admin check: user has is_super_admin flag in app_metadata
    const isSuperAdmin = user.app_metadata?.is_super_admin === true

    if (!isSuperAdmin) {
      // Non-admin trying to access admin routes - redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
