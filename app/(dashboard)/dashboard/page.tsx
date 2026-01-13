'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import {
  generateQRCodeSVG,
  generateQRCodePNG,
  generateQRCodePDF,
  type QRCodePNGSize,
} from '@/lib/qrcode/generator'

/**
 * Dashboard statistics interface
 */
interface DashboardStats {
  totalCategories: number
  totalProducts: number
  visibleProducts: number
  totalTables: number
  pendingServiceRequests: number
}

/**
 * QR download format options
 */
type QRFormat = 'svg' | 'png-1024' | 'png-2048' | 'png-4096' | 'pdf'

/**
 * Main dashboard page
 *
 * Displays organization overview, statistics, and QR code download functionality.
 */
export default function DashboardPage() {
  const { organization, membership } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // QR Code state
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [downloadingFormat, setDownloadingFormat] = useState<QRFormat | null>(null)

  /**
   * Fetch dashboard statistics
   */
  const fetchStats = useCallback(async () => {
    if (!organization?.id) return

    setIsLoadingStats(true)
    setStatsError(null)

    try {
      const supabase = createClient()

      // Fetch all stats in parallel
      const [categoriesRes, productsRes, tablesRes, requestsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('products')
          .select('id, is_visible')
          .eq('organization_id', organization.id),
        supabase
          .from('restaurant_tables')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id),
        supabase
          .from('service_requests')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'pending'),
      ])

      const products = productsRes.data || []

      setStats({
        totalCategories: categoriesRes.count || 0,
        totalProducts: products.length,
        visibleProducts: products.filter(p => p.is_visible).length,
        totalTables: tablesRes.count || 0,
        pendingServiceRequests: requestsRes.count || 0,
      })
    } catch {
      setStatsError('Istatistikler yuklenirken bir hata olustu.')
    } finally {
      setIsLoadingStats(false)
    }
  }, [organization?.id])

  /**
   * Generate QR code preview
   */
  const generateQRPreview = useCallback(async () => {
    if (!organization?.slug) return

    setIsGeneratingQR(true)
    setQrError(null)

    try {
      const result = await generateQRCodeSVG(organization.slug)

      if (result.success && result.data) {
        setQrSvg(result.data)
      } else {
        setQrError(result.error || 'QR kodu olusturulamadi')
      }
    } catch {
      setQrError('QR kodu olusturulurken bir hata olustu.')
    } finally {
      setIsGeneratingQR(false)
    }
  }, [organization?.slug])

  // Fetch data on mount
  useEffect(() => {
    fetchStats()
    generateQRPreview()
  }, [fetchStats, generateQRPreview])

  /**
   * Download QR code in specified format
   */
  const handleDownloadQR = async (format: QRFormat) => {
    if (!organization?.slug) return

    setDownloadingFormat(format)
    setQrError(null)

    try {
      let dataUrl: string | undefined
      let filename: string
      let mimeType: string

      if (format === 'svg') {
        const result = await generateQRCodeSVG(organization.slug)
        if (result.success && result.data) {
          // Convert SVG string to data URL
          const blob = new Blob([result.data], { type: 'image/svg+xml' })
          dataUrl = URL.createObjectURL(blob)
          filename = `${organization.slug}-qr.svg`
          mimeType = 'image/svg+xml'

          // Download
          const link = document.createElement('a')
          link.href = dataUrl
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(dataUrl)
          return
        } else {
          throw new Error(result.error)
        }
      } else if (format.startsWith('png-')) {
        const size = parseInt(format.split('-')[1]) as QRCodePNGSize
        const result = await generateQRCodePNG(organization.slug, size)
        if (result.success && result.data) {
          dataUrl = result.data
          filename = `${organization.slug}-qr-${size}px.png`
          mimeType = 'image/png'
        } else {
          throw new Error(result.error)
        }
      } else if (format === 'pdf') {
        const result = await generateQRCodePDF(organization.slug, undefined, {
          title: organization.name,
          subtitle: 'Menu icin QR kodu tarayin',
        })
        if (result.success && result.data) {
          dataUrl = result.data
          filename = `${organization.slug}-qr.pdf`
          mimeType = 'application/pdf'
        } else {
          throw new Error(result.error)
        }
      }

      if (dataUrl) {
        // Download file
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = filename!
        link.type = mimeType!
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      setQrError(`QR kodu indirilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
    } finally {
      setDownloadingFormat(null)
    }
  }

  /**
   * Format stat number for display
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('tr-TR').format(num)
  }

  // Quick action cards
  const quickActions = [
    {
      title: 'Yeni Urun Ekle',
      description: 'Menunuze yeni bir urun ekleyin',
      href: '/products/new',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'Kategorileri Yonet',
      description: 'Menu kategorilerinizi duzenleyin',
      href: '/categories',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'Masalari Yonet',
      description: 'Masa QR kodlarini olusturun',
      href: '/tables',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: 'Ayarlari Duzenle',
      description: 'Isletme bilgilerinizi guncelleyin',
      href: '/settings',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Hos Geldiniz
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {organization?.name || 'Isletmeniz'} yonetim panelinize hos geldiniz
          </p>
        </div>
        {organization?.slug && (
          <Link
            href={`/menu/${organization.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Menuyu Gor
          </Link>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Categories stat */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Toplam Kategori
                </p>
                <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {isLoadingStats ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-secondary-200 dark:bg-secondary-700" />
                  ) : (
                    formatNumber(stats?.totalCategories || 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products stat */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Toplam Urun
                </p>
                <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {isLoadingStats ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-secondary-200 dark:bg-secondary-700" />
                  ) : (
                    formatNumber(stats?.totalProducts || 0)
                  )}
                </p>
                {stats && stats.visibleProducts < stats.totalProducts && (
                  <p className="mt-0.5 text-xs text-secondary-500">
                    {formatNumber(stats.visibleProducts)} gorunur
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tables stat */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Toplam Masa
                </p>
                <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {isLoadingStats ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-secondary-200 dark:bg-secondary-700" />
                  ) : (
                    formatNumber(stats?.totalTables || 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Requests stat */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Bekleyen Cagri
                </p>
                <p className="mt-1 text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {isLoadingStats ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-secondary-200 dark:bg-secondary-700" />
                  ) : (
                    formatNumber(stats?.pendingServiceRequests || 0)
                  )}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${
                (stats?.pendingServiceRequests || 0) > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-secondary-100 dark:bg-secondary-800'
              }`}>
                <svg
                  className={`h-6 w-6 ${
                    (stats?.pendingServiceRequests || 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-secondary-400'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats error */}
      {statsError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          role="alert"
        >
          {statsError}
          <button
            type="button"
            onClick={fetchStats}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Code Section */}
        <Card>
          <CardHeader
            title="Menu QR Kodu"
            subtitle="Musterilerinizin menuyu gorebilmesi icin QR kodu indirin"
          />
          <CardContent>
            {/* QR Preview */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-secondary-300 bg-white dark:border-secondary-600 dark:bg-secondary-900">
                {isGeneratingQR ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                ) : qrSvg ? (
                  <div
                    className="h-40 w-40 [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="text-center text-secondary-400">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="mt-2 text-sm">QR kod yuklenemedi</p>
                  </div>
                )}
              </div>

              {/* Menu URL */}
              {organization?.slug && (
                <div className="w-full rounded-lg bg-secondary-50 px-4 py-2 text-center dark:bg-secondary-800">
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Menu linki</p>
                  <p className="mt-0.5 text-sm font-medium text-secondary-900 dark:text-secondary-100 break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/menu/{organization.slug}
                  </p>
                </div>
              )}

              {/* QR Error */}
              {qrError && (
                <div
                  className="w-full rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  role="alert"
                >
                  {qrError}
                </div>
              )}

              {/* Download buttons */}
              <div className="w-full space-y-3">
                <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                  QR Kodu Indir
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQR('svg')}
                    isLoading={downloadingFormat === 'svg'}
                    disabled={!organization?.slug || !!downloadingFormat}
                  >
                    SVG
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQR('png-1024')}
                    isLoading={downloadingFormat === 'png-1024'}
                    disabled={!organization?.slug || !!downloadingFormat}
                  >
                    PNG 1024
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQR('png-2048')}
                    isLoading={downloadingFormat === 'png-2048'}
                    disabled={!organization?.slug || !!downloadingFormat}
                  >
                    PNG 2048
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQR('png-4096')}
                    isLoading={downloadingFormat === 'png-4096'}
                    disabled={!organization?.slug || !!downloadingFormat}
                  >
                    PNG 4096
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQR('pdf')}
                    isLoading={downloadingFormat === 'pdf'}
                    disabled={!organization?.slug || !!downloadingFormat}
                    className="col-span-2 sm:col-span-1"
                  >
                    PDF (A5)
                  </Button>
                </div>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">
                  Basili materyaller icin PNG 2048 veya PDF oneriyoruz
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader
            title="Hizli Islemler"
            subtitle="Sik kullanilan islemlere hizli erisim"
          />
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 rounded-lg border border-secondary-200 p-4 transition-colors hover:bg-secondary-50 dark:border-secondary-700 dark:hover:bg-secondary-800/50"
                >
                  <div className={`shrink-0 rounded-lg p-2 ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-secondary-900 dark:text-secondary-100">
                      {action.title}
                    </p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400">
                      {action.description}
                    </p>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role info */}
      {membership && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Rolunuz:</span>
                <span className="font-medium capitalize text-secondary-900 dark:text-secondary-100">
                  {membership.role === 'owner' && 'Sahip'}
                  {membership.role === 'admin' && 'Yonetici'}
                  {membership.role === 'manager' && 'Mudur'}
                  {membership.role === 'waiter' && 'Garson'}
                  {membership.role === 'viewer' && 'Izleyici'}
                </span>
              </div>
              <Link
                href="/audit"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Denetim Kaydini Gor →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
