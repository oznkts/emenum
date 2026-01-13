'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/**
 * Admin dashboard statistics interface
 */
interface AdminStats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  totalProducts: number
  totalPlans: number
  recentActivity: {
    newOrganizations: number
    newProducts: number
    serviceRequests: number
  }
}

/**
 * Quick action card component
 */
function QuickActionCard({
  title,
  description,
  href,
  icon,
  color = 'primary',
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color?: 'primary' | 'red' | 'green' | 'yellow'
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
  }

  return (
    <Link
      href={href}
      className="group rounded-lg border border-secondary-200 bg-white p-4 transition-all hover:border-secondary-300 hover:shadow-md dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-secondary-600"
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-secondary-900 group-hover:text-primary-600 dark:text-secondary-100 dark:group-hover:text-primary-400">
            {title}
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {description}
          </p>
        </div>
        <svg
          className="h-5 w-5 text-secondary-400 transition-transform group-hover:translate-x-1 dark:text-secondary-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

/**
 * Stat card component for the admin dashboard
 */
function StatCard({
  title,
  value,
  subtext,
  icon,
  trend,
}: {
  title: string
  value: number | string
  subtext?: string
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
}) {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-secondary-100 p-2 dark:bg-secondary-700">
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            <svg
              className={`h-4 w-4 ${trend.isPositive ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
        </p>
        <p className="text-sm text-secondary-600 dark:text-secondary-400">{title}</p>
        {subtext && (
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-500">{subtext}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Admin Dashboard Page
 *
 * This is the main landing page for the Super Admin panel.
 * It displays:
 * - System-wide statistics (organizations, users, products)
 * - Quick action cards for common admin tasks
 * - Recent activity summary
 *
 * Access: Super Admin only (protected by admin layout)
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch admin statistics
  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()

      try {
        // Fetch all stats in parallel
        const [
          orgsResponse,
          activeOrgsResponse,
          membersResponse,
          productsResponse,
          plansResponse,
          recentOrgsResponse,
          recentProductsResponse,
          serviceRequestsResponse,
        ] = await Promise.all([
          // Total organizations
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          // Active organizations
          supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true),
          // Total members (unique users)
          supabase.from('organization_members').select('user_id', { count: 'exact', head: true }),
          // Total products
          supabase.from('products').select('id', { count: 'exact', head: true }),
          // Total plans
          supabase.from('plans').select('id', { count: 'exact', head: true }),
          // Organizations created in last 7 days
          supabase
            .from('organizations')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          // Products created in last 7 days
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          // Service requests in last 24 hours
          supabase
            .from('service_requests')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        ])

        setStats({
          totalOrganizations: orgsResponse.count ?? 0,
          activeOrganizations: activeOrgsResponse.count ?? 0,
          totalUsers: membersResponse.count ?? 0,
          totalProducts: productsResponse.count ?? 0,
          totalPlans: plansResponse.count ?? 0,
          recentActivity: {
            newOrganizations: recentOrgsResponse.count ?? 0,
            newProducts: recentProductsResponse.count ?? 0,
            serviceRequests: serviceRequestsResponse.count ?? 0,
          },
        })
      } catch {
        setError('Istatistikler yuklenirken hata olustu')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Istatistikler yukleniyor...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
          Super Admin Paneli
        </h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Sistem geneli istatistikler ve yonetim araclari
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
        <svg className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Super Admin modundasiniz. Bu paneldeki tum islemler denetim kaydina alinmaktadir.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Organizasyon"
          value={stats?.totalOrganizations ?? 0}
          subtext={`${stats?.activeOrganizations ?? 0} aktif`}
          icon={
            <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          trend={
            stats?.recentActivity.newOrganizations
              ? { value: stats.recentActivity.newOrganizations, isPositive: true }
              : undefined
          }
        />

        <StatCard
          title="Toplam Kullanici"
          value={stats?.totalUsers ?? 0}
          icon={
            <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="Toplam Urun"
          value={stats?.totalProducts ?? 0}
          subtext={`${stats?.recentActivity.newProducts ?? 0} yeni (7 gun)`}
          icon={
            <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        <StatCard
          title="Aktif Planlar"
          value={stats?.totalPlans ?? 0}
          subtext={`${stats?.recentActivity.serviceRequests ?? 0} garson cagri (24s)`}
          icon={
            <svg className="h-5 w-5 text-secondary-600 dark:text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Hizli Islemler
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Organizasyonlar"
            description="Tenant yonetimi, aktivasyon ve impersonation"
            href="/admin/organizations"
            color="primary"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <QuickActionCard
            title="Plan Yonetimi"
            description="Plan ve ozellik yapilandirmasi"
            href="/admin/plans"
            color="green"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <QuickActionCard
            title="Ozellik Override"
            description="Organizasyona ozel ozellik ayarlari"
            href="/admin/overrides"
            color="yellow"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            }
          />

          <QuickActionCard
            title="AI Token Yonetimi"
            description="AI kullanim kotasi ve izleme"
            href="/admin/ai"
            color="red"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />

          <QuickActionCard
            title="Sistem Raporu"
            description="Performans ve kullanim raporlari"
            href="/admin"
            color="primary"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <QuickActionCard
            title="Denetim Kayitlari"
            description="Sistem geneli aktivite logları"
            href="/admin"
            color="primary"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent activity section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Son 7 Gunluk Aktivite
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {stats?.recentActivity.newOrganizations ?? 0}
                </p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Yeni organizasyon
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {stats?.recentActivity.newProducts ?? 0}
                </p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Yeni urun
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                  {stats?.recentActivity.serviceRequests ?? 0}
                </p>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Garson cagri (24s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
