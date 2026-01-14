'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

/**
 * Admin navigation items for the Super Admin panel
 */
const adminNavItems = [
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    name: 'Organizasyonlar',
    href: '/admin/organizations',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    name: 'Plan Yonetimi',
    href: '/admin/plans',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Ozellik Override',
    href: '/admin/overrides',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    name: 'AI Token Yonetimi',
    href: '/admin/ai',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

/**
 * Admin layout logo component with admin badge
 */
const AdminLogo = () => (
  <Link
    href="/admin"
    className="flex items-center gap-2 text-xl font-bold text-red-600 dark:text-red-400"
  >
    <svg
      className="h-8 w-8"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-red-600" />
      <path
        d="M8 12h16M8 16h16M8 20h12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="6" r="5" className="fill-yellow-400" />
      <path
        d="M26 4v2m0 0v2m0-2h2m-2 0h-2"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
    <div className="flex flex-col">
      <span>ozaMenu</span>
      <span className="text-xs font-normal text-red-500 dark:text-red-400">Super Admin</span>
    </div>
  </Link>
)

/**
 * Admin layout with role-based access control.
 *
 * This layout provides:
 * - Super Admin only access (redirects non-admins)
 * - Admin-specific navigation sidebar
 * - Visual distinction from regular dashboard (red theme)
 * - User impersonation support (future)
 *
 * Routes protected by this layout:
 * - /admin - Admin dashboard
 * - /admin/organizations - Tenant management
 * - /admin/plans - Plan/feature management
 * - /admin/overrides - Feature overrides
 * - /admin/ai - AI token management
 */
export default function AdminLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)

  // Check super admin status from user's app_metadata
  useEffect(() => {
    if (!isLoading && user) {
      const adminStatus = user.app_metadata?.is_super_admin === true
      setIsSuperAdmin(adminStatus)

      // Redirect non-admins to dashboard
      if (!adminStatus) {
        router.replace('/dashboard')
      }
    } else if (!isLoading && !user) {
      // No user, redirect to login
      router.replace('/login?redirectTo=' + pathname)
    }
  }, [user, isLoading, router, pathname])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Show loading state while checking permissions
  if (isLoading || isSuperAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-50 dark:bg-secondary-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            Yetki kontrol ediliyor...
          </p>
        </div>
      </div>
    )
  }

  // If not super admin, don't render anything (redirect will happen)
  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="flex h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out
          dark:bg-secondary-800 lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-red-200 px-4 dark:border-red-900/30">
          <AdminLogo />
          <button
            type="button"
            className="rounded-lg p-1 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menuyu kapat"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Admin badge */}
        <div className="border-b border-red-200 px-4 py-3 dark:border-red-900/30">
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Super Admin Modu
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                Tum sistemlere erisim
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                          : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700/50'
                      }
                    `.trim().replace(/\s+/g, ' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Divider */}
          <div className="my-4 border-t border-secondary-200 dark:border-secondary-700" />

          {/* Quick link back to dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-500 transition-colors hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-700/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Kullanici Paneline Don
          </Link>
        </nav>

        {/* User info & logout */}
        <div className="border-t border-secondary-200 px-4 py-3 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {user?.email?.[0].toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                {user?.email || 'Admin'}
              </p>
              <p className="text-xs text-red-500 dark:text-red-400">
                Super Admin
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoading}
              className="rounded-lg p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300 transition-colors"
              aria-label="Cikis yap"
              title="Cikis yap"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4 dark:border-secondary-700 dark:bg-secondary-800 lg:px-6">
          {/* Mobile menu button */}
          <button
            type="button"
            className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menuyu ac"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Admin mode indicator */}
          <div className="hidden items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300 lg:flex">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Super Admin Modu Aktif
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Documentation link */}
            <a
              href="https://docs.e-menum.net/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Dokumantasyon
            </a>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
