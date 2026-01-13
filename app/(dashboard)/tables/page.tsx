'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { generateQRCodeSVG, generateQRCodePNG, generateQRCodePDF } from '@/lib/qrcode/generator'
import type { RestaurantTable, TableStatus } from '@/types/database'

/**
 * Status badge colors and labels
 */
const STATUS_CONFIG: Record<TableStatus, { label: string; bgClass: string; textClass: string }> = {
  empty: {
    label: 'Bos',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  occupied: {
    label: 'Dolu',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  service_needed: {
    label: 'Garson Bekliyor',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
}

/**
 * Table list item component
 */
function TableListItem({
  table,
  organizationSlug,
  onEdit,
  onDelete,
  onStatusChange,
  onDownloadQR,
}: {
  table: RestaurantTable
  organizationSlug: string
  onEdit: (table: RestaurantTable) => void
  onDelete: (table: RestaurantTable) => void
  onStatusChange: (table: RestaurantTable, status: TableStatus) => void
  onDownloadQR: (table: RestaurantTable, format: 'svg' | 'png' | 'pdf') => void
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const statusConfig = table.current_status ? STATUS_CONFIG[table.current_status] : null

  // Generate QR preview on demand
  const loadQRPreview = useCallback(async () => {
    if (!organizationSlug || !table.qr_uuid) return
    const result = await generateQRCodeSVG(organizationSlug, table.qr_uuid)
    if (result.success && result.data) {
      setQrPreview(result.data)
    }
  }, [organizationSlug, table.qr_uuid])

  // Load QR when modal opens
  useEffect(() => {
    if (showQRModal && !qrPreview) {
      loadQRPreview()
    }
  }, [showQRModal, qrPreview, loadQRPreview])

  const handleDownload = async (format: 'svg' | 'png' | 'pdf') => {
    setIsDownloading(true)
    await onDownloadQR(table, format)
    setIsDownloading(false)
  }

  return (
    <>
      <div className="group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
        {/* Table icon/number */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
          <svg
            className="h-6 w-6 text-primary-600 dark:text-primary-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
        </div>

        {/* Table info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
              {table.table_number}
            </p>
            {statusConfig && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-secondary-500 dark:text-secondary-400 truncate">
            QR: {table.qr_uuid.slice(0, 8)}...
          </p>
        </div>

        {/* Status selector */}
        <div className="shrink-0">
          <select
            value={table.current_status || 'empty'}
            onChange={(e) => onStatusChange(table, e.target.value as TableStatus)}
            className="rounded-lg border border-secondary-300 bg-white px-2 py-1 text-sm text-secondary-700 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-300"
          >
            <option value="empty">Bos</option>
            <option value="occupied">Dolu</option>
            <option value="service_needed">Garson Bekliyor</option>
          </select>
        </div>

        {/* QR Code button */}
        <button
          type="button"
          onClick={() => setShowQRModal(true)}
          className="shrink-0 rounded p-2 text-secondary-500 hover:bg-secondary-200 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
          aria-label="QR Kod"
          title="QR Kod"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(table)}
            className="rounded p-1.5 text-secondary-500 hover:bg-secondary-200 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
            aria-label="Duzenle"
            title="Duzenle"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(table)}
            className="rounded p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
            aria-label="Sil"
            title="Sil"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title={`${table.table_number} - QR Kod`}>
        <div className="space-y-4">
          {/* QR Preview */}
          <div className="flex justify-center rounded-lg border border-secondary-200 bg-white p-6 dark:border-secondary-700 dark:bg-secondary-800">
            {qrPreview ? (
              <div
                className="h-48 w-48"
                dangerouslySetInnerHTML={{ __html: qrPreview }}
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              </div>
            )}
          </div>

          <p className="text-center text-sm text-secondary-500 dark:text-secondary-400">
            Bu QR kod, musteri taradiginda otomatik olarak <strong>{table.table_number}</strong> masasini tanimlayacaktir.
          </p>

          {/* Download buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Indir:</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload('svg')}
                disabled={isDownloading}
              >
                SVG
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload('png')}
                disabled={isDownloading}
              >
                PNG
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload('pdf')}
                disabled={isDownloading}
              >
                PDF (A5)
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowQRModal(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default function TablesPage() {
  const { organization } = useAuth()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    table_number: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Fetch tables from the database
   */
  const fetchTables = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('organization_id', organization.id)
        .order('table_number', { ascending: true })

      if (fetchError) throw fetchError
      setTables(data || [])
    } catch {
      setError('Masalar yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  /**
   * Open modal for adding a new table
   */
  const handleAddTable = () => {
    setEditingTable(null)
    setFormData({
      table_number: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Open modal for editing a table
   */
  const handleEditTable = (table: RestaurantTable) => {
    setEditingTable(table)
    setFormData({
      table_number: table.table_number,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Handle form submission for add/edit
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organization?.id) return

    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      if (editingTable) {
        // Update existing table
        const { error: updateError } = await supabase
          .from('restaurant_tables')
          .update({
            table_number: formData.table_number.trim(),
          })
          .eq('id', editingTable.id)

        if (updateError) throw updateError
      } else {
        // Create new table - qr_uuid will be generated by the database
        const { error: insertError } = await supabase.from('restaurant_tables').insert({
          table_number: formData.table_number.trim(),
          organization_id: organization.id,
          current_status: 'empty' as TableStatus,
        })

        if (insertError) throw insertError
      }

      setIsModalOpen(false)
      await fetchTables()
    } catch {
      setFormError('Masa kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Update table status
   */
  const handleStatusChange = async (table: RestaurantTable, status: TableStatus) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('restaurant_tables')
        .update({ current_status: status })
        .eq('id', table.id)

      if (updateError) throw updateError
      await fetchTables()
    } catch {
      setError('Masa durumu guncellenirken bir hata olustu.')
    }
  }

  /**
   * Delete a table
   */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('id', deleteTarget.id)

      if (deleteError) throw deleteError

      setDeleteTarget(null)
      await fetchTables()
    } catch {
      setError('Masa silinirken bir hata olustu.')
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Download QR code in specified format
   */
  const handleDownloadQR = async (table: RestaurantTable, format: 'svg' | 'png' | 'pdf') => {
    if (!organization?.slug || !table.qr_uuid) return

    try {
      let data: string | undefined
      let mimeType: string
      let extension: string

      if (format === 'svg') {
        const result = await generateQRCodeSVG(organization.slug, table.qr_uuid)
        if (!result.success || !result.data) throw new Error(result.error)
        data = result.data
        mimeType = 'image/svg+xml'
        extension = 'svg'
      } else if (format === 'png') {
        const result = await generateQRCodePNG(organization.slug, 2048, table.qr_uuid)
        if (!result.success || !result.data) throw new Error(result.error)
        data = result.data
        mimeType = 'image/png'
        extension = 'png'
      } else {
        const result = await generateQRCodePDF(organization.slug, table.qr_uuid, {
          title: organization.name,
          subtitle: `Masa: ${table.table_number}`,
        })
        if (!result.success || !result.data) throw new Error(result.error)
        data = result.data
        mimeType = 'application/pdf'
        extension = 'pdf'
      }

      // Create download
      const filename = `${organization.slug}-${table.table_number.toLowerCase().replace(/\s+/g, '-')}-qr.${extension}`

      if (format === 'svg') {
        // SVG is raw string, create blob
        const blob = new Blob([data!], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // PNG and PDF are data URLs
        const a = document.createElement('a')
        a.href = data!
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch {
      setError('QR kod indirilirken bir hata olustu.')
    }
  }

  // Stats
  const emptyCount = tables.filter((t) => t.current_status === 'empty' || !t.current_status).length
  const occupiedCount = tables.filter((t) => t.current_status === 'occupied').length
  const serviceNeededCount = tables.filter((t) => t.current_status === 'service_needed').length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">Masalar</h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Restoran masalarinizi yonetin ve QR kodlarini indirin
          </p>
        </div>
        <Button
          onClick={handleAddTable}
          leftIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Yeni Masa
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{emptyCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Bos Masa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{occupiedCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Dolu Masa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <svg
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
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
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">{serviceNeededCount}</p>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">Garson Bekliyor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables list */}
      <Card>
        <CardHeader title="Masa Listesi" subtitle={`Toplam ${tables.length} masa`} />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : tables.length === 0 ? (
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
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">Henuz masa yok</h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Ilk masanizi olusturarak baslayin.
              </p>
              <div className="mt-6">
                <Button onClick={handleAddTable} size="sm">
                  Yeni Masa
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {tables.map((table) => (
                <TableListItem
                  key={table.id}
                  table={table}
                  organizationSlug={organization?.slug || ''}
                  onEdit={handleEditTable}
                  onDelete={setDeleteTarget}
                  onStatusChange={handleStatusChange}
                  onDownloadQR={handleDownloadQR}
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
                Masa Bazli QR Kodlar
              </h4>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Her masa icin olusturulan QR kodlar benzersiz bir kimlik icermektedir. Musteriler bu QR kodu
                taradiginda, sistem otomatik olarak hangi masada olduklarini tanimlayacak ve garson cagirma
                isteklerini dogru masaya yonlendirecektir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTable ? 'Masa Duzenle' : 'Yeni Masa'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {formError && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                role="alert"
              >
                {formError}
              </div>
            )}

            <Input
              label="Masa Numarasi / Adi"
              value={formData.table_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, table_number: e.target.value }))}
              placeholder="Ornegin: Masa 1, Bahce-3, Teras VIP"
              helperText="Benzersiz ve tanimlayici bir isim verin"
              required
              disabled={isSaving}
            />

            {!editingTable && (
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                Masa olusturulunca otomatik olarak benzersiz bir QR kodu uretilecektir.
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingTable ? 'Guncelle' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Masa Sil">
        <div className="space-y-4">
          <p className="text-secondary-600 dark:text-secondary-400">
            <span className="font-medium text-secondary-900 dark:text-secondary-100">
              {deleteTarget?.table_number}
            </span>{' '}
            masasini silmek istediginize emin misiniz? Bu islem geri alinamaz ve bu masaya ait QR kodlar gecersiz
            olacaktir.
          </p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Iptal
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteConfirm} isLoading={isDeleting}>
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
