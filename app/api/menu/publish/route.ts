import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createMenuSnapshot } from '@/lib/services/snapshot'

/**
 * Menu Publish API Route Handler
 *
 * This route handles menu publishing by:
 * 1. Authenticating the user and verifying organization access
 * 2. Creating an immutable menu snapshot with SHA-256 hash
 * 3. Triggering ISR revalidation for the public menu page
 *
 * POST /api/menu/publish
 *
 * Request body:
 * {
 *   organizationId: string (required) - Organization UUID to publish
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   data?: {
 *     snapshotId: string - Created snapshot UUID
 *     version: number - Snapshot version number
 *     hash: string - SHA-256 hash for integrity verification
 *     publishedAt: string - ISO timestamp of publish
 *   }
 *   error?: string
 * }
 */

/**
 * Create Supabase server client with cookie handling
 */
async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

/**
 * Request body interface
 */
interface PublishRequestBody {
  organizationId?: string
}

/**
 * POST /api/menu/publish
 *
 * Publishes the menu by creating a snapshot and triggering revalidation.
 * User must be authenticated and have sufficient role (owner, admin, manager).
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Parse request body
  let body: PublishRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gecersiz istek formati' },
      { status: 400 }
    )
  }

  // Validate required organizationId field
  if (!body.organizationId || typeof body.organizationId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Organizasyon ID degeri zorunludur' },
      { status: 400 }
    )
  }

  const organizationId = body.organizationId.trim()

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(organizationId)) {
    return NextResponse.json(
      { success: false, error: 'Gecersiz organizasyon ID formati' },
      { status: 400 }
    )
  }

  // Verify organization exists and is active
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, slug, is_active')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    return NextResponse.json(
      { success: false, error: 'Organizasyon bulunamadi' },
      { status: 404 }
    )
  }

  // Check if organization is active
  if (!organization.is_active) {
    return NextResponse.json(
      {
        success: false,
        error: 'Organizasyon aktif degil. Menu yayinlamak icin aktivasyon gerekli',
      },
      { status: 403 }
    )
  }

  // Check if user is a member of this organization with sufficient role
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json(
      { success: false, error: 'Bu organizasyon icin yetkiniz bulunmuyor' },
      { status: 403 }
    )
  }

  // Only owner, admin, and manager can publish menus
  const allowedRoles = ['owner', 'admin', 'manager']
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Menu yayinlamak icin yeterli yetkiniz bulunmuyor',
      },
      { status: 403 }
    )
  }

  try {
    // Create the menu snapshot
    const snapshotResult = await createMenuSnapshot(organizationId)

    if (!snapshotResult.success || !snapshotResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: snapshotResult.error || 'Snapshot olusturulamadi',
        },
        { status: 500 }
      )
    }

    const snapshot = snapshotResult.data

    // Trigger ISR revalidation for the public menu page
    revalidatePath(`/menu/${organization.slug}`)

    // Return success response with snapshot details
    return NextResponse.json({
      success: true,
      data: {
        snapshotId: snapshot.id,
        version: snapshot.version,
        hash: snapshot.hash,
        publishedAt: snapshot.created_at,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Menu yayinlanirken bir hata olustu: ${
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        }`,
      },
      { status: 500 }
    )
  }
}
