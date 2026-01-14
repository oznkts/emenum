/**
 * Admin Layout - Server Component
 *
 * This server component wrapper enables dynamic rendering for all admin routes
 * which require authentication context. It wraps the client layout component.
 */

import { AuthProvider } from '@/components/providers/auth-provider'
import AdminLayoutClient from './admin-layout-client'

// Force dynamic rendering - admin requires auth context
export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthProvider>
  )
}
