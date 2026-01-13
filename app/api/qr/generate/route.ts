import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  generateQRCodeSVG,
  generateQRCodePNG,
  generateQRCodePDF,
  generateAllQRCodeFormats,
  validateSlug,
  type QRCodePNGSize,
  type QRCodeFormat,
  type QRCodeGenerationOptions,
  type QRCodePDFOptions,
} from '@/lib/qrcode/generator'

/**
 * QR Code Generation API Route Handler
 *
 * Generates QR codes for restaurant menus in various formats.
 * Supports SVG, PNG (1024/2048/4096px), and A5 PDF formats.
 *
 * POST /api/qr/generate
 *
 * Request body:
 * {
 *   slug: string (required) - Organization's menu slug
 *   tableId?: string (optional) - Table UUID for table-specific QR codes
 *   format?: 'SVG' | 'PNG' | 'PDF' | 'ALL' (optional, default: 'ALL')
 *   pngSize?: 1024 | 2048 | 4096 (optional, default: 1024, only for PNG format)
 *   options?: {
 *     title?: string - Title for PDF
 *     subtitle?: string - Subtitle for PDF
 *     color?: string - QR code foreground color (default: '#000000')
 *     backgroundColor?: string - QR code background color (default: '#FFFFFF')
 *   }
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   data?: {
 *     svg?: string - SVG string
 *     png1024?: string - PNG data URL at 1024px
 *     png2048?: string - PNG data URL at 2048px
 *     png4096?: string - PNG data URL at 4096px
 *     pdf?: string - PDF data URL
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
interface QRGenerateRequestBody {
  slug?: string
  tableId?: string
  format?: QRCodeFormat | 'ALL'
  pngSize?: QRCodePNGSize
  options?: {
    title?: string
    subtitle?: string
    color?: string
    backgroundColor?: string
  }
}

/**
 * POST /api/qr/generate
 *
 * Generates QR codes for the specified organization menu.
 * User must be authenticated and have access to the organization.
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
  let body: QRGenerateRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gecersiz istek formati' },
      { status: 400 }
    )
  }

  // Validate required slug field
  if (!body.slug || typeof body.slug !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Menu slug degeri zorunludur' },
      { status: 400 }
    )
  }

  const slug = body.slug.trim()

  // Validate slug format
  const slugValidation = validateSlug(slug)
  if (!slugValidation.valid) {
    return NextResponse.json(
      { success: false, error: slugValidation.error },
      { status: 400 }
    )
  }

  // Verify user has access to the organization with this slug
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (orgError || !organization) {
    return NextResponse.json(
      { success: false, error: 'Organizasyon bulunamadi' },
      { status: 404 }
    )
  }

  // Check if user is a member of this organization
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization.id)
    .eq('user_id', user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json(
      { success: false, error: 'Bu organizasyon icin yetkiniz bulunmuyor' },
      { status: 403 }
    )
  }

  // If tableId is provided, verify it belongs to this organization
  const tableId = body.tableId?.trim()
  if (tableId) {
    const { data: table, error: tableError } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('qr_uuid', tableId)
      .eq('organization_id', organization.id)
      .single()

    if (tableError || !table) {
      return NextResponse.json(
        { success: false, error: 'Masa bulunamadi veya bu organizasyona ait degil' },
        { status: 404 }
      )
    }
  }

  // Prepare generation options
  const generationOptions: QRCodePDFOptions = {
    title: body.options?.title,
    subtitle: body.options?.subtitle,
    color: body.options?.color,
    backgroundColor: body.options?.backgroundColor,
  }

  // Determine format to generate
  const format = body.format?.toUpperCase() as QRCodeFormat | 'ALL' | undefined
  const validFormats = ['SVG', 'PNG', 'PDF', 'ALL']
  const requestedFormat = format && validFormats.includes(format) ? format : 'ALL'

  try {
    // Generate QR codes based on requested format
    if (requestedFormat === 'ALL') {
      // Generate all formats
      const result = await generateAllQRCodeFormats(slug, tableId, generationOptions)

      if (!result.success && result.errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: result.errors.join(', '),
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          svg: result.svg,
          png1024: result.png1024,
          png2048: result.png2048,
          png4096: result.png4096,
          pdf: result.pdf,
        },
      })
    }

    if (requestedFormat === 'SVG') {
      const result = await generateQRCodeSVG(slug, tableId, generationOptions)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { svg: result.data },
      })
    }

    if (requestedFormat === 'PNG') {
      // Validate PNG size
      const pngSize = body.pngSize || 1024
      const validSizes: QRCodePNGSize[] = [1024, 2048, 4096]

      if (!validSizes.includes(pngSize)) {
        return NextResponse.json(
          {
            success: false,
            error: `Gecersiz PNG boyutu. Desteklenen boyutlar: ${validSizes.join(', ')}`,
          },
          { status: 400 }
        )
      }

      const result = await generateQRCodePNG(
        slug,
        pngSize,
        tableId,
        generationOptions as QRCodeGenerationOptions
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      // Return with the size-specific key
      const pngKey = `png${pngSize}` as 'png1024' | 'png2048' | 'png4096'
      return NextResponse.json({
        success: true,
        data: { [pngKey]: result.data },
      })
    }

    if (requestedFormat === 'PDF') {
      const result = await generateQRCodePDF(slug, tableId, generationOptions)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: { pdf: result.data },
      })
    }

    // This should never be reached due to validation above
    return NextResponse.json(
      { success: false, error: 'Gecersiz format' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `QR kodu olusturulurken bir hata olustu: ${
          error instanceof Error ? error.message : 'Bilinmeyen hata'
        }`,
      },
      { status: 500 }
    )
  }
}
