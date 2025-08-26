/**
 * Custom hooks for authentication management
 * Provides React Query integration for auth operations
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/apiClient'
import { queryKeys } from '@/lib/queryClient'

/**
 * Hook to get current user session
 */
export const useSession = () => {
  return useQuery({
    queryKey: queryKeys.user.session(),
    queryFn: () => authAPI.getSession(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry auth failures
  })
}

/**
 * Hook to sign in
 */
export const useSignIn = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.signIn(email, password),
    onSuccess: (data) => {
      if (data.data.session) {
        router.push('/dashboard')
      }
    },
    onError: (error) => {
      console.error('Sign in error:', error)
    },
  })
}

/**
 * Hook to sign up
 */
export const useSignUp = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.signUp(email, password),
    onError: (error) => {
      console.error('Sign up error:', error)
    },
  })
}

/**
 * Hook to sign out
 */
export const useSignOut = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: () => authAPI.signOut(),
    onSuccess: () => {
      router.push('/login')
    },
    onError: (error) => {
      console.error('Sign out error:', error)
    },
  })
}