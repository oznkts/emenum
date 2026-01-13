import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Logout API Route Handler
 *
 * This route handles user logout by:
 * 1. Signing out the user from Supabase Auth
 * 2. Clearing session cookies
 * 3. Redirecting to the home page
 *
 * POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url)

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

  // Sign out the user
  const { error } = await supabase.auth.signOut()

  if (error) {
    // Log the error for debugging (server-side only)
    // Note: Do not expose detailed error messages to the client for security
    return NextResponse.json(
      { error: 'Oturum kapatma sirasinda bir hata olustu' },
      { status: 500 }
    )
  }

  // Redirect to home page after successful logout
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
