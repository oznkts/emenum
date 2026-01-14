'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import type { Organization, Plan, Subscription } from '@/types/database'

/**
 * Organization with AI-related data
 */
interface OrganizationWithAI extends Organization {
  subscription?: Subscription & { plan?: Plan }
  ai_enabled: boolean
  ai_quota: number | null
  ai_usage?: number
}

/**
 * Plan feature for AI quota
 */
interface PlanFeatureValue {
  plan_id: string
  plan_name: string
  ai_enabled: boolean
  ai_quota: number | null
}

/**
 * Status badge for AI access
 */
function AIStatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        enabled
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-secondary-400'}`} />
      {enabled ? 'Aktif' : 'Kapali'}
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
 * Quota display component
 */
function QuotaDisplay({ quota, usage }: { quota: number | null; usage?: number }) {
  if (quota === null || quota === undefined) {
    return (
      <span className="text-secondary-500 dark:text-secondary-400">-</span>
    )
  }

  if (quota === -1) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Sinirsiz
      </span>
    )
  }

  const percentage = usage !== undefined ? (usage / quota) * 100 : 0
  const isNearLimit = percentage >= 80
  const isOverLimit = percentage >= 100

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`text-sm font-medium ${
          isOverLimit
            ? 'text-red-600 dark:text-red-400'
            : isNearLimit
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-secondary-900 dark:text-secondary-100'
        }`}
      >
        {usage !== undefined && (
          <>
            {usage.toLocaleString('tr-TR')} /{' '}
          </>
        )}
        {quota.toLocaleString('tr-TR')}
      </span>
      {usage !== undefined && (
        <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary-200 dark:bg-secondary-700">
          <div
            className={`h-full transition-all ${
              isOverLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * AI Token Management Page for Super Admin
 *
 * This page provides management for AI-related features:
 * - View organizations with AI access status
 * - Monitor AI token quotas and usage
 * - Configure AI quotas per plan
 * - Grant/revoke AI access via overrides
 *
 * Features managed:
 * - module_ai_generation (boolean) - AI content generation access
 * - ai_token_quota (limit) - Monthly AI token limit
 */
export default function AIManagementPage() {
  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationWithAI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Plan features state
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureValue[]>([])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [aiFilter, setAIFilter] = useState<'all' | 'enabled' | 'disabled'>('all')

  // Modal state
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithAI | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Quota form state
  const [quotaFormData, setQuotaFormData] = useState({
    quota: '',
    expires_at: '',
  })

  // AI access toggle modal
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const [accessTarget, setAccessTarget] = useState<OrganizationWithAI | null>(null)

  /**
   * Fetch organizations with AI data
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

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

      // Fetch plan features for AI
      const { data: featuresData, error: featuresError } = await supabase
        .from('features')
        .select('id, key')
        .in('key', ['module_ai_generation', 'ai_token_quota'])

      if (featuresError) throw featuresError

      const aiFeatureId = featuresData?.find((f) => f.key === 'module_ai_generation')?.id
      const quotaFeatureId = featuresData?.find((f) => f.key === 'ai_token_quota')?.id

      // Fetch plan feature values
      const { data: planFeaturesData, error: pfError } = await supabase
        .from('plan_features')
        .select('*, plans(name)')
        .or(`feature_id.eq.${aiFeatureId},feature_id.eq.${quotaFeatureId}`)

      if (pfError) throw pfError

      // Fetch overrides for AI features
      const { data: overridesData, error: overridesError } = await supabase
        .from('organization_feature_overrides')
        .select('*')
        .in('feature_key', ['module_ai_generation', 'ai_token_quota'])

      if (overridesError) throw overridesError

      // Build plan features map
      const planFeaturesMap = new Map<string, { ai_enabled: boolean; ai_quota: number | null }>()
      planFeaturesData?.forEach((pf) => {
        const current = planFeaturesMap.get(pf.plan_id) || { ai_enabled: false, ai_quota: null }
        if (pf.feature_id === aiFeatureId) {
          current.ai_enabled = pf.value_boolean === true
        } else if (pf.feature_id === quotaFeatureId) {
          current.ai_quota = pf.value_limit
        }
        planFeaturesMap.set(pf.plan_id, current)
      })

      // Build plan features list for display
      const planFeaturesList: PlanFeatureValue[] = []
      const plansMap = new Map<string, string>()
      planFeaturesData?.forEach((pf) => {
        const planObj = pf.plans as unknown as { name: string }
        if (planObj?.name) {
          plansMap.set(pf.plan_id, planObj.name)
        }
      })
      planFeaturesMap.forEach((value, planId) => {
        planFeaturesList.push({
          plan_id: planId,
          plan_name: plansMap.get(planId) || 'Bilinmiyor',
          ai_enabled: value.ai_enabled,
          ai_quota: value.ai_quota,
        })
      })
      setPlanFeatures(planFeaturesList)

      // Build subscription map
      const subscriptionMap = new Map<string, Subscription & { plan?: Plan }>()
      subsData?.forEach((sub) => {
        if (sub.status === 'active') {
          subscriptionMap.set(sub.organization_id, {
            ...sub,
            plan: sub.plans as unknown as Plan,
          })
        }
      })

      // Build override map
      const overrideMap = new Map<string, { ai_enabled?: boolean }>()
      overridesData?.forEach((override) => {
        const now = new Date()
        const isExpired = override.expires_at && new Date(override.expires_at) < now
        if (!isExpired) {
          const current = overrideMap.get(override.organization_id) || {}
          if (override.feature_key === 'module_ai_generation') {
            current.ai_enabled = override.override_value
          }
          overrideMap.set(override.organization_id, current)
        }
      })

      // Combine data
      const orgsWithAI: OrganizationWithAI[] = (orgsData || []).map((org) => {
        const subscription = subscriptionMap.get(org.id)
        const planId = subscription?.plan_id
        const planFeature = planId ? planFeaturesMap.get(planId) : undefined
        const override = overrideMap.get(org.id)

        // Override takes precedence
        const aiEnabled = override?.ai_enabled ?? planFeature?.ai_enabled ?? false
        const aiQuota = planFeature?.ai_quota ?? null

        return {
          ...org,
          subscription,
          ai_enabled: aiEnabled,
          ai_quota: aiQuota,
          ai_usage: undefined, // Would be fetched from usage tracking table if exists
        }
      })

      setOrganizations(orgsWithAI)
    } catch {
      setError('Veriler yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Filter organizations
   */
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      searchQuery === '' ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesAIFilter =
      aiFilter === 'all' ||
      (aiFilter === 'enabled' && org.ai_enabled) ||
      (aiFilter === 'disabled' && !org.ai_enabled)

    return matchesSearch && matchesAIFilter
  })

  /**
   * Open quota modal for an organization
   */
  const handleOpenQuotaModal = (org: OrganizationWithAI) => {
    setSelectedOrg(org)
    setQuotaFormData({
      quota: org.ai_quota?.toString() || '',
      expires_at: '',
    })
    setFormError(null)
    setIsQuotaModalOpen(true)
  }

  /**
   * Handle quota form submission (creates override)
   */
  const handleQuotaSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedOrg) return

    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()
      const quota = quotaFormData.quota ? parseInt(quotaFormData.quota) : null

      // Note: ai_token_quota is a limit type feature, not boolean
      // For simplicity, we'll update the plan_features table directly
      // In a production system, you might want a separate quota override table

      // Get the feature ID
      const { data: featureData, error: featureError } = await supabase
        .from('features')
        .select('id')
        .eq('key', 'ai_token_quota')
        .single()

      if (featureError || !featureData) {
        throw new Error('ai_token_quota ozelligi bulunamadi')
      }

      // Check if organization has an active subscription
      if (!selectedOrg.subscription?.plan_id) {
        throw new Error('Organizasyonun aktif aboneligi yok')
      }

      // Update the plan feature (this affects all orgs on the same plan)
      // For org-specific quotas, you'd need a separate override mechanism
      const { error: updateError } = await supabase
        .from('plan_features')
        .update({ value_limit: quota })
        .eq('plan_id', selectedOrg.subscription.plan_id)
        .eq('feature_id', featureData.id)

      if (updateError) throw updateError

      setIsQuotaModalOpen(false)
      await fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kota guncellenirken hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Open AI access toggle modal
   */
  const handleToggleAccessModal = (org: OrganizationWithAI) => {
    setAccessTarget(org)
    setIsAccessModalOpen(true)
  }

  /**
   * Toggle AI access for an organization
   */
  const handleToggleAccess = async () => {
    if (!accessTarget) return

    setIsSaving(true)

    try {
      const supabase = createClient()

      // Check if override exists
      const { data: existing } = await supabase
        .from('organization_feature_overrides')
        .select('*')
        .eq('organization_id', accessTarget.id)
        .eq('feature_key', 'module_ai_generation')
        .single()

      const newValue = !accessTarget.ai_enabled

      if (existing) {
        // Update existing override
        const { error: updateError } = await supabase
          .from('organization_feature_overrides')
          .update({ override_value: newValue })
          .eq('organization_id', accessTarget.id)
          .eq('feature_key', 'module_ai_generation')

        if (updateError) throw updateError
      } else {
        // Create new override
        const { error: insertError } = await supabase
          .from('organization_feature_overrides')
          .insert({
            organization_id: accessTarget.id,
            feature_key: 'module_ai_generation',
            override_value: newValue,
            expires_at: null,
          })

        if (insertError) throw insertError
      }

      setIsAccessModalOpen(false)
      setAccessTarget(null)
      await fetchData()
    } catch {
      setError('AI erisimi guncellenirken hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  // Stats
  const stats = {
    total: organizations.length,
    aiEnabled: organizations.filter((o) => o.ai_enabled).length,
    aiDisabled: organizations.filter((o) => !o.ai_enabled).length,
    withQuota: organizations.filter((o) => o.ai_quota !== null && o.ai_quota > 0).length,
    unlimited: organizations.filter((o) => o.ai_quota === -1).length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          AI Token Yonetimi
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Organizasyonlarin AI ozellik erisimini ve token kotalarini yonetin
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">AI Ozellikleri Hakkinda</p>
            <p className="mt-1">
              AI ozellikleri <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">module_ai_generation</code> ve{' '}
              <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">ai_token_quota</code> plan ozelliklerinden kontrol edilir.
              Override sistemi ile paket disinda AI erisimi verilebilir.
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                {stats.total}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Toplam Org.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.aiEnabled}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">AI Aktif</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary-100 p-2 dark:bg-secondary-700">
              <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                {stats.aiDisabled}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">AI Kapali</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.withQuota}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Kotali</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.unlimited}
              </p>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Sinirsiz</p>
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

      {/* Plan AI Features Summary */}
      {planFeatures.length > 0 && (
        <Card>
          <CardHeader
            title="Plan AI Ozellikleri"
            subtitle="Her plana tanimli AI ayarlari"
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {planFeatures.map((pf) => (
                <div
                  key={pf.plan_id}
                  className="rounded-lg border border-secondary-200 bg-secondary-50 p-3 dark:border-secondary-700 dark:bg-secondary-800/50"
                >
                  <div className="flex items-center justify-between">
                    <PlanBadge planName={pf.plan_name} />
                    <AIStatusBadge enabled={pf.ai_enabled} />
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                      Token Kotasi:
                    </span>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                      {pf.ai_quota === null
                        ? '-'
                        : pf.ai_quota === -1
                        ? 'Sinirsiz'
                        : `${pf.ai_quota.toLocaleString('tr-TR')} token`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations list */}
      <Card>
        <CardHeader
          title="Organizasyon AI Durumu"
          subtitle={`${filteredOrganizations.length} sonuc`}
        />
        <CardContent>
          {/* Filter controls */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              <Input
                placeholder="Ara (ad veya slug)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <select
                value={aiFilter}
                onChange={(e) => setAIFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                className="rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="all">Tum Durumlar</option>
                <option value="enabled">AI Aktif</option>
                <option value="disabled">AI Kapali</option>
              </select>
            </div>
            <Button
              onClick={fetchData}
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

          {/* Table */}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {searchQuery || aiFilter !== 'all' ? 'Sonuc bulunamadi' : 'Henuz organizasyon yok'}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {searchQuery || aiFilter !== 'all'
                  ? 'Filtreleri degistirmeyi deneyin'
                  : 'Organizasyonlar olusturulunca burada gorunecek'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50 text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800/50 dark:text-secondary-400">
                  <tr>
                    <th className="px-4 py-3">Organizasyon</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">AI Durumu</th>
                    <th className="px-4 py-3">Token Kotasi</th>
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
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-secondary-100">
                            {org.name}
                          </p>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400">
                            /{org.slug}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge planName={org.subscription?.plan?.name} />
                      </td>
                      <td className="px-4 py-3">
                        <AIStatusBadge enabled={org.ai_enabled} />
                      </td>
                      <td className="px-4 py-3">
                        <QuotaDisplay quota={org.ai_quota} usage={org.ai_usage} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle AI Access */}
                          <button
                            type="button"
                            onClick={() => handleToggleAccessModal(org)}
                            className={`rounded p-1.5 transition-colors ${
                              org.ai_enabled
                                ? 'text-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30'
                                : 'text-green-500 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30'
                            }`}
                            title={org.ai_enabled ? 'AI Kapat' : 'AI Ac'}
                          >
                            {org.ai_enabled ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* Adjust Quota */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuotaModal(org)}
                            className="rounded p-1.5 text-purple-500 transition-colors hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/30"
                            title="Kota Ayarla"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
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

      {/* Quota Modal */}
      <Modal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        title={`${selectedOrg?.name || ''} - Token Kotasi`}
      >
        <form onSubmit={handleQuotaSubmit}>
          <div className="space-y-4">
            {formError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                role="alert"
              >
                {formError}
              </div>
            )}

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Bu islem planin kota ayarini degistirir ve ayni plandaki tum organizasyonlari etkiler.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3 dark:border-secondary-700 dark:bg-secondary-800/50">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500 dark:text-secondary-400">Mevcut Plan:</span>
                <PlanBadge planName={selectedOrg?.subscription?.plan?.name} />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-secondary-500 dark:text-secondary-400">Mevcut Kota:</span>
                <span className="font-medium text-secondary-900 dark:text-secondary-100">
                  {selectedOrg?.ai_quota === null
                    ? '-'
                    : selectedOrg?.ai_quota === -1
                    ? 'Sinirsiz'
                    : `${selectedOrg?.ai_quota?.toLocaleString('tr-TR')} token`}
                </span>
              </div>
            </div>

            <Input
              label="Yeni Token Kotasi"
              type="number"
              min="-1"
              value={quotaFormData.quota}
              onChange={(e) => setQuotaFormData((prev) => ({ ...prev, quota: e.target.value }))}
              placeholder="-1 = sinirsiz, bos = devre disi"
              helperText="-1 sinirsiz kota verir, bos veya 0 AI erisimini kisitlar"
              disabled={isSaving}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuotaModalOpen(false)}
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

      {/* AI Access Toggle Modal */}
      <Modal
        isOpen={isAccessModalOpen}
        onClose={() => {
          setIsAccessModalOpen(false)
          setAccessTarget(null)
        }}
        title="AI Erisimini Degistir"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Organizasyon:</dt>
                <dd className="font-medium text-secondary-900 dark:text-secondary-100">
                  {accessTarget?.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Plan:</dt>
                <dd>
                  <PlanBadge planName={accessTarget?.subscription?.plan?.name} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Mevcut Durum:</dt>
                <dd>
                  {accessTarget && <AIStatusBadge enabled={accessTarget.ai_enabled} />}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary-500 dark:text-secondary-400">Yeni Durum:</dt>
                <dd>
                  {accessTarget && <AIStatusBadge enabled={!accessTarget.ai_enabled} />}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Bu islem <code className="rounded bg-blue-100 px-1 dark:bg-blue-900/50">module_ai_generation</code>{' '}
              ozelligi icin bir override olusturur/gunceller. Plan ayarlarindan bagimsiz olarak calisir.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAccessModalOpen(false)
                setAccessTarget(null)
              }}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button
              onClick={handleToggleAccess}
              isLoading={isSaving}
            >
              {accessTarget?.ai_enabled ? 'AI Kapat' : 'AI Ac'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
