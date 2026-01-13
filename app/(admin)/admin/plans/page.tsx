'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import type { Plan, Feature, PlanFeature } from '@/types/database'

/**
 * Extended plan with feature count
 */
interface PlanWithDetails extends Plan {
  feature_count?: number
  subscriber_count?: number
}

/**
 * Plan feature with full feature details
 */
interface PlanFeatureWithDetails extends PlanFeature {
  feature?: Feature
}

/**
 * Status badge for plan active state
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
 * Feature type badge
 */
function FeatureTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        type === 'boolean'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      }`}
    >
      {type === 'boolean' ? 'Boolean' : 'Limit'}
    </span>
  )
}

/**
 * Plans Management Page for Super Admin
 *
 * Features:
 * - List all subscription plans
 * - Create/edit/toggle plans
 * - View and manage features catalog
 * - Assign features to plans with values
 * - Dynamic plan system (no hard-coded plan checks)
 */
export default function PlansPage() {
  // Plans state
  const [plans, setPlans] = useState<PlanWithDetails[]>([])
  const [isPlansLoading, setIsPlansLoading] = useState(true)

  // Features state
  const [features, setFeatures] = useState<Feature[]>([])
  const [isFeaturesLoading, setIsFeaturesLoading] = useState(true)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'plans' | 'features'>('plans')

  // Plan modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanWithDetails | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Plan form state
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price_monthly: '',
    is_active: true,
    sort_order: 0,
  })

  // Feature modal state
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)

  // Feature form state
  const [featureFormData, setFeatureFormData] = useState({
    key: '',
    name: '',
    description: '',
    type: 'boolean' as 'boolean' | 'limit',
  })

  // Plan features modal state
  const [isPlanFeaturesModalOpen, setIsPlanFeaturesModalOpen] = useState(false)
  const [selectedPlanForFeatures, setSelectedPlanForFeatures] = useState<PlanWithDetails | null>(null)
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureWithDetails[]>([])
  const [isPlanFeaturesLoading, setIsPlanFeaturesLoading] = useState(false)

  /**
   * Fetch all plans with details
   */
  const fetchPlans = useCallback(async () => {
    setIsPlansLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .order('sort_order', { ascending: true })

      if (plansError) throw plansError

      // Fetch plan features count
      const { data: planFeaturesData, error: pfError } = await supabase
        .from('plan_features')
        .select('plan_id')

      if (pfError) throw pfError

      // Fetch subscriber counts
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .eq('status', 'active')

      if (subsError) throw subsError

      // Count features per plan
      const featureCountMap = new Map<string, number>()
      planFeaturesData?.forEach((pf) => {
        featureCountMap.set(pf.plan_id, (featureCountMap.get(pf.plan_id) || 0) + 1)
      })

      // Count subscribers per plan
      const subscriberCountMap = new Map<string, number>()
      subsData?.forEach((sub) => {
        subscriberCountMap.set(sub.plan_id, (subscriberCountMap.get(sub.plan_id) || 0) + 1)
      })

      // Combine data
      const plansWithDetails: PlanWithDetails[] = (plansData || []).map((plan) => ({
        ...plan,
        feature_count: featureCountMap.get(plan.id) || 0,
        subscriber_count: subscriberCountMap.get(plan.id) || 0,
      }))

      setPlans(plansWithDetails)
    } catch {
      setError('Planlar yuklenirken bir hata olustu.')
    } finally {
      setIsPlansLoading(false)
    }
  }, [])

  /**
   * Fetch all features
   */
  const fetchFeatures = useCallback(async () => {
    setIsFeaturesLoading(true)

    try {
      const supabase = createClient()
      const { data, error: featuresError } = await supabase
        .from('features')
        .select('*')
        .order('key', { ascending: true })

      if (featuresError) throw featuresError
      setFeatures(data || [])
    } catch {
      setError('Ozellikler yuklenirken bir hata olustu.')
    } finally {
      setIsFeaturesLoading(false)
    }
  }, [])

  /**
   * Fetch plan features for a specific plan
   */
  const fetchPlanFeatures = useCallback(async (planId: string) => {
    setIsPlanFeaturesLoading(true)

    try {
      const supabase = createClient()
      const { data, error: pfError } = await supabase
        .from('plan_features')
        .select('*, features(*)')
        .eq('plan_id', planId)

      if (pfError) throw pfError

      const planFeaturesWithDetails: PlanFeatureWithDetails[] = (data || []).map((pf) => ({
        ...pf,
        feature: pf.features as unknown as Feature,
      }))

      setPlanFeatures(planFeaturesWithDetails)
    } catch {
      setFormError('Plan ozellikleri yuklenirken hata olustu.')
    } finally {
      setIsPlanFeaturesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlans()
    fetchFeatures()
  }, [fetchPlans, fetchFeatures])

  /**
   * Open plan modal for creating/editing
   */
  const handleOpenPlanModal = (plan?: PlanWithDetails) => {
    if (plan) {
      setEditingPlan(plan)
      setPlanFormData({
        name: plan.name,
        price_monthly: plan.price_monthly?.toString() || '',
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      })
    } else {
      setEditingPlan(null)
      setPlanFormData({
        name: '',
        price_monthly: '',
        is_active: true,
        sort_order: plans.length,
      })
    }
    setFormError(null)
    setIsPlanModalOpen(true)
  }

  /**
   * Handle plan form submission
   */
  const handlePlanSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()
      const priceMonthly = planFormData.price_monthly
        ? parseFloat(planFormData.price_monthly)
        : null

      if (editingPlan) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from('plans')
          .update({
            name: planFormData.name.trim(),
            price_monthly: priceMonthly,
            is_active: planFormData.is_active,
            sort_order: planFormData.sort_order,
          })
          .eq('id', editingPlan.id)

        if (updateError) throw updateError
      } else {
        // Create new plan
        const { error: insertError } = await supabase.from('plans').insert({
          name: planFormData.name.trim(),
          price_monthly: priceMonthly,
          is_active: planFormData.is_active,
          sort_order: planFormData.sort_order,
        })

        if (insertError) throw insertError
      }

      setIsPlanModalOpen(false)
      await fetchPlans()
    } catch {
      setFormError('Plan kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Toggle plan active status
   */
  const handleTogglePlan = async (plan: PlanWithDetails) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)

      if (updateError) throw updateError
      await fetchPlans()
    } catch {
      setError('Plan durumu guncellenirken hata olustu.')
    }
  }

  /**
   * Open feature modal for creating/editing
   */
  const handleOpenFeatureModal = (feature?: Feature) => {
    if (feature) {
      setEditingFeature(feature)
      setFeatureFormData({
        key: feature.key,
        name: feature.name,
        description: feature.description || '',
        type: feature.type,
      })
    } else {
      setEditingFeature(null)
      setFeatureFormData({
        key: '',
        name: '',
        description: '',
        type: 'boolean',
      })
    }
    setFormError(null)
    setIsFeatureModalOpen(true)
  }

  /**
   * Handle feature form submission
   */
  const handleFeatureSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      if (editingFeature) {
        // Update existing feature
        const { error: updateError } = await supabase
          .from('features')
          .update({
            name: featureFormData.name.trim(),
            description: featureFormData.description.trim() || null,
            type: featureFormData.type,
          })
          .eq('id', editingFeature.id)

        if (updateError) throw updateError
      } else {
        // Create new feature
        const { error: insertError } = await supabase.from('features').insert({
          key: featureFormData.key.trim(),
          name: featureFormData.name.trim(),
          description: featureFormData.description.trim() || null,
          type: featureFormData.type,
        })

        if (insertError) throw insertError
      }

      setIsFeatureModalOpen(false)
      await fetchFeatures()
    } catch {
      setFormError('Ozellik kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Open plan features modal
   */
  const handleOpenPlanFeaturesModal = async (plan: PlanWithDetails) => {
    setSelectedPlanForFeatures(plan)
    setFormError(null)
    setIsPlanFeaturesModalOpen(true)
    await fetchPlanFeatures(plan.id)
  }

  /**
   * Toggle feature for a plan
   */
  const handleTogglePlanFeature = async (featureId: string, currentValue: boolean | null) => {
    if (!selectedPlanForFeatures) return

    try {
      const supabase = createClient()
      const existingPlanFeature = planFeatures.find((pf) => pf.feature_id === featureId)

      if (existingPlanFeature) {
        if (currentValue === true) {
          // Remove the feature from plan
          const { error: deleteError } = await supabase
            .from('plan_features')
            .delete()
            .eq('plan_id', selectedPlanForFeatures.id)
            .eq('feature_id', featureId)

          if (deleteError) throw deleteError
        } else {
          // Update to true
          const { error: updateError } = await supabase
            .from('plan_features')
            .update({ value_boolean: true })
            .eq('plan_id', selectedPlanForFeatures.id)
            .eq('feature_id', featureId)

          if (updateError) throw updateError
        }
      } else {
        // Add new plan feature
        const { error: insertError } = await supabase.from('plan_features').insert({
          plan_id: selectedPlanForFeatures.id,
          feature_id: featureId,
          value_boolean: true,
          value_limit: null,
        })

        if (insertError) throw insertError
      }

      await fetchPlanFeatures(selectedPlanForFeatures.id)
      await fetchPlans()
    } catch {
      setFormError('Ozellik durumu guncellenirken hata olustu.')
    }
  }

  /**
   * Update limit value for a plan feature
   */
  const handleUpdatePlanFeatureLimit = async (featureId: string, limitValue: number | null) => {
    if (!selectedPlanForFeatures) return

    try {
      const supabase = createClient()
      const existingPlanFeature = planFeatures.find((pf) => pf.feature_id === featureId)

      if (existingPlanFeature) {
        const { error: updateError } = await supabase
          .from('plan_features')
          .update({ value_limit: limitValue })
          .eq('plan_id', selectedPlanForFeatures.id)
          .eq('feature_id', featureId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('plan_features').insert({
          plan_id: selectedPlanForFeatures.id,
          feature_id: featureId,
          value_boolean: null,
          value_limit: limitValue,
        })

        if (insertError) throw insertError
      }

      await fetchPlanFeatures(selectedPlanForFeatures.id)
      await fetchPlans()
    } catch {
      setFormError('Limit degeri guncellenirken hata olustu.')
    }
  }

  /**
   * Format price in Turkish locale
   */
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'Ucretsiz'
    return `${price.toLocaleString('tr-TR')} TL / ay`
  }

  // Stats
  const stats = {
    totalPlans: plans.length,
    activePlans: plans.filter((p) => p.is_active).length,
    totalFeatures: features.length,
    booleanFeatures: features.filter((f) => f.type === 'boolean').length,
    limitFeatures: features.filter((f) => f.type === 'limit').length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Plan Yonetimi
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Abonelik planlarini ve ozellik katalogunu yonetin
        </p>
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

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'plans'
                ? 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Planlar ({stats.totalPlans})
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400'
                : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Ozellikler ({stats.totalFeatures})
            </div>
          </button>
        </nav>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <Card>
          <CardHeader
            title="Abonelik Planlari"
            subtitle={`${stats.activePlans} aktif plan`}
            action={
              <Button
                onClick={() => handleOpenPlanModal()}
                size="sm"
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Yeni Plan
              </Button>
            }
          />
          <CardContent>
            {isPlansLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-secondary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  Henuz plan yok
                </h3>
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  Yeni plan ekleyerek baslayın
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-secondary-200 bg-secondary-50 text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800/50 dark:text-secondary-400">
                    <tr>
                      <th className="px-4 py-3">Sira</th>
                      <th className="px-4 py-3">Plan Adi</th>
                      <th className="px-4 py-3">Fiyat</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3 text-center">Ozellik</th>
                      <th className="px-4 py-3 text-center">Abone</th>
                      <th className="px-4 py-3 text-right">Islemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                    {plans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50"
                      >
                        <td className="px-4 py-3">
                          <span className="text-secondary-500 dark:text-secondary-400">
                            #{plan.sort_order + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-secondary-900 dark:text-secondary-100">
                            {plan.name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            {formatPrice(plan.price_monthly)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge isActive={plan.is_active} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            {plan.feature_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-secondary-600 dark:text-secondary-400">
                            {plan.subscriber_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {/* Manage Features */}
                            <button
                              type="button"
                              onClick={() => handleOpenPlanFeaturesModal(plan)}
                              className="rounded p-1.5 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
                              title="Ozellikleri Yonet"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                              </svg>
                            </button>

                            {/* Toggle Active */}
                            <button
                              type="button"
                              onClick={() => handleTogglePlan(plan)}
                              className={`rounded p-1.5 transition-colors ${
                                plan.is_active
                                  ? 'text-yellow-500 hover:bg-yellow-100 hover:text-yellow-700 dark:hover:bg-yellow-900/30'
                                  : 'text-green-500 hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30'
                              }`}
                              title={plan.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            >
                              {plan.is_active ? (
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
                              onClick={() => handleOpenPlanModal(plan)}
                              className="rounded p-1.5 text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
                              title="Duzenle"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <Card>
          <CardHeader
            title="Ozellik Katalogu"
            subtitle={`${stats.booleanFeatures} boolean, ${stats.limitFeatures} limit`}
            action={
              <Button
                onClick={() => handleOpenFeatureModal()}
                size="sm"
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
              >
                Yeni Ozellik
              </Button>
            }
          />
          <CardContent>
            {isFeaturesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
              </div>
            ) : features.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-secondary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  Henuz ozellik yok
                </h3>
                <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                  Yeni ozellik ekleyerek baslayın
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-secondary-200 bg-secondary-50 text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800/50 dark:text-secondary-400">
                    <tr>
                      <th className="px-4 py-3">Anahtar</th>
                      <th className="px-4 py-3">Ad</th>
                      <th className="px-4 py-3">Aciklama</th>
                      <th className="px-4 py-3">Tip</th>
                      <th className="px-4 py-3 text-right">Islemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                    {features.map((feature) => (
                      <tr
                        key={feature.id}
                        className="transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50"
                      >
                        <td className="px-4 py-3">
                          <code className="rounded bg-secondary-100 px-1.5 py-0.5 text-xs font-mono text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300">
                            {feature.key}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-secondary-900 dark:text-secondary-100">
                            {feature.name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-secondary-500 dark:text-secondary-400">
                            {feature.description || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <FeatureTypeBadge type={feature.type} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenFeatureModal(feature)}
                              className="rounded p-1.5 text-secondary-500 transition-colors hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
                              title="Duzenle"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
      )}

      {/* Plan Modal */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? 'Plan Duzenle' : 'Yeni Plan'}
      >
        <form onSubmit={handlePlanSubmit}>
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
              label="Plan Adi"
              value={planFormData.name}
              onChange={(e) => setPlanFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Gold, Platinum, Enterprise..."
              required
              disabled={isSaving}
            />

            <Input
              label="Aylik Fiyat (TL)"
              type="number"
              step="0.01"
              min="0"
              value={planFormData.price_monthly}
              onChange={(e) => setPlanFormData((prev) => ({ ...prev, price_monthly: e.target.value }))}
              placeholder="0.00 (bos = ucretsiz)"
              disabled={isSaving}
            />

            <Input
              label="Sıralama"
              type="number"
              min="0"
              value={planFormData.sort_order}
              onChange={(e) => setPlanFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              disabled={isSaving}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="plan_is_active"
                checked={planFormData.is_active}
                onChange={(e) => setPlanFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-secondary-300 text-red-600 focus:ring-red-500"
                disabled={isSaving}
              />
              <label htmlFor="plan_is_active" className="text-sm text-secondary-700 dark:text-secondary-300">
                Plan aktif
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPlanModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingPlan ? 'Kaydet' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Feature Modal */}
      <Modal
        isOpen={isFeatureModalOpen}
        onClose={() => setIsFeatureModalOpen(false)}
        title={editingFeature ? 'Ozellik Duzenle' : 'Yeni Ozellik'}
      >
        <form onSubmit={handleFeatureSubmit}>
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
              label="Anahtar (key)"
              value={featureFormData.key}
              onChange={(e) => setFeatureFormData((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="module_waiter_call, limit_products..."
              required
              disabled={isSaving || !!editingFeature}
              helperText={editingFeature ? 'Anahtar degistirilemez' : 'Benzersiz bir anahtar girin'}
            />

            <Input
              label="Goruntulenen Ad"
              value={featureFormData.name}
              onChange={(e) => setFeatureFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Garson Cagri Sistemi"
              required
              disabled={isSaving}
            />

            <Input
              label="Aciklama"
              value={featureFormData.description}
              onChange={(e) => setFeatureFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ozellik hakkinda kisa aciklama"
              disabled={isSaving}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Tip
              </label>
              <select
                value={featureFormData.type}
                onChange={(e) => setFeatureFormData((prev) => ({ ...prev, type: e.target.value as 'boolean' | 'limit' }))}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                disabled={isSaving}
              >
                <option value="boolean">Boolean (Acik/Kapali)</option>
                <option value="limit">Limit (Sayi)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFeatureModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingFeature ? 'Kaydet' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plan Features Modal */}
      <Modal
        isOpen={isPlanFeaturesModalOpen}
        onClose={() => setIsPlanFeaturesModalOpen(false)}
        title={`${selectedPlanForFeatures?.name || ''} - Ozellikler`}
        size="lg"
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

          {isPlanFeaturesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : features.length === 0 ? (
            <p className="text-center text-secondary-500 dark:text-secondary-400">
              Henuz ozellik tanimlanmamis. Oncelikle ozellik katalogu olusturun.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-secondary-200 bg-white text-xs uppercase text-secondary-600 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-400">
                  <tr>
                    <th className="px-3 py-2">Ozellik</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2 text-center">Deger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
                  {features.map((feature) => {
                    const planFeature = planFeatures.find((pf) => pf.feature_id === feature.id)
                    const isEnabled = planFeature?.value_boolean === true
                    const limitValue = planFeature?.value_limit

                    return (
                      <tr key={feature.id} className="transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium text-secondary-900 dark:text-secondary-100">
                              {feature.name}
                            </p>
                            <code className="text-xs text-secondary-500 dark:text-secondary-400">
                              {feature.key}
                            </code>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <FeatureTypeBadge type={feature.type} />
                        </td>
                        <td className="px-3 py-2">
                          {feature.type === 'boolean' ? (
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePlanFeature(feature.id, isEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  isEnabled
                                    ? 'bg-green-500'
                                    : 'bg-secondary-300 dark:bg-secondary-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min="-1"
                                value={limitValue ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseInt(e.target.value)
                                  handleUpdatePlanFeatureLimit(feature.id, val)
                                }}
                                placeholder="-1 = sinirsiz"
                                className="w-24 rounded border border-secondary-300 px-2 py-1 text-center text-sm dark:border-secondary-600 dark:bg-secondary-700"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setIsPlanFeaturesModalOpen(false)}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
