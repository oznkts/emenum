import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/types/database'

/**
 * Single Location API Route Handler
 *
 * Handles operations on a specific location (organization)
 *
 * GET /api/locations/[id] - Get a single location
 * PUT /api/locations/[id] - Update a location
 * DELETE /api/locations/[id] - Delete a location (owner only)
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
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
const ROLE_HIERARCHY: UserRole[] = ['viewer', 'waiter', 'manager', 'admin', 'owner']

/**
 * Check if a user has at least the required role level
 */
function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole)
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole)
  return userLevel >= requiredLevel
}

/**
 * Verify user has access to an organization and return their role
 */
async function verifyAccess(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  userId: string,
  organizationId: string
): Promise<{ hasAccess: boolean; role?: UserRole }> {
  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  if (error || !membership) {
    return { hasAccess: false }
  }

  return { hasAccess: true, role: membership.role as UserRole }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/locations/[id]
 *
 * Returns a single location (organization) details.
 * User must be a member of the organization.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: 'Gecersiz lokasyon ID' },
      { status: 400 }
    )
  }

  // Verify user has access to this organization
  const access = await verifyAccess(supabase, user.id, id)

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: 'Bu lokasyona erisim yetkiniz yok' },
      { status: 403 }
    )
  }

  // Get the organization details
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (orgError || !organization) {
    return NextResponse.json(
      { error: 'Lokasyon bulunamadi' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    data: {
      ...organization,
      role: access.role,
    },
  })
}

/**
 * PUT /api/locations/[id]
 *
 * Updates a location (organization).
 * User must be an admin or owner of the organization.
 *
 * Request body:
 * {
 *   name?: string - Organization name
 *   slug?: string - URL-safe identifier
 *   logo_url?: string - Logo image URL
 *   cover_url?: string - Cover image URL
 *   settings?: object - JSON configuration
 * }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: 'Gecersiz lokasyon ID' },
      { status: 400 }
    )
  }

  // Verify user has admin or higher access
  const access = await verifyAccess(supabase, user.id, id)

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: 'Bu lokasyona erisim yetkiniz yok' },
      { status: 403 }
    )
  }

  if (!hasMinimumRole(access.role!, 'admin')) {
    return NextResponse.json(
      { error: 'Bu islemi gerceklestirmek icin yetkiniz yok' },
      { status: 403 }
    )
  }

  // Parse request body
  let body: {
    name?: string
    slug?: string
    logo_url?: string | null
    cover_url?: string | null
    settings?: Record<string, unknown>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Gecersiz istek formati' },
      { status: 400 }
    )
  }

  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Lokasyon adi bos olamaz' },
        { status: 400 }
      )
    }
    updateData.name = body.name.trim()
  }

  if (body.slug !== undefined) {
    if (typeof body.slug !== 'string' || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'Slug bos olamaz' },
        { status: 400 }
      )
    }

    const newSlug = body.slug.trim().toLowerCase()

    // Check if slug is already taken by another organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', newSlug)
      .neq('id', id)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Bu slug zaten kullaniliyor' },
        { status: 409 }
      )
    }

    updateData.slug = newSlug
  }

  if (body.logo_url !== undefined) {
    updateData.logo_url = body.logo_url
  }

  if (body.cover_url !== undefined) {
    updateData.cover_url = body.cover_url
  }

  if (body.settings !== undefined) {
    updateData.settings = body.settings
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'Guncellenecek alan belirtilmedi' },
      { status: 400 }
    )
  }

  // Perform the update
  const { data: updatedOrg, error: updateError } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    // Check for unique constraint violation
    if (updateError.code === '23505') {
      return NextResponse.json(
        { error: 'Bu slug zaten kullaniliyor' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Lokasyon guncellenirken bir hata olustu' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: {
      ...updatedOrg,
      role: access.role,
    },
  })
}

/**
 * DELETE /api/locations/[id]
 *
 * Deletes a location (organization).
 * Only the owner can delete an organization.
 * This will cascade delete all related data (products, categories, etc.)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = await createSupabaseClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: 'Gecersiz lokasyon ID' },
      { status: 400 }
    )
  }

  // Verify user is the owner
  const access = await verifyAccess(supabase, user.id, id)

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: 'Bu lokasyona erisim yetkiniz yok' },
      { status: 403 }
    )
  }

  if (access.role !== 'owner') {
    return NextResponse.json(
      { error: 'Sadece sahip lokasyonu silebilir' },
      { status: 403 }
    )
  }

  // Check if organization exists
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', id)
    .single()

  if (orgError || !organization) {
    return NextResponse.json(
      { error: 'Lokasyon bulunamadi' },
      { status: 404 }
    )
  }

  // Delete the organization (cascade will handle related data)
  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json(
      { error: 'Lokasyon silinirken bir hata olustu' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Lokasyon basariyla silindi',
    data: { id },
  })
}
