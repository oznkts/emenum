import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth Callback Route Handler
 *
 * This route handles the callback from OAuth providers (Google, GitHub, etc.)
 * after the user has authenticated. It exchanges the authorization code for
 * a session and redirects the user appropriately.
 *
 * Flow:
 * 1. User clicks "Login with Google" (or other OAuth provider)
 * 2. User is redirected to provider's auth page
 * 3. Provider redirects back to this callback URL with a code
 * 4. This route exchanges the code for a session
 * 5. User is redirected to dashboard (or error page if something goes wrong)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors (e.g., user denied access)
  if (error) {
    const errorMessage = errorDescription || error
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    )
  }

  // If no code is provided, redirect to login
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Yetkilendirme kodu bulunamadi', requestUrl.origin)
    )
  }

  // Create a Supabase client for this route
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )

  // Exchange the authorization code for a session
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    // Log the error for debugging (server-side only)
    // Note: Do not expose detailed error messages to the client for security
    return NextResponse.redirect(
      new URL('/login?error=Oturum olusturulamadi', requestUrl.origin)
    )
  }

  // Successfully authenticated, redirect to the requested page or dashboard
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
