'use client'

import { ReactNode } from 'react'
import { AuthProvider } from './auth-provider'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Root providers component that wraps the app with all necessary context providers.
 * This is a client component that enables client-side state management.
 */
export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>
}
