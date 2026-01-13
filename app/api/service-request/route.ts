import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Service Request API Route Handler
 *
 * Creates waiter call / service requests from customers.
 * This is a public endpoint - no authentication required since customers
 * scan QR codes without logging in.
 *
 * POST /api/service-request
 *
 * Request body:
 * {
 *   tableId: string (required) - Table's qr_uuid from the QR code URL
 *   requestType?: 'waiter_call' | 'bill_request' | 'other' (optional, default: 'waiter_call')
 *   notes?: string (optional) - Additional message from customer
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   data?: {
 *     requestId: string - Created service request ID
 *     tableNumber: string - Human-readable table number
 *   }
 *   error?: string
 * }
 *
 * Features:
 * - Spam prevention: 30-second cooldown between requests per table
 * - Table status update: Sets table to 'service_needed'
 * - Triggers Supabase Realtime notification for waiters
 */

/**
 * Request type enum matching database CHECK constraint
 */
type ServiceRequestType = 'waiter_call' | 'bill_request' | 'other'

/**
 * Request body interface
 */
interface ServiceRequestBody {
  tableId?: string
  requestType?: ServiceRequestType
  notes?: string
}

/**
 * Spam prevention interval in milliseconds (30 seconds)
 */
const SPAM_PREVENTION_INTERVAL_MS = 30 * 1000

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
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * POST /api/service-request
 *
 * Creates a service request (waiter call) for a table.
 * Public endpoint - no authentication required.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseClient()

  // Parse request body
  let body: ServiceRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gecersiz istek formati' },
      { status: 400 }
    )
  }

  // Validate required tableId field
  if (!body.tableId || typeof body.tableId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Masa bilgisi (tableId) zorunludur' },
      { status: 400 }
    )
  }

  const tableId = body.tableId.trim()

  // Validate UUID format
  if (!isValidUUID(tableId)) {
    return NextResponse.json(
      { success: false, error: 'Gecersiz masa kimlik formati' },
      { status: 400 }
    )
  }

  // Validate request type
  const validRequestTypes: ServiceRequestType[] = [
    'waiter_call',
    'bill_request',
    'other',
  ]
  const requestType: ServiceRequestType =
    body.requestType && validRequestTypes.includes(body.requestType)
      ? body.requestType
      : 'waiter_call'

  // Validate notes length (prevent abuse)
  const notes = body.notes?.trim().slice(0, 500) || null

  // Fetch table by qr_uuid
  const { data: table, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('id, organization_id, table_number, last_ping_at, is_active')
    .eq('qr_uuid', tableId)
    .single()

  if (tableError || !table) {
    return NextResponse.json(
      { success: false, error: 'Masa bulunamadi' },
      { status: 404 }
    )
  }

  // Check if table is active
  if (!table.is_active) {
    return NextResponse.json(
      { success: false, error: 'Bu masa aktif degil' },
      { status: 400 }
    )
  }

  // Spam prevention: Check last_ping_at
  if (table.last_ping_at) {
    const lastPing = new Date(table.last_ping_at).getTime()
    const now = Date.now()

    if (now - lastPing < SPAM_PREVENTION_INTERVAL_MS) {
      const remainingSeconds = Math.ceil(
        (SPAM_PREVENTION_INTERVAL_MS - (now - lastPing)) / 1000
      )
      return NextResponse.json(
        {
          success: false,
          error: `Lutfen ${remainingSeconds} saniye bekleyin`,
        },
        { status: 429 } // Too Many Requests
      )
    }
  }

  // Create service request
  const { data: serviceRequest, error: insertError } = await supabase
    .from('service_requests')
    .insert({
      organization_id: table.organization_id,
      table_id: table.id,
      request_type: requestType,
      status: 'pending',
      notes: notes,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Servis istegi olusturulamadi. Lutfen tekrar deneyin.',
      },
      { status: 500 }
    )
  }

  // Update table status and last_ping_at for spam prevention
  const { error: updateError } = await supabase
    .from('restaurant_tables')
    .update({
      current_status: 'service_needed',
      last_ping_at: new Date().toISOString(),
    })
    .eq('id', table.id)

  if (updateError) {
    // Log but don't fail - the service request was created successfully
    // The table status update is a secondary operation
  }

  return NextResponse.json({
    success: true,
    data: {
      requestId: serviceRequest.id,
      tableNumber: table.table_number,
    },
  })
}
