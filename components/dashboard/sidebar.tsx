'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navigation item configuration
 */
export interface NavItem {
  /** Display name (Turkish) */
  name: string
  /** Route path */
  href: string
  /** Icon element */
  icon: ReactNode
  /** Optional badge count */
  badge?: number
}

export interface SidebarProps {
  /** Whether sidebar is open on mobile */
  isOpen: boolean
  /** Callback to close sidebar */
  onClose: () => void
  /** Organization name to display */
  organizationName?: string
  /** Organization slug */
  organizationSlug?: string
  /** User email for avatar */
  userEmail?: string
  /** Whether sign out is in progress */
  isSigningOut?: boolean
  /** Callback for sign out */
  onSignOut?: () => void
  /** Navigation items to display */
  navItems?: NavItem[]
  /** Custom logo element */
  logo?: ReactNode
}

/**
 * Default navigation items for the dashboard
 */
export const defaultNavItems: NavItem[] = [
  {
    name: 'Genel Bakis',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Kategoriler',
    href: '/categories',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    name: 'Urunler',
    href: '/products',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    name: 'Masalar',
    href: '/tables',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    name: 'Garson Cagri',
    href: '/waiter',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    name: 'Denetim Kaydi',
    href: '/audit',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Ayarlar',
    href: '/settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

/**
 * Default ozaMenu logo component
 */
const DefaultLogo = () => (
  <Link
    href="/dashboard"
    className="flex items-center gap-2 text-xl font-bold text-primary-600 dark:text-primary-400"
  >
    <svg
      className="h-8 w-8"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-primary-600" />
      <path
        d="M8 12h16M8 16h16M8 20h12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    <span>ozaMenu</span>
  </Link>
)

/**
 * Dashboard sidebar navigation component.
 *
 * Features:
 * - Mobile-responsive with slide-in animation
 * - Active route highlighting
 * - Organization info display
 * - User avatar with sign out
 * - Customizable navigation items
 *
 * @example
 * ```tsx
 * <Sidebar
 *   isOpen={sidebarOpen}
 *   onClose={() => setSidebarOpen(false)}
 *   organizationName="Restoran Adi"
 *   organizationSlug="restoran-adi"
 *   userEmail="user@example.com"
 *   onSignOut={handleSignOut}
 * />
 * ```
 */
export function Sidebar({
  isOpen,
  onClose,
  organizationName,
  organizationSlug,
  userEmail,
  isSigningOut = false,
  onSignOut,
  navItems = defaultNavItems,
  logo,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out
          dark:bg-secondary-800 lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Logo header */}
        <div className="flex h-16 items-center justify-between border-b border-secondary-200 px-4 dark:border-secondary-700">
          {logo || <DefaultLogo />}
          <button
            type="button"
            className="rounded-lg p-1 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 lg:hidden"
            onClick={onClose}
            aria-label="Menuyu kapat"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Organization info */}
        {organizationName && (
          <div className="border-b border-secondary-200 px-4 py-3 dark:border-secondary-700">
            <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
              {organizationName}
            </p>
            {organizationSlug && (
              <p className="mt-0.5 text-xs text-secondary-500 dark:text-secondary-400 truncate">
                /{organizationSlug}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700/50'
                      }
                    `.trim().replace(/\s+/g, ' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon}
                    <span className="flex-1">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-medium text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User info & logout */}
        <div className="border-t border-secondary-200 px-4 py-3 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {userEmail?.[0].toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                {userEmail || 'Kullanici'}
              </p>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                disabled={isSigningOut}
                className="rounded-lg p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Cikis yap"
                title="Cikis yap"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
