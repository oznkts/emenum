'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Organization } from '@/types/database'

/**
 * Organization settings form data
 */
interface SettingsFormData {
  name: string
  description: string
  contact_phone: string
  contact_email: string
  address: string
}

/**
 * Format date for display in Turkish locale
 */
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

/**
 * Get Turkish role name
 */
function getRoleName(role: string): string {
  const roleNames: Record<string, string> = {
    owner: 'Sahip',
    admin: 'Yonetici',
    manager: 'Mudur',
    waiter: 'Garson',
    viewer: 'Izleyici',
  }
  return roleNames[role] || role
}

/**
 * Organization settings page
 *
 * Allows managing organization profile information including name, contact details,
 * and other settings. The slug is displayed but not editable to preserve QR code links.
 */
export default function SettingsPage() {
  const { organization, membership, refreshAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<SettingsFormData>({
    name: '',
    description: '',
    contact_phone: '',
    contact_email: '',
    address: '',
  })

  /**
   * Initialize form data from organization
   */
  const initializeForm = useCallback((org: Organization) => {
    const settings = (org.settings || {}) as Record<string, string>
    setFormData({
      name: org.name || '',
      description: settings.description || '',
      contact_phone: settings.contact_phone || '',
      contact_email: settings.contact_email || '',
      address: settings.address || '',
    })
  }, [])

  // Load organization data on mount
  useEffect(() => {
    if (organization) {
      initializeForm(organization)
      setIsLoading(false)
    }
  }, [organization, initializeForm])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organization?.id) return

    // Check if user has permission to edit
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      setError('Bu islemi yapmak icin yetkiniz yok.')
      return
    }

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Build settings object
      const settings = {
        description: formData.description.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        address: formData.address.trim() || null,
      }

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          settings: settings,
        })
        .eq('id', organization.id)

      if (updateError) throw updateError

      // Refresh organization data in context
      await refreshAuth()

      setSuccess('Ayarlar basariyla kaydedildi.')
    } catch {
      setError('Ayarlar kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Check if user can edit settings
   */
  const canEdit = membership && ['owner', 'admin'].includes(membership.role)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Isletme Ayarlari
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Isletme bilgilerinizi ve iletisim detaylarinizi yonetin
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div
          className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
          role="status"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        </div>
      )}

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main settings form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader
                title="Isletme Bilgileri"
                subtitle="Temel isletme bilgilerini duzenleyin"
              />
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="Isletme Adi"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ornegin: Lezzet Restoran"
                    required
                    disabled={!canEdit || isSaving}
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      Menu Linki (Slug)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-lg border border-secondary-300 bg-secondary-50 px-3 py-2 text-secondary-500 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-400">
                        /menu/<span className="font-medium text-secondary-900 dark:text-secondary-100">{organization?.slug || '-'}</span>
                      </div>
                      <div className="shrink-0">
                        <svg className="h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm text-secondary-500 dark:text-secondary-400">
                      QR kodlarin calismaya devam etmesi icin slug degistirilemez
                    </p>
                  </div>

                  <Textarea
                    label="Isletme Aciklamasi"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Isletmeniz hakkinda kisa bir aciklama"
                    rows={3}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </CardContent>
              <CardHeader
                title="Iletisim Bilgileri"
                subtitle="Musterilerinizin size ulasabilecegi bilgiler"
              />
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="Telefon"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="0 (500) 000 00 00"
                    disabled={!canEdit || isSaving}
                  />

                  <Input
                    label="E-posta"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="iletisim@isletme.com"
                    disabled={!canEdit || isSaving}
                  />

                  <Textarea
                    label="Adres"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Isletme adresi"
                    rows={2}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </CardContent>
              {canEdit && (
                <CardFooter>
                  <Button type="submit" isLoading={isSaving}>
                    Kaydet
                  </Button>
                </CardFooter>
              )}
            </Card>
          </form>
        </div>

        {/* Side panel - Organization info */}
        <div className="space-y-6">
          {/* Organization status */}
          <Card>
            <CardHeader title="Durum" />
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">
                    Hesap Durumu
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    organization?.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      organization?.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {organization?.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">
                    Rolunuz
                  </span>
                  <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {membership ? getRoleName(membership.role) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">
                    Kayit Tarihi
                  </span>
                  <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {organization?.created_at ? formatDate(organization.created_at) : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader title="Hizli Erisim" />
            <CardContent>
              <div className="space-y-2">
                <a
                  href={organization?.slug ? `/menu/${organization.slug}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary-700 transition-colors hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800"
                >
                  <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Menuyu Gor
                </a>
                <a
                  href="/dashboard"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary-700 transition-colors hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800"
                >
                  <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Kodlari Indir
                </a>
                <a
                  href="/audit"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary-700 transition-colors hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800"
                >
                  <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Denetim Kaydi
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Permission notice for non-owners */}
          {!canEdit && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-secondary-900 dark:text-secondary-100">
                      Salt Okunur
                    </p>
                    <p className="mt-1 text-secondary-600 dark:text-secondary-400">
                      Ayarlari duzenlemek icin Sahip veya Yonetici rolune ihtiyaciniz var.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
