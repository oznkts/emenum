'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { ServiceRequest, RestaurantTable, ServiceRequestStatus } from '@/types/database'

/**
 * Extended service request with table details
 */
interface ServiceRequestWithTable extends ServiceRequest {
  restaurant_tables: RestaurantTable | null
}

/**
 * Status badge configuration
 */
const STATUS_CONFIG: Record<ServiceRequestStatus, { label: string; bgClass: string; textClass: string }> = {
  pending: {
    label: 'Bekliyor',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  acknowledged: {
    label: 'Goruluyor',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  completed: {
    label: 'Tamamlandi',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
}

/**
 * Request type labels
 */
const REQUEST_TYPE_LABELS: Record<string, string> = {
  waiter_call: 'Garson Cagri',
  bill_request: 'Hesap Istegi',
  help: 'Yardim',
}

/**
 * Format relative time in Turkish
 */
function formatRelativeTime(date: string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return `${diff} saniye once`
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika once`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat once`
  return `${Math.floor(diff / 86400)} gun once`
}

/**
 * Service request item component
 */
function RequestItem({
  request,
  onAcknowledge,
  onComplete,
  isNew,
}: {
  request: ServiceRequestWithTable
  onAcknowledge: (request: ServiceRequestWithTable) => void
  onComplete: (request: ServiceRequestWithTable) => void
  isNew: boolean
}) {
  const statusConfig = STATUS_CONFIG[request.status]
  const tableNumber = request.restaurant_tables?.table_number || 'Bilinmeyen Masa'
  const requestTypeLabel = REQUEST_TYPE_LABELS[request.request_type] || request.request_type

  return (
    <div
      className={`group rounded-lg border-2 p-4 transition-all ${
        request.status === 'pending'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
          : request.status === 'acknowledged'
          ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
          : 'border-secondary-200 bg-white dark:border-secondary-700 dark:bg-secondary-800'
      } ${isNew ? 'animate-pulse ring-2 ring-amber-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Request info */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              request.status === 'pending'
                ? 'bg-amber-200 dark:bg-amber-800'
                : request.status === 'acknowledged'
                ? 'bg-blue-200 dark:bg-blue-800'
                : 'bg-green-200 dark:bg-green-800'
            }`}
          >
            <svg
              className={`h-6 w-6 ${
                request.status === 'pending'
                  ? 'text-amber-700 dark:text-amber-300'
                  : request.status === 'acknowledged'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-green-700 dark:text-green-300'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>

          {/* Details */}
          <div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">{tableNumber}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
              >
                {statusConfig.label}
              </span>
              <span className="text-sm text-secondary-600 dark:text-secondary-400">{requestTypeLabel}</span>
              <span className="text-xs text-secondary-500 dark:text-secondary-500">
                {formatRelativeTime(request.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {request.status === 'pending' && (
            <Button size="sm" variant="primary" onClick={() => onAcknowledge(request)}>
              Goruldu
            </Button>
          )}
          {request.status === 'acknowledged' && (
            <Button size="sm" variant="primary" onClick={() => onComplete(request)}>
              Tamamla
            </Button>
          )}
          {request.status === 'completed' && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tamamlandi
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WaiterPage() {
  const { organization } = useAuth()
  const [requests, setRequests] = useState<ServiceRequestWithTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set())
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'acknowledged' | 'completed'>('all')

  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create audio element for notifications
  useEffect(() => {
    // Create audio element with a simple beep sound (using Web Audio API)
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const createBeep = () => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.stop(audioContext.currentTime + 0.5)
    }

    audioRef.current = {
      play: () => {
        if (soundEnabled) {
          createBeep()
        }
        return Promise.resolve()
      },
    } as unknown as HTMLAudioElement

    return () => {
      audioContext.close()
    }
  }, [soundEnabled])

  /**
   * Fetch service requests from the database
   */
  const fetchRequests = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select(`
          *,
          restaurant_tables (*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (fetchError) throw fetchError
      setRequests((data as ServiceRequestWithTable[]) || [])
    } catch {
      setError('Istekler yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  /**
   * Update request status
   */
  const updateRequestStatus = async (request: ServiceRequestWithTable, status: ServiceRequestStatus) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', request.id)

      if (updateError) throw updateError

      // Update local state
      setRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status } : r))
      )

      // If acknowledging, update table status
      if (status === 'acknowledged' && request.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ current_status: 'occupied' })
          .eq('id', request.table_id)
      }

      // If completing, update table status to empty
      if (status === 'completed' && request.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ current_status: 'empty' })
          .eq('id', request.table_id)
      }
    } catch {
      setError('Durum guncellenirken bir hata olustu.')
    }
  }

  const handleAcknowledge = (request: ServiceRequestWithTable) => {
    updateRequestStatus(request, 'acknowledged')
    // Remove from new requests
    setNewRequestIds((prev) => {
      const next = new Set(prev)
      next.delete(request.id)
      return next
    })
  }

  const handleComplete = (request: ServiceRequestWithTable) => {
    updateRequestStatus(request, 'completed')
  }

  /**
   * Set up Supabase Realtime subscription
   */
  useEffect(() => {
    if (!organization?.id) return

    const supabase = createClient()

    // Subscribe to INSERT events on service_requests table
    const channel = supabase
      .channel(`service_requests:org:${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${organization.id}`,
        },
        async (payload) => {
          // Fetch the full request with table details
          const { data } = await supabase
            .from('service_requests')
            .select(`
              *,
              restaurant_tables (*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            // Add to requests list
            setRequests((prev) => [data as ServiceRequestWithTable, ...prev])

            // Mark as new for animation
            setNewRequestIds((prev) => new Set(prev).add(payload.new.id as string))

            // Play notification sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play()
            }

            // Remove animation after 5 seconds
            setTimeout(() => {
              setNewRequestIds((prev) => {
                const next = new Set(prev)
                next.delete(payload.new.id as string)
                return next
              })
            }, 5000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          // Update the request in local state
          setRequests((prev) =>
            prev.map((r) =>
              r.id === payload.new.id ? { ...r, ...payload.new } : r
            ) as ServiceRequestWithTable[]
          )
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [organization?.id, soundEnabled])

  // Initial fetch
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    if (filter === 'all') return true
    return request.status === filter
  })

  // Stats
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const acknowledgedCount = requests.filter((r) => r.status === 'acknowledged').length
  const completedTodayCount = requests.filter((r) => {
    if (r.status !== 'completed') return false
    const today = new Date().toDateString()
    return new Date(r.created_at).toDateString() === today
  }).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Garson Paneli</h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Gercek zamanli garson cagri bildirimleri
          </p>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center gap-3">
          <Button
            variant={soundEnabled ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            leftIcon={
              soundEnabled ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )
            }
          >
            {soundEnabled ? 'Ses Acik' : 'Ses Kapali'}
          </Button>

          <Button variant="secondary" size="sm" onClick={fetchRequests}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg
                  className="h-6 w-6 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Bekleyen Istek</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filter === 'acknowledged' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilter(filter === 'acknowledged' ? 'all' : 'acknowledged')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="h-6 w-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{acknowledgedCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Islemde</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${filter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedTodayCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Bugun Tamamlanan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
        </span>
        Canli - Yeni istekler otomatik olarak goruntulenecektir
      </div>

      {/* Requests list */}
      <Card>
        <CardHeader
          title="Garson Cagrilari"
          subtitle={
            filter === 'all'
              ? `Toplam ${filteredRequests.length} istek`
              : `${filteredRequests.length} ${STATUS_CONFIG[filter].label.toLowerCase()} istek`
          }
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {filter === 'all' ? 'Henuz istek yok' : `${STATUS_CONFIG[filter].label} istek yok`}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {filter === 'all'
                  ? 'Musteriler garson cagirdiginda burada gorunecektir.'
                  : 'Bu filtreye uyan istek bulunmuyor.'}
              </p>
              {filter !== 'all' && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setFilter('all')}>
                  Tum Istekleri Goster
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <RequestItem
                  key={request.id}
                  request={request}
                  onAcknowledge={handleAcknowledge}
                  onComplete={handleComplete}
                  isNew={newRequestIds.has(request.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <svg
                className="h-4 w-4 text-primary-600 dark:text-primary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Gercek Zamanli Bildirimler
              </h4>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Musteriler masa QR kodunu tarayip &quot;Garson Cagir&quot; butonuna bastiklarinda, istek aninda bu panelde
                gorunecektir. Sesli bildirimleri acik tutarak yeni istekleri kacirmayin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
