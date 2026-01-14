'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import type { Organization, Feature, OrganizationFeatureOverride, Plan, Subscription } from '@/types/database'

/**
 * Override with related organization and feature details
 */
interface OverrideWithDetails extends OrganizationFeatureOverride {
  organization?: Organization
  feature?: Feature
}

/**
 * Organization with subscription info for display
 */
interface OrganizationWithPlan extends Organization {
  subscription?: Subscription & { plan?: Plan }
}

/**
 * Status badge for override value (enabled/disabled)
 */
function OverrideValueBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        value
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
      {value ? 'Aktif' : 'Pasif'}
    </span>
  )
}

/**
 * Expiration status badge
 */
function ExpirationBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Suursuz
      </span>
    )
  }

  const now = new Date()
  const expDate = new Date(expiresAt)
  const isExpired = expDate < now
  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (isExpired) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Suresi Doldu
      </span>
    )
  }

  if (daysLeft <= 7) {
    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        {daysLeft} gun kaldi
      </span>
    )
  }

  return (
    <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
      {expDate.toLocaleDateString('tr-TR')}
    </span>
  )
}

/**
 * Plan badge component
 */
function PlanBadge({ planName }: { planName?: string }) {
  const colorMap: Record<string, string> = {
    Free: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
    Lite: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Enterprise: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[planName || ''] || colorMap.Free}`}>
      {planName || 'Plansiz'}
    </span>
  )
}

/**
 * Feature Overrides Management Page for Super Admin
 *
 * This page implements ABAC (Attribute-Based Access Control) layer
 * as described in ek_ozellikler.md. Overrides allow granting or
 * revoking features for specific organizations regardless of their
 * subscription plan.
 *
 * Features:
 * - List all feature overrides across all organizations
 * - Create new overrides (grant/revoke features)
 * - Edit/delete existing overrides
 * - Set expiration dates for temporary overrides
 * - Filter by organization, feature, or status
 * - View which plan the organization has (to understand override context)
 */
export default function OverridesPage() {
  // Overrides state
  const [overrides, setOverrides] = useState<OverrideWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Organizations and features for dropdowns
  const [organizations, setOrganizations] = useState<OrganizationWithPlan[]>([])
  const [features, setFeatures] = useState<Feature[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOverride, setEditingOverride] = useState<OverrideWithDetails | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<OverrideWithDetails | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    organization_id: '',
    feature_key: '',
    override_value: true,
    expires_at: '',
  })

  /**
   * Fetch all overrides with related data
   */
  const fetchOverrides = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('organization_feature_overrides')
        .select('*')
        .order('created_at', { ascending: false })

      if (overridesError) throw overridesError

      // Fetch organizations for display
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')

      if (orgsError) throw orgsError

      // Fetch features for display
      const { data: featuresData, error: featuresError } = await supabase
        .from('features')
        .select('*')

      if (featuresError) throw featuresError

      // Map organizations and features
      const orgMap = new Map<string, Organization>()
      orgsData?.forEach((org) => orgMap.set(org.id, org))

      const featureMap = new Map<string, Feature>()
      featuresData?.forEach((feat) => featureMap.set(feat.key, feat))

      // Combine override data with related entities
      const overridesWithDetails: OverrideWithDetails[] = (overridesData || []).map((override) => ({
        ...override,
        organization: orgMap.get(override.organization_id),
        feature: featureMap.get(override.feature_key),
      }))

      setOverrides(overridesWithDetails)
      setFeatures(featuresData || [])
    } catch {
      setError('Override verileri yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Fetch organizations with subscription info
   */
  const fetchOrganizations = useCallback(async () => {
    try {
      const supabase = createClient()

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true })

      if (orgsError) throw orgsError

      // Fetch subscriptions with plans
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')

      if (subsError) throw subsError

      // Map subscriptions to organizations
      const subscriptionMap = new Map<string, Subscription & { plan?: Plan }>()
      subsData?.forEach((sub) => {
        if (sub.status === 'active') {
          subscriptionMap.set(sub.organization_id, {
            ...sub,
            plan: sub.plans as unknown as Plan,
          })
        }
      })

      // Combine data
      const orgsWithPlan: OrganizationWithPlan[] = (orgsData || []).map((org) => ({
        ...org,
        subscription: subscriptionMap.get(org.id),
      }))

      setOrganizations(orgsWithPlan)
    } catch {
      // Silently fail for organizations fetch
    }
  }, [])

  useEffect(() => {
    fetchOverrides()
    fetchOrganizations()
  }, [fetchOverrides, fetchOrganizations])

  /**
   * Filter overrides based on search and filters
   */
  const filteredOverrides = overrides.filter((override) => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      override.organization?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      override.feature?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      override.feature_key.toLowerCase().includes(searchQuery.toLowerCase())

    // Organization filter
    const matchesOrg = orgFilter === 'all' || override.organization_id === orgFilter

    // Status filter
    const now = new Date()
    const isExpired = override.expires_at && new Date(override.expires_at) < now
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isExpired) ||
      (statusFilter === 'expired' && isExpired)

    return matchesSearch && matchesOrg && matchesStatus
  })

  /**
   * Open modal for creating/editing override
   */
  const handleOpenModal = (override?: OverrideWithDetails) => {
    if (override) {
      setEditingOverride(override)
      setFormData({
        organization_id: override.organization_id,
        feature_key: override.feature_key,
        override_value: override.override_value,
        expires_at: override.expires_at
          ? new Date(override.expires_at).toISOString().slice(0, 16)
          : '',
      })
    } else {
      setEditingOverride(null)
      setFormData({
        organization_id: '',
        feature_key: '',
        override_value: true,
        expires_at: '',
      })
    }
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Validate required fields
      if (!formData.organization_id || !formData.feature_key) {
        throw new Error('Organizasyon ve ozellik secimi zorunludur.')
      }

      const expiresAt = formData.expires_at ? new Date(formData.expires_at).toISOString() : null

      if (editingOverride) {
        // Update existing override
        const { error: updateError } = await supabase
          .from('organization_feature_overrides')
          .update({
            override_value: formData.override_value,
            expires_at: expiresAt,
          })
          .eq('organization_id', editingOverride.organization_id)
          .eq('feature_key', editingOverride.feature_key)

        if (updateError) throw updateError
      } else {
        // Check if override already exists
        const { data: existing } = await supabase
          .from('organization_feature_overrides')
          .select('*')
          .eq('organization_id', formData.organization_id)
          .eq('feature_key', formData.feature_key)
          .single()

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('organization_feature_overrides')
            .update({
              override_value: formData.override_value,
              expires_at: expiresAt,
            })
            .eq('organization_id', formData.organization_id)
            .eq('feature_key', formData.feature_key)

          if (updateError) throw updateError
        } else {
          // Insert new override
          const { error: insertError } = await supabase
            .from('organization_feature_overrides')
            .insert({
              organization_id: formData.organization_id,
              feature_key: formData.feature_key,
              override_value: formData.override_value,
              expires_at: expiresAt,
            })

          if (insertError) throw insertError
        }
      }

      setIsModalOpen(false)
      await fetchOverrides()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Override kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle override deletion
   */
  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('organization_feature_overrides')
        .delete()
        .eq('organization_id', deleteTarget.organization_id)
        .eq('feature_key', deleteTarget.feature_key)

      if (deleteError) throw deleteError

      setDeleteTarget(null)
      await fetchOverrides()
    } catch {
      setError('Override silinirken bir hata olustu.')
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Toggle override value quickly
   */
  const handleToggleValue = async (override: OverrideWithDetails) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('organization_feature_overrides')
        .update({ override_value: !override.override_value })
        .eq('organization_id', override.organization_id)
        .eq('feature_key', override.feature_key)

      if (updateError) throw updateError
      await fetchOverrides()
    } catch {
      setError('Override durumu guncellenirken hata olustu.')
    }
  }

  /**
   * Format date in Turkish locale
   */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Stats
  const stats = {
    total: overrides.length,
    active: overrides.filter((o) => !o.expires_at || new Date(o.expires_at) > new Date()).length,
    expired: overrides.filter((o) => o.expires_at && new Date(o.expires_at) < new Date()).length,
    enabled: overrides.filter((o) => o.override_value).length,
    disabled: overrides.filter((o) => !o.override_value).length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Ozellik Override Yonetimi
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Organizasyonlara paket disinda ozellik verin veya mevcut ozellikleri kisitlayin (ABAC)
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Override Nasil Calisir?</p>
            <p className="mt-1">
              Override&apos;lar, organizasyonun abonelik paketinden bagimsiz olarak ozellik erisimini kontrol eder.
              Ornegin, &quot;Lite&quot; paketteki bir restorana &quot;Garson Cagri&quot; ozelligini override ile verebilirsiniz.
              Ayrica paketinde olan bir ozelligi de override ile pasif hale getirebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary-100 p-2 dark:bg-secondary-700">
              <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {stats.total}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Toplam Override
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.active}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Gecerli</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.expired}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Suresi Dolmus</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.enabled}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Aktif</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.disabled}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Pasif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
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

      {/* Overrides list */}
      <Card>
        <CardHeader
          title="Override Listesi"
          subtitle={`${filteredOverrides.length} sonuc`}
          action={
            <Button
              onClick={() => handleOpenModal()}
              size="sm"
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              Yeni Override
            </Button>
          }
        />
        <CardContent>
          {/* Filter controls */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              <Input
                placeholder="Ara (org veya ozellik)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="all">Tum Organizasyonlar</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired')}
                className="rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="all">Tum Durumlar</option>
                <option value="active">Gecerli</option>
                <option value="expired">Suresi Dolmus</option>
              </select>
            </div>
            <Button
              onClick={fetchOverrides}
              variant="secondary"
              size="sm"
              leftIcon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Yenile
            </Button>
          </div>

          {/* Overrides table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : filteredOverrides.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {searchQuery || orgFilter !== 'all' || statusFilter !== 'all'
                  ? 'Sonuc bulunamadi'
                  : 'Henuz override yok'}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {searchQuery || orgFilter !== 'all' || statusFilter !== 'all'
                  ? 'Filtreleri degistirmeyi deneyin'
                  : 'Yeni override ekleyerek baslayın'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50 text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800/50 dark:text-secondary-400">
                  <tr>
                    <th className="px-4 py-3">Organizasyon</th>
                    <th className="px-4 py-3">Ozellik</th>
                    <th className="px-4 py-3">Deger</th>
                    <th className="px-4 py-3">Sure</th>
                    <th className="px-4 py-3">Olusturulma</th>
                    <th className="px-4 py-3 text-right">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                  {filteredOverrides.map((override) => (
                    <tr
                      key={`${override.organization_id}-${override.feature_key}`}
                      className="transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-secondary-100">
                            {override.organization?.name || 'Bilinmiyor'}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-xs text-secondary-500 dark:text-secondary-400">
                              /{override.organization?.slug}
                            </span>
                            <PlanBadge planName={organizations.find((o) => o.id === override.organization_id)?.subscription?.plan?.name} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-secondary-100">
                            {override.feature?.name || override.feature_key}
                          </p>
                          <code className="text-xs text-secondary-500 dark:text-secondary-400">
                            {override.feature_key}
                          </code>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <OverrideValueBadge value={override.override_value} />
                      </td>
                      <td className="px-4 py-3">
                        <ExpirationBadge expiresAt={override.expires_at} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {formatDate(override.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Value */}
                          <button
                            type="button"
                            onClick={() => handleToggleValue(override)}
                            className={`rounded p-1.5 transition-colors ${
                              override.override_value
                                ? 'text-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30'
                                : 'text-green-500 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30'
                            }`}
                            title={override.override_value ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {override.override_value ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(override)}
                            className="rounded p-1.5 text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
                            title="Duzenle"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(override)}
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
                            title="Sil"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOverride ? 'Override Duzenle' : 'Yeni Override'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {formError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                role="alert"
              >
                {formError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Organizasyon
              </label>
              <select
                value={formData.organization_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, organization_id: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100 dark:disabled:bg-secondary-700"
                disabled={isSaving || !!editingOverride}
                required
              >
                <option value="">Organizasyon secin...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.subscription?.plan?.name || 'Plansiz'})
                  </option>
                ))}
              </select>
              {editingOverride && (
                <p className="mt-1 text-xs text-secondary-500">
                  Organizasyon ve ozellik degistirilemez, yeni override olusturun
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Ozellik
              </label>
              <select
                value={formData.feature_key}
                onChange={(e) => setFormData((prev) => ({ ...prev, feature_key: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100 dark:disabled:bg-secondary-700"
                disabled={isSaving || !!editingOverride}
                required
              >
                <option value="">Ozellik secin...</option>
                {features
                  .filter((f) => f.type === 'boolean')
                  .map((feature) => (
                    <option key={feature.key} value={feature.key}>
                      {feature.name} ({feature.key})
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-secondary-500">
                Sadece boolean tipindeki ozellikler override edilebilir
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Override Degeri
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="override_value"
                    checked={formData.override_value === true}
                    onChange={() => setFormData((prev) => ({ ...prev, override_value: true }))}
                    className="h-4 w-4 border-secondary-300 text-red-600 focus:ring-red-500"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">
                    Aktif (Ozelligi ver)
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="override_value"
                    checked={formData.override_value === false}
                    onChange={() => setFormData((prev) => ({ ...prev, override_value: false }))}
                    className="h-4 w-4 border-secondary-300 text-red-600 focus:ring-red-500"
                    disabled={isSaving}
                  />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">
                    Pasif (Ozelligi kaldir)
                  </span>
                </label>
              </div>
            </div>

            <Input
              label="Bitis Tarihi (Opsiyonel)"
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value }))}
              helperText="Bos birakilirsa suursuz olarak kalir"
              disabled={isSaving}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingOverride ? 'Kaydet' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Override Sil"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <svg className="h-5 w-5 flex-shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">Bu islemi geri alamazsiniz!</p>
                <p className="mt-1">
                  Bu override silindiginde, organizasyonun ozellik erisimi abonelik paketine gore belirlenir.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Organizasyon:</dt>
                <dd className="font-medium text-secondary-900 dark:text-secondary-100">
                  {deleteTarget?.organization?.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Ozellik:</dt>
                <dd className="font-medium text-secondary-900 dark:text-secondary-100">
                  {deleteTarget?.feature?.name || deleteTarget?.feature_key}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Mevcut Deger:</dt>
                <dd>
                  {deleteTarget && <OverrideValueBadge value={deleteTarget.override_value} />}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Iptal
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
