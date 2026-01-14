'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import type { Organization, Plan, Subscription } from '@/types/database'

/**
 * Extended organization with subscription and stats
 */
interface OrganizationWithDetails extends Organization {
  subscription?: Subscription & { plan?: Plan }
  member_count?: number
  product_count?: number
}

/**
 * Status badge component
 */
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {isActive ? 'Aktif' : 'Pasif'}
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
 * Organizations Management Page for Super Admin
 *
 * Features:
 * - List all organizations (tenants) in the system
 * - Activate/deactivate organizations
 * - Assign/change subscription plans
 * - View organization details and stats
 * - Impersonation support (placeholder for future)
 * - Search and filter organizations
 */
export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationWithDetails | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    is_active: true,
    plan_id: '',
  })

  // Plan assignment modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [planAssignOrg, setPlanAssignOrg] = useState<OrganizationWithDetails | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  /**
   * Fetch organizations with details
   */
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (orgsError) throw orgsError

      // Fetch subscriptions with plans
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')

      if (subsError) throw subsError

      // Fetch member counts
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id')

      if (membersError) throw membersError

      // Fetch product counts
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('organization_id')

      if (productsError) throw productsError

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

      // Count members per organization
      const memberCountMap = new Map<string, number>()
      membersData?.forEach((member) => {
        memberCountMap.set(
          member.organization_id,
          (memberCountMap.get(member.organization_id) || 0) + 1
        )
      })

      // Count products per organization
      const productCountMap = new Map<string, number>()
      productsData?.forEach((product) => {
        productCountMap.set(
          product.organization_id,
          (productCountMap.get(product.organization_id) || 0) + 1
        )
      })

      // Combine data
      const orgsWithDetails: OrganizationWithDetails[] = (orgsData || []).map((org) => ({
        ...org,
        subscription: subscriptionMap.get(org.id),
        member_count: memberCountMap.get(org.id) || 0,
        product_count: productCountMap.get(org.id) || 0,
      }))

      setOrganizations(orgsWithDetails)
    } catch {
      setError('Organizasyonlar yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Fetch available plans
   */
  const fetchPlans = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (plansError) throw plansError
      setPlans(data || [])
    } catch {
      // Plans fetch error is not critical, silently ignore
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
    fetchPlans()
  }, [fetchOrganizations, fetchPlans])

  /**
   * Filter organizations based on search and status
   */
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      searchQuery === '' ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && org.is_active) ||
      (statusFilter === 'inactive' && !org.is_active)

    return matchesSearch && matchesStatus
  })

  /**
   * Toggle organization active status
   */
  const handleToggleActive = async (org: OrganizationWithDetails) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active })
        .eq('id', org.id)

      if (updateError) throw updateError
      await fetchOrganizations()
    } catch {
      setError('Organizasyon durumu guncellenirken hata olustu.')
    }
  }

  /**
   * Open edit modal for organization
   */
  const handleEditOrg = (org: OrganizationWithDetails) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      slug: org.slug,
      is_active: org.is_active,
      plan_id: org.subscription?.plan_id || '',
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  /**
   * Handle edit form submission
   */
  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingOrg) return

    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Update organization details
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: formData.name.trim(),
          is_active: formData.is_active,
        })
        .eq('id', editingOrg.id)

      if (updateError) throw updateError

      setIsEditModalOpen(false)
      await fetchOrganizations()
    } catch {
      setFormError('Organizasyon guncellenirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Open plan assignment modal
   */
  const handleOpenPlanModal = (org: OrganizationWithDetails) => {
    setPlanAssignOrg(org)
    setSelectedPlanId(org.subscription?.plan_id || '')
    setIsPlanModalOpen(true)
  }

  /**
   * Handle plan assignment
   */
  const handleAssignPlan = async () => {
    if (!planAssignOrg || !selectedPlanId) return

    setIsSaving(true)
    setFormError(null)

    try {
      const supabase = createClient()

      // Check if organization has existing subscription
      if (planAssignOrg.subscription) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: selectedPlanId,
            status: 'active',
          })
          .eq('id', planAssignOrg.subscription.id)

        if (updateError) throw updateError
      } else {
        // Create new subscription
        const { error: insertError } = await supabase.from('subscriptions').insert({
          organization_id: planAssignOrg.id,
          plan_id: selectedPlanId,
          status: 'active',
        })

        if (insertError) throw insertError
      }

      setIsPlanModalOpen(false)
      await fetchOrganizations()
    } catch {
      setFormError('Plan atanirken bir hata olustu.')
    } finally {
      setIsSaving(false)
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
    })
  }

  // Stats for the header
  const stats = {
    total: organizations.length,
    active: organizations.filter((o) => o.is_active).length,
    inactive: organizations.filter((o) => !o.is_active).length,
    withPlan: organizations.filter((o) => o.subscription).length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Organizasyonlar
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Tum tenant organizasyonlarini yonetin, aktiflik durumlarini ve planlarini degistirin
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary-100 p-2 dark:bg-secondary-700">
              <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {stats.total}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Toplam Organizasyon
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
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Aktif</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.inactive}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Pasif</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.withPlan}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Planli</p>
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

      {/* Search and filters */}
      <Card>
        <CardHeader title="Organizasyon Listesi" subtitle={`${filteredOrganizations.length} sonuc`} />
        <CardContent>
          {/* Filter controls */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-3">
              <Input
                placeholder="Ara (isim veya slug)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="all">Tum Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
            <Button
              onClick={fetchOrganizations}
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

          {/* Organizations table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {searchQuery || statusFilter !== 'all' ? 'Sonuc bulunamadi' : 'Henuz organizasyon yok'}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Filtreleri degistirmeyi deneyin'
                  : 'Kullanicilar kaydoldugunda burada gorunecekler'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50 text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800/50 dark:text-secondary-400">
                  <tr>
                    <th className="px-4 py-3">Organizasyon</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 text-center">Uye</th>
                    <th className="px-4 py-3 text-center">Urun</th>
                    <th className="px-4 py-3">Kayit Tarihi</th>
                    <th className="px-4 py-3 text-right">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                  {filteredOrganizations.map((org) => (
                    <tr
                      key={org.id}
                      className="transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 text-sm font-medium text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300">
                            {org.logo_url ? (
                              <Image
                                src={org.logo_url}
                                alt={org.name}
                                width={40}
                                height={40}
                                className="h-full w-full rounded-lg object-cover"
                                unoptimized
                              />
                            ) : (
                              org.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900 dark:text-secondary-100">
                              {org.name}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400">
                              /{org.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={org.is_active} />
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge planName={org.subscription?.plan?.name} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {org.member_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {org.product_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-secondary-600 dark:text-secondary-400">
                          {formatDate(org.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Menu Link */}
                          <Link
                            href={`/menu/${org.slug}`}
                            target="_blank"
                            className="rounded p-1.5 text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
                            title="Menuyu Gor"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>

                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(org)}
                            className={`rounded p-1.5 transition-colors ${
                              org.is_active
                                ? 'text-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30'
                                : 'text-green-500 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30'
                            }`}
                            title={org.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {org.is_active ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* Assign Plan */}
                          <button
                            type="button"
                            onClick={() => handleOpenPlanModal(org)}
                            className="rounded p-1.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
                            title="Plan Ata"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleEditOrg(org)}
                            className="rounded p-1.5 text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
                            title="Duzenle"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Impersonate (placeholder) */}
                          <button
                            type="button"
                            className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
                            title="Giris Yap (Impersonate)"
                            disabled
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

      {/* Edit Organization Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Organizasyon Duzenle"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="space-y-4">
            {formError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                role="alert"
              >
                {formError}
              </div>
            )}

            <Input
              label="Organizasyon Adi"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Restoran adi"
              required
              disabled={isSaving}
            />

            <Input
              label="URL Slug"
              value={formData.slug}
              disabled
              helperText="Slug degistirilemez (QR kodlari bozulur)"
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-secondary-300 text-red-600 focus:ring-red-500"
                disabled={isSaving}
              />
              <label htmlFor="is_active" className="text-sm text-secondary-700 dark:text-secondary-300">
                Organizasyon aktif
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plan Assignment Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title="Plan Ata"
      >
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
            <p className="mb-4 text-secondary-600 dark:text-secondary-400">
              <span className="font-medium text-secondary-900 dark:text-secondary-100">
                {planAssignOrg?.name}
              </span>{' '}
              icin plan secin:
            </p>

            <div className="space-y-2">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedPlanId === plan.id
                      ? 'border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20'
                      : 'border-secondary-200 hover:border-secondary-300 dark:border-secondary-700 dark:hover:border-secondary-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={selectedPlanId === plan.id}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="h-4 w-4 border-secondary-300 text-red-600 focus:ring-red-500"
                    disabled={isSaving}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-secondary-900 dark:text-secondary-100">
                      {plan.name}
                    </p>
                    {plan.price_monthly !== null && (
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {plan.price_monthly.toLocaleString('tr-TR')} TL / ay
                      </p>
                    )}
                  </div>
                  <PlanBadge planName={plan.name} />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPlanModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button onClick={handleAssignPlan} isLoading={isSaving} disabled={!selectedPlanId}>
              Plan Ata
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
