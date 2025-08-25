'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Edit, Trash2, Plus, FolderPlus, MessageSquare, Calendar, DollarSign, Hash } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Project {
  id: string
  name: string
  currency: string
  status: 'open' | 'closed'
  created_at: string
  transaction_count: number
  total_amount: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createSupabaseClient()

  // Form states
  const [newProject, setNewProject] = useState({
    name: '',
    currency: 'USD'
  })

  const [editForm, setEditForm] = useState({
    name: '',
    currency: '',
    status: 'open' as 'open' | 'closed'
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your projects.",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects?user_id=${session.user.id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch projects')
      }

      setProjects(result.data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProject.name.trim(),
          currency: newProject.currency,
          user_id: session.user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create project')
      }

      toast({
        title: "Success",
        description: "Project created successfully!"
      })

      setNewProject({ name: '', currency: 'USD' })
      setIsCreateDialogOpen(false)
      fetchProjects()
    } catch (error: any) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditProject = async () => {
    if (!editForm.name.trim() || !editingProject) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${editingProject.id}?user_id=${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          currency: editForm.currency,
          status: editForm.status
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update project')
      }

      toast({
        title: "Success",
        description: "Project updated successfully!"
      })

      setIsEditDialogOpen(false)
      setEditingProject(null)
      fetchProjects()
    } catch (error: any) {
      console.error('Error updating project:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update project. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}?user_id=${session.user.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete project')
      }

      toast({
        title: "Success",
        description: "Project and all associated expenses deleted successfully!"
      })

      fetchProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete project. Please try again.",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    setEditForm({
      name: project.name,
      currency: project.currency,
      status: project.status
    })
    setIsEditDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatAmount = (amount: number, currency: string) => {
    return `${currency}${amount.toFixed(2)}`
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
            <p className="text-gray-400">Manage your expense tracking projects</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full bg-gray-800" />
            <Skeleton className="h-[400px] w-full bg-gray-800" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="text-gray-400">Organize your expenses by trips, events, or any specific purpose</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a project to organize expenses for trips, events, or any specific purpose.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-gray-300">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Thailand Trip, Birthday Party"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-currency" className="text-gray-300">Currency</Label>
                <Input
                  id="project-currency"
                  placeholder="e.g., USD, RM, EUR, GBP"
                  value={newProject.currency}
                  onChange={(e) => setNewProject({ ...newProject, currency: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderPlus className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
            <p className="text-gray-400 text-center mb-6 max-w-md">
              Create your first project to organize expenses by trips, events, or any specific purpose.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-400" />
                <span>Use your Telegram bot</span>
              </div>
              <div className="text-gray-600">•</div>
              <div className="flex items-center gap-2">
                <span>Type</span>
                <code className="bg-gray-700 px-2 py-1 rounded text-blue-300">/new</code>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Your Projects</CardTitle>
            <CardDescription className="text-gray-400">
              {projects.length} project{projects.length !== 1 ? 's' : ''} • {projects.filter(p => p.status === 'open').length} open
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-750">
                  <TableHead className="text-gray-300">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Created
                  </TableHead>
                  <TableHead className="text-gray-300">Project Name</TableHead>
                  <TableHead className="text-gray-300">Currency</TableHead>
                  <TableHead className="text-gray-300">
                    <Hash className="h-4 w-4 inline mr-2" />
                    Transactions
                  </TableHead>
                  <TableHead className="text-gray-300">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Total Amount
                  </TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="border-gray-700 hover:bg-gray-750/50">
                    <TableCell className="text-gray-300">
                      {formatDate(project.created_at)}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {project.name}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {project.currency}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {project.transaction_count}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatAmount(project.total_amount, project.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={project.status === 'open' ? 'default' : 'secondary'}
                        className={
                          project.status === 'open' 
                            ? 'bg-green-700 text-white hover:bg-green-600' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }
                      >
                        {project.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(project)}
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete "{project.name}"? This action cannot be undone and will permanently delete all {project.transaction_count} associated transactions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProject(project.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete Project
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update your project details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-gray-300">Project Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency" className="text-gray-300">Currency</Label>
              <Input
                id="edit-currency"
                value={editForm.currency}
                onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-gray-300">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: 'open' | 'closed') => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="open" className="text-white focus:bg-gray-600">Open</SelectItem>
                  <SelectItem value="closed" className="text-white focus:bg-gray-600">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditProject}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Update Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}