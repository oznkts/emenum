/**
 * Dashboard Page - Server Component Wrapper
 *
 * This server component wrapper enables dynamic rendering for the dashboard
 * which requires authentication context.
 */

import DashboardClient from './dashboard-client'

// Force dynamic rendering - dashboard requires auth context
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return <DashboardClient />
}
