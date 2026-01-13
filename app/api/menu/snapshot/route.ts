import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentMenuSnapshot,
  getSnapshotById,
  getSnapshotByVersion,
  getSnapshotHistory,
  verifySnapshotHash,
  exportSnapshotForCompliance,
} from '@/lib/services/snapshot'

/**
 * Menu Snapshot API Route Handler
 *
 * This route provides endpoints for retrieving menu snapshots for
 * compliance export and audit purposes. Supports:
 * - Get current/latest snapshot for an organization
 * - Get specific snapshot by ID
 * - Get snapshot by version number
 * - Get snapshot history with pagination
 * - Verify snapshot hash integrity
 * - Export snapshot for compliance reporting
 *
 * GET /api/menu/snapshot
 *
 * Query parameters:
 * - organizationId: string (required) - Organization UUID
 * - snapshotId: string (optional) - Get specific snapshot by ID
 * - version: number (optional) - Get specific version
 * - history: boolean (optional) - Get all snapshots (paginated)
 * - verify: boolean (optional) - Include hash verification
 * - export: boolean (optional) - Format for compliance export
 * - limit: number (optional) - Pagination limit (default: 50)
 * - offset: number (optional) - Pagination offset (default: 0)
 *
 * Response:
 * {
 *   success: boolean
 *   data?: MenuSnapshot | MenuSnapshot[] | ComplianceExport
 *   totalCount?: number (for paginated results)
 *   verification?: { isValid: boolean, hash: string }
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
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * GET /api/menu/snapshot
 *
 * Retrieves menu snapshots for compliance export and auditing.
 * User must be authenticated and have access to the organization.
 */
export async function GET(request: NextRequest) {
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

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const organizationId = searchParams.get('organizationId')
  const snapshotId = searchParams.get('snapshotId')
  const versionParam = searchParams.get('version')
  const historyParam = searchParams.get('history')
  const verifyParam = searchParams.get('verify')
  const exportParam = searchParams.get('export')
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')

  // Either organizationId or snapshotId must be provided
  if (!organizationId && !snapshotId) {
    return NextResponse.json(
      {
        success: false,
        error: 'organizationId veya snapshotId parametresi zorunludur',
      },
      { status: 400 }
    )
  }

  // Validate snapshotId format if provided
  if (snapshotId && !isValidUUID(snapshotId)) {
    return NextResponse.json(
      { success: false, error: 'Gecersiz snapshot ID formati' },
      { status: 400 }
    )
  }

  // Validate organizationId format if provided
  if (organizationId && !isValidUUID(organizationId)) {
    return NextResponse.json(
      { success: false, error: 'Gecersiz organizasyon ID formati' },
      { status: 400 }
    )
  }

  // If snapshotId is provided, get that specific snapshot
  if (snapshotId) {
    // First get the snapshot to check organization
    const snapshotResult = await getSnapshotById(snapshotId)

    if (!snapshotResult.success || !snapshotResult.data) {
      return NextResponse.json(
        { success: false, error: snapshotResult.error || 'Snapshot bulunamadi' },
        { status: 404 }
      )
    }

    const snapshot = snapshotResult.data
    const orgId = snapshot.organization_id

    // Verify user has access to this organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { success: false, error: 'Bu snapshot icin yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // Handle export request
    if (exportParam === 'true') {
      const exportResult = await exportSnapshotForCompliance(snapshotId)

      if (!exportResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: exportResult.error || 'Export basarisiz oldu',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: exportResult.data,
      })
    }

    // Handle verification request
    if (verifyParam === 'true') {
      const verificationResult = await verifySnapshotHash(snapshotId)

      return NextResponse.json({
        success: true,
        data: snapshot,
        verification: {
          isValid: verificationResult.isValid,
          storedHash: verificationResult.storedHash,
          computedHash: verificationResult.computedHash,
          verifiedAt: new Date().toISOString(),
        },
      })
    }

    // Return snapshot
    return NextResponse.json({
      success: true,
      data: snapshot,
    })
  }

  // organizationId must be present at this point
  const orgId = organizationId!

  // Verify user has access to this organization
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json(
      { success: false, error: 'Bu organizasyon icin yetkiniz bulunmuyor' },
      { status: 403 }
    )
  }

  // Handle version-specific request
  if (versionParam) {
    const version = parseInt(versionParam, 10)

    if (isNaN(version) || version < 1) {
      return NextResponse.json(
        { success: false, error: 'Gecersiz versiyon numarasi' },
        { status: 400 }
      )
    }

    const versionResult = await getSnapshotByVersion(orgId, version)

    if (!versionResult.success || !versionResult.data) {
      return NextResponse.json(
        { success: false, error: versionResult.error || 'Versiyon bulunamadi' },
        { status: 404 }
      )
    }

    // Handle export request for version
    if (exportParam === 'true') {
      const exportResult = await exportSnapshotForCompliance(
        versionResult.data.id
      )

      if (!exportResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: exportResult.error || 'Export basarisiz oldu',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: exportResult.data,
      })
    }

    // Handle verification request for version
    if (verifyParam === 'true') {
      const verificationResult = await verifySnapshotHash(versionResult.data.id)

      return NextResponse.json({
        success: true,
        data: versionResult.data,
        verification: {
          isValid: verificationResult.isValid,
          storedHash: verificationResult.storedHash,
          computedHash: verificationResult.computedHash,
          verifiedAt: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: versionResult.data,
    })
  }

  // Handle history request (paginated list of all snapshots)
  if (historyParam === 'true') {
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit 1-100 arasinda olmalidir' },
        { status: 400 }
      )
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Gecersiz offset degeri' },
        { status: 400 }
      )
    }

    const historyResult = await getSnapshotHistory(orgId, { limit, offset })

    if (!historyResult.success) {
      return NextResponse.json(
        { success: false, error: historyResult.error || 'Gecmis alinamadi' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: historyResult.data,
      totalCount: historyResult.totalCount,
      pagination: {
        limit,
        offset,
        hasMore:
          historyResult.totalCount !== undefined
            ? offset + limit < historyResult.totalCount
            : historyResult.data.length === limit,
      },
    })
  }

  // Default: Get current (latest) snapshot
  const currentResult = await getCurrentMenuSnapshot(orgId)

  if (!currentResult.success) {
    return NextResponse.json(
      { success: false, error: currentResult.error || 'Snapshot alinamadi' },
      { status: 500 }
    )
  }

  if (!currentResult.data) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bu organizasyon icin henuz yayinlanmis menu bulunmuyor',
      },
      { status: 404 }
    )
  }

  // Handle export request for current snapshot
  if (exportParam === 'true') {
    const exportResult = await exportSnapshotForCompliance(currentResult.data.id)

    if (!exportResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: exportResult.error || 'Export basarisiz oldu',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: exportResult.data,
    })
  }

  // Handle verification request for current snapshot
  if (verifyParam === 'true') {
    const verificationResult = await verifySnapshotHash(currentResult.data.id)

    return NextResponse.json({
      success: true,
      data: currentResult.data,
      verification: {
        isValid: verificationResult.isValid,
        storedHash: verificationResult.storedHash,
        computedHash: verificationResult.computedHash,
        verifiedAt: new Date().toISOString(),
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: currentResult.data,
  })
}
