'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'

export interface HeaderProps {
  /** Callback to open sidebar on mobile */
  onMenuClick?: () => void
  /** Organization slug for menu preview link */
  organizationSlug?: string
  /** Page title to display (optional) */
  title?: string
  /** Custom right-side actions */
  actions?: ReactNode
  /** Show menu preview link */
  showMenuPreview?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Dashboard header component with mobile menu toggle and actions.
 *
 * Features:
 * - Mobile menu hamburger button
 * - Optional page title display
 * - Menu preview link (opens public menu in new tab)
 * - Custom action slots
 * - Responsive design
 *
 * @example
 * ```tsx
 * <Header
 *   onMenuClick={() => setSidebarOpen(true)}
 *   organizationSlug="restoran-adi"
 *   title="Urunler"
 *   actions={<Button variant="primary">Yeni Urun</Button>}
 * />
 * ```
 */
export function Header({
  onMenuClick,
  organizationSlug,
  title,
  actions,
  showMenuPreview = true,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={`
        flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-4
        dark:border-secondary-700 dark:bg-secondary-800 lg:px-6
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Left side: Mobile menu + title */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button
            type="button"
            className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 lg:hidden"
            onClick={onMenuClick}
            aria-label="Menuyu ac"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Page title */}
        {title && (
          <h1 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 hidden lg:block">
            {title}
          </h1>
        )}

        {/* Spacer when no title on desktop */}
        {!title && <div className="hidden lg:block" />}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Menu preview link */}
        {showMenuPreview && organizationSlug && (
          <Link
            href={`/menu/${organizationSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-50 dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">Menu Onizle</span>
          </Link>
        )}

        {/* Custom actions */}
        {actions}
      </div>
    </header>
  )
}

/**
 * Breadcrumb item configuration
 */
export interface BreadcrumbItem {
  /** Display label */
  label: string
  /** Link href (optional - last item usually doesn't have href) */
  href?: string
}

export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[]
  /** Additional class names */
  className?: string
}

/**
 * Breadcrumb navigation component for dashboard pages.
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Urunler', href: '/products' },
 *     { label: 'Duzenle' },
 *   ]}
 * />
 * ```
 */
export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-sm ${className}`.trim()}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && (
              <svg
                className="h-4 w-4 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-200 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast
                  ? 'font-medium text-secondary-900 dark:text-secondary-100'
                  : 'text-secondary-600 dark:text-secondary-400'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/**
 * Page header component combining title and breadcrumbs.
 * Use this at the top of dashboard pages.
 */
export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Page description (optional) */
  description?: string
  /** Breadcrumb items (optional) */
  breadcrumbs?: BreadcrumbItem[]
  /** Right-side actions (optional) */
  actions?: ReactNode
  /** Additional class names */
  className?: string
}

/**
 * Page header with title, description, breadcrumbs, and actions.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Urunler"
 *   description="Menuye eklemek istediginiz urunleri yonetin"
 *   breadcrumbs={[
 *     { label: 'Dashboard', href: '/dashboard' },
 *     { label: 'Urunler' },
 *   ]}
 *   actions={<Button variant="primary">Yeni Urun</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`.trim()}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export default Header
