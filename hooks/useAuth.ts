'use client'

import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/components/providers/auth-provider'

/**
 * Hook to access authentication context
 *
 * Must be used within an AuthProvider component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isLoading, signOut } = useAuth()
 *
 *   if (isLoading) return <div>Yukleniyor...</div>
 *   if (!user) return <div>Giris yapmalisiniz</div>
 *
 *   return (
 *     <div>
 *       <p>Hosgeldiniz, {user.email}</p>
 *       <button onClick={signOut}>Cikis Yap</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @returns AuthContextValue - The authentication context value
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Wrap your component tree with <AuthProvider>.'
    )
  }

  return context
}
