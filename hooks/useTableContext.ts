'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantTable } from '@/types/database'

/**
 * Local storage key for persisting table context
 */
const TABLE_CONTEXT_KEY = 'e-menum-table-context'

/**
 * Table context value stored in localStorage
 */
interface StoredTableContext {
  table_id: string
  timestamp: number
}

/**
 * Table context state interface
 */
export interface TableContextState {
  /** Current table UUID (from QR code or localStorage) */
  tableId: string | null
  /** Table details from database (if fetched) */
  table: RestaurantTable | null
  /** Whether table info is being loaded */
  isLoading: boolean
  /** Error message if table fetch failed */
  error: string | null
  /** Whether a service request is in progress */
  isCallingWaiter: boolean
}

/**
 * Table context actions interface
 */
export interface TableContextActions {
  /** Clear the stored table context */
  clearTableContext: () => void
  /** Manually set a table ID */
  setTableId: (tableId: string) => void
  /** Refresh table data from database */
  refreshTable: () => Promise<void>
  /** Call waiter for this table */
  callWaiter: (requestType?: string) => Promise<{ success: boolean; error?: string }>
}

/**
 * Complete table context value
 */
export type TableContextValue = TableContextState & TableContextActions

/**
 * Options for useTableContext hook
 */
export interface UseTableContextOptions {
  /** Whether to automatically fetch table details from database (default: true) */
  fetchTableDetails?: boolean
  /** Context expiry time in milliseconds (default: 4 hours) */
  expiryMs?: number
}

/**
 * Default expiry time: 4 hours (typical restaurant visit duration)
 */
const DEFAULT_EXPIRY_MS = 4 * 60 * 60 * 1000

/**
 * Hook to manage table context from QR code URL parameter
 *
 * This hook implements the table-aware QR functionality as specified in ek_ozellikler.md:
 * 1. Reads `table_id` from URL query parameter (e.g., ?table_id=uuid-hash)
 * 2. Persists table context to localStorage for session continuity
 * 3. Optionally fetches table details from Supabase
 * 4. Provides waiter call functionality
 *
 * @example
 * ```tsx
 * function MenuPage() {
 *   const {
 *     tableId,
 *     table,
 *     isLoading,
 *     callWaiter,
 *     isCallingWaiter
 *   } = useTableContext()
 *
 *   if (tableId && table) {
 *     return (
 *       <div>
 *         <p>Masa: {table.table_number}</p>
 *         <button
 *           onClick={() => callWaiter()}
 *           disabled={isCallingWaiter}
 *         >
 *           Garson Cagir
 *         </button>
 *       </div>
 *     )
 *   }
 *
 *   return <div>Musteriler icin acik menu</div>
 * }
 * ```
 *
 * @param options - Configuration options
 * @returns TableContextValue - Table context state and actions
 */
