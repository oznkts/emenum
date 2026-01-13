import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Locations API Route Handler
 *
 * Handles CRUD operations for organizations (locations/restaurants)
 * Organizations represent physical restaurant/cafe locations in the multi-tenant system.
 *
 * GET /api/locations - List all locations the user has access to
 * POST /api/locations - Create a new location
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
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

/**
 * GET /api/locations
 *
 * Returns all locations (organizations) that the authenticated user has access to.
 * Response includes organization details and the user's role in each.
 */
export async function GET() {
  const supabase = await createSupabaseClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Get all organizations the user is a member of
  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        logo_url,
        cover_url,
        settings,
        is_active,
        created_at
      )
    `)
    .eq('user_id', user.id)

  if (membershipsError) {
    return NextResponse.json(
      { error: 'Lokasyonlar yuklenirken bir hata olustu' },
      { status: 500 }
    )
  }

  // Transform the data to include role with each organization
  // Note: membership.organizations is a single object (one organization per membership)
  interface OrganizationData {
    id: string
    name: string
    slug: string
    logo_url: string | null
    cover_url: string | null
    settings: Record<string, unknown>
    is_active: boolean
    created_at: string
  }

  const locations = (memberships || [])
    .filter((m) => m.organizations !== null)
    .map((membership) => {
      const org = membership.organizations as unknown as OrganizationData
      return {
        ...org,
        role: membership.role,
      }
    })

  return NextResponse.json({ data: locations })
}

/**
 * POST /api/locations
 *
 * Creates a new location (organization) and assigns the creating user as owner.
 *
 * Request body:
 * {
 *   name: string (required) - Organization name
 *   slug?: string (optional) - URL-safe identifier, auto-generated if not provided
 *   logo_url?: string (optional) - Logo image URL
 *   cover_url?: string (optional) - Cover image URL
 *   settings?: object (optional) - JSON configuration
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Oturum acmaniz gerekiyor' },
      { status: 401 }
    )
  }

  // Parse request body
  let body: {
    name?: string
    slug?: string
    logo_url?: string
    cover_url?: string
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

  // Validate required fields
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Lokasyon adi zorunludur' },
      { status: 400 }
    )
  }

  const name = body.name.trim()

  // Generate or validate slug
  const slug = body.slug?.trim() || generateSlug(name)

  // Ensure slug uniqueness by checking and appending numbers if needed
  let slugAttempt = 0
  let finalSlug = slug
  let slugExists = true

  while (slugExists) {
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', finalSlug)
      .single()

    if (existingOrg) {
      slugAttempt++
      finalSlug = `${slug}-${slugAttempt}`
    } else {
      slugExists = false
    }

    // Prevent infinite loop
    if (slugAttempt > 100) {
      return NextResponse.json(
        { error: 'Benzersiz URL olusturulamadi, lutfen slug belirtin' },
        { status: 400 }
      )
    }
  }

  // Create the organization
  const { data: newOrganization, error: createError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: finalSlug,
      logo_url: body.logo_url || null,
      cover_url: body.cover_url || null,
      settings: body.settings || {},
      is_active: false, // Organizations start inactive, must be activated by super admin
    })
    .select()
    .single()

  if (createError) {
    // Check for unique constraint violation
    if (createError.code === '23505') {
      return NextResponse.json(
        { error: 'Bu slug zaten kullaniliyor' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Lokasyon olusturulurken bir hata olustu' },
      { status: 500 }
    )
  }

  // Add the creating user as owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: newOrganization.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    // Rollback: delete the organization if we can't add the member
    await supabase
      .from('organizations')
      .delete()
      .eq('id', newOrganization.id)

    return NextResponse.json(
      { error: 'Kullanici atanirken bir hata olustu' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      data: {
        ...newOrganization,
        role: 'owner',
      },
    },
    { status: 201 }
  )
}
