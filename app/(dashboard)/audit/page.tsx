'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { AuditLog } from '@/types/database'

/**
 * Page size for pagination
 */
const PAGE_SIZE = 20

/**
 * Action type labels in Turkish
 */
const actionLabels: Record<string, string> = {
  create: 'Olusturma',
  update: 'Guncelleme',
  delete: 'Silme',
  price_change: 'Fiyat Degisikligi',
  publish: 'Yayinlama',
  login: 'Giris',
  logout: 'Cikis',
}

/**
 * Entity type labels in Turkish
 */
const entityTypeLabels: Record<string, string> = {
  product: 'Urun',
  category: 'Kategori',
  organization: 'Isletme',
  menu_snapshot: 'Menu Snapshot',
  restaurant_table: 'Masa',
  service_request: 'Servis Istegi',
  price: 'Fiyat',
  user: 'Kullanici',
}

/**
 * Get action badge color
 */
function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    price_change: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    publish: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    login: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    logout: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-400',
  }
  return colors[action] || 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-400'
}

/**
 * Get entity type icon
 */
function EntityTypeIcon({ entityType }: { entityType: string | null }) {
  if (!entityType) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  }

  const icons: Record<string, React.ReactElement> = {
    product: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    category: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    organization: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    restaurant_table: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
    price: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    user: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    menu_snapshot: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    service_request: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  }

  return icons[entityType] || icons.product
}

/**
 * Format date for display in Turkish locale
 */
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Az once'
  if (diffMins < 60) return `${diffMins} dakika once`
  if (diffHours < 24) return `${diffHours} saat once`
  if (diffDays < 7) return `${diffDays} gun once`
  return formatDate(dateString)
}

/**
 * Audit log viewer page
 *
 * Displays a chronological list of all audit log entries for the organization.
 * Supports filtering by action type, entity type, and date range.
 */