export function useTableContext(
  options: UseTableContextOptions = {}
): TableContextValue {
  const { fetchTableDetails = true, expiryMs = DEFAULT_EXPIRY_MS } = options

  const searchParams = useSearchParams()

  // State
  const [tableId, setTableIdState] = useState<string | null>(null)
  const [table, setTable] = useState<RestaurantTable | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCallingWaiter, setIsCallingWaiter] = useState(false)

  // Create Supabase client (memoized)
  const supabase = useMemo(() => createClient(), [])

  /**
   * Load table context from localStorage
   */
  const loadStoredContext = useCallback((): string | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(TABLE_CONTEXT_KEY)
      if (!stored) return null

      const context: StoredTableContext = JSON.parse(stored)

      // Check if context is expired
      if (Date.now() - context.timestamp > expiryMs) {
        localStorage.removeItem(TABLE_CONTEXT_KEY)
        return null
      }

      return context.table_id
    } catch {
      // Invalid stored data, clear it
      localStorage.removeItem(TABLE_CONTEXT_KEY)
      return null
    }
  }, [expiryMs])

  /**
   * Save table context to localStorage
   */
  const saveContext = useCallback((id: string) => {
    if (typeof window === 'undefined') return

    const context: StoredTableContext = {
      table_id: id,
      timestamp: Date.now(),
    }
    localStorage.setItem(TABLE_CONTEXT_KEY, JSON.stringify(context))
  }, [])

  /**
   * Clear stored table context
   */
  const clearTableContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TABLE_CONTEXT_KEY)
    }
    setTableIdState(null)
    setTable(null)
    setError(null)
  }, [])

  /**
   * Manually set a table ID
   */
  const setTableId = useCallback(
    (id: string) => {
      setTableIdState(id)
      saveContext(id)
    },
    [saveContext]
  )

  /**
   * Fetch table details from database
   */
  const fetchTable = useCallback(
    async (id: string): Promise<RestaurantTable | null> => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('qr_uuid', id)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Not found
            setError('Masa bulunamadi')
            return null
          }
          throw fetchError
        }

        return data as RestaurantTable
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Masa bilgisi yuklenemedi'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Refresh table data from database
   */
  const refreshTable = useCallback(async () => {
    if (!tableId) return
    const tableData = await fetchTable(tableId)
    setTable(tableData)
  }, [tableId, fetchTable])

  /**
   * Call waiter for this table
   */
  const callWaiter = useCallback(
    async (
      requestType: string = 'waiter_call'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!tableId || !table) {
        return {
          success: false,
          error: 'Masa bilgisi bulunamadi',
        }
      }

      try {
        setIsCallingWaiter(true)

        // Check for spam prevention (minimum 30 seconds between calls)
        if (table.last_ping_at) {
          const lastPing = new Date(table.last_ping_at).getTime()
          const now = Date.now()
          const minInterval = 30 * 1000 // 30 seconds

          if (now - lastPing < minInterval) {
            const remaining = Math.ceil((minInterval - (now - lastPing)) / 1000)
            return {
              success: false,
              error: `Lutfen ${remaining} saniye bekleyin`,
            }
          }
        }

        // Create service request
        const { error: requestError } = await supabase
          .from('service_requests')
          .insert({
            organization_id: table.organization_id,
            table_id: table.id,
            request_type: requestType,
            status: 'pending',
          })

        if (requestError) throw requestError

        // Update table's last_ping_at for spam prevention
        await supabase
          .from('restaurant_tables')
          .update({
            last_ping_at: new Date().toISOString(),
            current_status: 'service_needed',
          })
          .eq('id', table.id)

        // Refresh table data to get updated status
        await refreshTable()

        return { success: true }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Garson cagrisi gonderilemedi'
        return { success: false, error: message }
      } finally {
        setIsCallingWaiter(false)
      }
    },
    [tableId, table, supabase, refreshTable]
  )

  /**
   * Initialize table context from URL params or localStorage
   */
  useEffect(() => {
    const initTableContext = async () => {
      // Priority 1: URL parameter
      const urlTableId = searchParams?.get('table_id')

      if (urlTableId) {
        setTableIdState(urlTableId)
        saveContext(urlTableId)

        if (fetchTableDetails) {
          const tableData = await fetchTable(urlTableId)
          setTable(tableData)
        } else {
          setIsLoading(false)
        }
        return
      }

      // Priority 2: localStorage
      const storedTableId = loadStoredContext()

      if (storedTableId) {
        setTableIdState(storedTableId)

        if (fetchTableDetails) {
          const tableData = await fetchTable(storedTableId)
          setTable(tableData)
        } else {
          setIsLoading(false)
        }
        return
      }

      // No table context available
      setIsLoading(false)
    }

    initTableContext()
  }, [searchParams, saveContext, loadStoredContext, fetchTableDetails, fetchTable])

  return {
    // State
    tableId,
    table,
    isLoading,
    error,
    isCallingWaiter,
    // Actions
    clearTableContext,
    setTableId,
    refreshTable,
    callWaiter,
  }
}

/**
 * Check if current session has a table context
 * (Useful for conditional rendering without full hook)
 */
export function hasStoredTableContext(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(TABLE_CONTEXT_KEY)
    if (!stored) return false

    const context: StoredTableContext = JSON.parse(stored)
    const expired = Date.now() - context.timestamp > DEFAULT_EXPIRY_MS

    return !expired && Boolean(context.table_id)
  } catch {
    return false
  }
}

/**
 * Get stored table ID without hook (for server components or SSR checks)
 */
export function getStoredTableId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(TABLE_CONTEXT_KEY)
    if (!stored) return null

    const context: StoredTableContext = JSON.parse(stored)
    const expired = Date.now() - context.timestamp > DEFAULT_EXPIRY_MS

    if (expired) {
      localStorage.removeItem(TABLE_CONTEXT_KEY)
      return null
    }

    return context.table_id
  } catch {
    return false as unknown as string | null
  }
}
