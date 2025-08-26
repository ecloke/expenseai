/**
 * Custom hooks for project data management
 * Provides React Query integration for project operations
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { projectAPI } from '@/lib/apiClient'
import { queryKeys, invalidateQueries } from '@/lib/queryClient'

/**
 * Hook to fetch projects for a user
 */
export const useProjects = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.projects.lists(),
    queryFn: () => projectAPI.getProjects(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // Projects don't change as often - 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Hook to create a new project
 */
export const useCreateProject = () => {
  return useMutation({
    mutationFn: ({ 
      userId, 
      projectData 
    }: {
      userId: string
      projectData: {
        name: string
        currency: string
      }
    }) => projectAPI.createProject(userId, projectData),
    onSuccess: () => {
      // Invalidate projects queries
      invalidateQueries.projects()
    },
    onError: (error) => {
      console.error('Error creating project:', error)
    },
  })
}

/**
 * Hook to update a project
 */
export const useUpdateProject = () => {
  return useMutation({
    mutationFn: ({ 
      userId, 
      projectId, 
      updates 
    }: {
      userId: string
      projectId: string
      updates: {
        name?: string
        currency?: string
        status?: string
      }
    }) => projectAPI.updateProject(userId, projectId, updates),
    onSuccess: () => {
      // Invalidate projects queries
      invalidateQueries.projects()
    },
    onError: (error) => {
      console.error('Error updating project:', error)
    },
  })
}

/**
 * Hook to delete a project
 */
export const useDeleteProject = () => {
  return useMutation({
    mutationFn: ({ userId, projectId }: { userId: string; projectId: string }) =>
      projectAPI.deleteProject(userId, projectId),
    onSuccess: () => {
      // Invalidate projects queries
      invalidateQueries.projects()
    },
    onError: (error) => {
      console.error('Error deleting project:', error)
    },
  })
}