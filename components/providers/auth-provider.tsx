'use client'

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Organization, OrganizationMember, UserRole } from '@/types'

/**
 * Auth context value type
 */
export interface AuthContextValue {
  /** Current authenticated user */
  user: User | null
  /** Current session */
  session: Session | null
  /** Whether the auth state is being loaded */
  isLoading: boolean
  /** Current user's organization membership */
  membership: OrganizationMember | null
  /** Current user's organization */
  organization: Organization | null
  /** Current user's role in the organization */
  role: UserRole | null
  /** Sign out the current user */
  signOut: () => Promise<void>
  /** Refresh the auth state */
  refreshAuth: () => Promise<void>
  /** Set the current organization (for users with multiple orgs) */
  setCurrentOrganization: (organizationId: string) => Promise<void>
}

/**
 * Auth context for managing authentication state
 */
export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth provider component that manages authentication state
 * and provides it to the component tree via context.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [membership, setMembership] = useState<OrganizationMember | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  const supabase = createClient()

  /**
   * Fetch the user's organization membership and organization details
   */
  const fetchUserOrganization = useCallback(
    async (userId: string) => {
      try {
        // Get user's organization membership
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .single()

        if (memberError || !memberData) {
          setMembership(null)
          setOrganization(null)
          return
        }

        setMembership(memberData as OrganizationMember)

        // Get organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', memberData.organization_id)
          .single()

        if (orgError || !orgData) {
          setOrganization(null)
          return
        }

        setOrganization(orgData as Organization)
      } catch {
        setMembership(null)
        setOrganization(null)
      }
    },
    [supabase]
  )

  /**
   * Refresh the authentication state
   */
  const refreshAuth = useCallback(async () => {
    setIsLoading(true)
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await fetchUserOrganization(currentSession.user.id)
      } else {
        setMembership(null)
        setOrganization(null)
      }
    } catch {
      setSession(null)
      setUser(null)
      setMembership(null)
      setOrganization(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase.auth, fetchUserOrganization])

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setMembership(null)
      setOrganization(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase.auth])

  /**
   * Set the current organization for users with multiple organizations
   */
  const setCurrentOrganization = useCallback(
    async (organizationId: string) => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch the membership for the specified organization
        const { data: memberData, error: memberError } = await supabase
          .from('organization_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .single()

        if (memberError || !memberData) {
          throw new Error('Organizasyon uyeligi bulunamadi')
        }

        setMembership(memberData as OrganizationMember)

        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single()

        if (orgError || !orgData) {
          throw new Error('Organizasyon bulunamadi')
        }

        setOrganization(orgData as Organization)
      } finally {
        setIsLoading(false)
      }
    },
    [user, supabase]
  )

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    // Get initial session
    refreshAuth()

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        await fetchUserOrganization(newSession.user.id)
      } else {
        setMembership(null)
        setOrganization(null)
      }

      // Ensure loading is set to false after state change
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, refreshAuth, fetchUserOrganization])

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    membership,
    organization,
    role: membership?.role ?? null,
    signOut,
    refreshAuth,
    setCurrentOrganization,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