export default function AuditPage() {
  const { organization } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  // Filter state
  const [actionFilter, setActionFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  /**
   * Fetch audit logs from the database
   */
  const fetchLogs = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build query with filters
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      // Apply action filter
      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }

      // Apply entity type filter
      if (entityTypeFilter) {
        query = query.eq('entity_type', entityTypeFilter)
      }

      // Apply pagination
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setLogs(data || [])
      setTotalCount(count || 0)
    } catch {
      setError('Denetim kayitlari yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id, actionFilter, entityTypeFilter, currentPage])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [actionFilter, entityTypeFilter])

  /**
   * Get unique action types from logs for filter dropdown
   */
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort()

  /**
   * Get unique entity types from logs for filter dropdown
   */
  const uniqueEntityTypes = Array.from(
    new Set(logs.map(log => log.entity_type).filter(Boolean))
  ).sort() as string[]

  /**
   * Filter logs by search query (client-side)
   */
  const filteredLogs = searchQuery
    ? logs.filter(log => {
        const query = searchQuery.toLowerCase()
        return (
          log.action.toLowerCase().includes(query) ||
          (log.entity_type?.toLowerCase() || '').includes(query) ||
          (log.entity_id?.toLowerCase() || '').includes(query) ||
          JSON.stringify(log.new_data || {}).toLowerCase().includes(query) ||
          JSON.stringify(log.old_data || {}).toLowerCase().includes(query)
        )
      })
    : logs

  /**
   * Calculate pagination info
   */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  /**
   * Format JSON data for display
   */
  const formatJsonData = (data: unknown): string => {
    if (!data) return '-'
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Denetim Kaydi
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Isletmenizde yapilan tum degisikliklerin kronolojik kaydi
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchLogs}
          leftIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Yenile
        </Button>
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

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Search input */}
            <Input
              placeholder="Kayitlarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:col-span-1"
            />

            {/* Action filter */}
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                aria-label="Islem tipi filtresi"
              >
                <option value="">Tum Islemler</option>
                <option value="create">Olusturma</option>
                <option value="update">Guncelleme</option>
                <option value="delete">Silme</option>
                <option value="price_change">Fiyat Degisikligi</option>
                <option value="publish">Yayinlama</option>
                {uniqueActions.filter(a => !['create', 'update', 'delete', 'price_change', 'publish'].includes(a)).map(action => (
                  <option key={action} value={action}>
                    {actionLabels[action] || action}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity type filter */}
            <div>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                aria-label="Varlik tipi filtresi"
              >
                <option value="">Tum Varliklar</option>
                <option value="product">Urunler</option>
                <option value="category">Kategoriler</option>
                <option value="organization">Isletme</option>
                <option value="restaurant_table">Masalar</option>
                <option value="price">Fiyatlar</option>
                <option value="menu_snapshot">Menu Snapshot</option>
                {uniqueEntityTypes.filter(e => !['product', 'category', 'organization', 'restaurant_table', 'price', 'menu_snapshot'].includes(e)).map(entityType => (
                  <option key={entityType} value={entityType}>
                    {entityTypeLabels[entityType] || entityType}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit logs list */}
      <Card>
        <CardHeader
          title="Kayit Listesi"
          subtitle={`Toplam ${totalCount} kayit${filteredLogs.length !== logs.length ? ` (${filteredLogs.length} gosteriliyor)` : ''}`}
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {actionFilter || entityTypeFilter || searchQuery
                  ? 'Filtrelerle eslesen kayit bulunamadi'
                  : 'Henuz denetim kaydi yok'}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {actionFilter || entityTypeFilter || searchQuery
                  ? 'Filtreleri degistirmeyi deneyin'
                  : 'Isletmenizde yapilan degisiklikler burada gorunecek'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {filteredLogs.map(log => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="group flex w-full items-start gap-4 px-2 py-3 text-left transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50"
                >
                  {/* Entity type icon */}
                  <div className="mt-0.5 shrink-0 rounded-lg bg-secondary-100 p-2 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400">
                    <EntityTypeIcon entityType={log.entity_type} />
                  </div>

                  {/* Log details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Action badge */}
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                        {actionLabels[log.action] || log.action}
                      </span>

                      {/* Entity type */}
                      {log.entity_type && (
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">
                          {entityTypeLabels[log.entity_type] || log.entity_type}
                        </span>
                      )}
                    </div>

                    {/* Entity ID or data preview */}
                    <p className="mt-1 truncate text-sm text-secondary-900 dark:text-secondary-100">
                      {log.entity_id ? (
                        <span className="font-mono text-xs">{log.entity_id}</span>
                      ) : log.new_data ? (
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {JSON.stringify(log.new_data).slice(0, 100)}...
                        </span>
                      ) : (
                        <span className="text-secondary-500">-</span>
                      )}
                    </p>

                    {/* Timestamp */}
                    <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>

                  {/* Arrow icon */}
                  <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-secondary-200 pt-4 dark:border-secondary-700">
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Sayfa {currentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={!hasPrevPage}
                >
                  Onceki
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasNextPage}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary statistics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Toplam Kayit
            </p>
            <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              {totalCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Olusturma
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {logs.filter(l => l.action === 'create').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Guncelleme
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {logs.filter(l => l.action === 'update').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Silme
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {logs.filter(l => l.action === 'delete').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Kayit Detayi"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Action and timestamp */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getActionColor(selectedLog.action)}`}>
                {actionLabels[selectedLog.action] || selectedLog.action}
              </span>
              <span className="text-sm text-secondary-500 dark:text-secondary-400">
                {formatDate(selectedLog.created_at)}
              </span>
            </div>

            {/* Entity info */}
            <div className="rounded-lg bg-secondary-50 p-4 dark:bg-secondary-800">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-secondary-500 dark:text-secondary-400">
                    Varlik Tipi
                  </dt>
                  <dd className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {selectedLog.entity_type ? (entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type) : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-secondary-500 dark:text-secondary-400">
                    Varlik ID
                  </dt>
                  <dd className="text-sm font-mono text-secondary-900 dark:text-secondary-100">
                    {selectedLog.entity_id || '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-secondary-500 dark:text-secondary-400">
                    Kullanici ID
                  </dt>
                  <dd className="text-sm font-mono text-secondary-900 dark:text-secondary-100">
                    {selectedLog.user_id || '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Old data */}
            {selectedLog.old_data && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                  Onceki Deger
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg bg-secondary-100 p-3 text-xs text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                  {formatJsonData(selectedLog.old_data)}
                </pre>
              </div>
            )}

            {/* New data */}
            {selectedLog.new_data && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                  Yeni Deger
                </h4>
                <pre className="max-h-48 overflow-auto rounded-lg bg-secondary-100 p-3 text-xs text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                  {formatJsonData(selectedLog.new_data)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setSelectedLog(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
