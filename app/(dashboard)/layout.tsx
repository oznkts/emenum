/**
 * Dashboard Layout - Server Component
 *
 * This server component wrapper enables dynamic rendering for all dashboard routes
 * which require authentication context. It wraps the client layout component.
 */

import { AuthProvider } from '@/components/providers/auth-provider'
import DashboardLayoutClient from './dashboard-layout-client'

// Force dynamic rendering - dashboard requires auth context
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </AuthProvider>
  )
}
