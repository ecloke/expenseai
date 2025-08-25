'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExpenseCharts from '@/components/dashboard/ExpenseCharts'
import ExpenseList from '@/components/dashboard/ExpenseList'
import TutorialGuide from '@/components/tutorial/TutorialGuide'
import { 
  BarChart3,
  Receipt,
  Filter
} from 'lucide-react'
import { SimpleSelect } from '@/components/ui/simple-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [selectedProject, setSelectedProject] = useState('general')
  const [projects, setProjects] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    loadUser()
    checkTutorialStatus()
  }, [])

  useEffect(() => {
    if (user) {
      loadProjects()
    }
  }, [user])

  const checkTutorialStatus = () => {
    // Check if user has seen tutorial before
    const tutorialSeen = localStorage.getItem('tutorial-completed')
    
    // Check if user just completed setup (indicated by setup completion redirect)
    const fromSetup = sessionStorage.getItem('from-setup')
    
    if (!tutorialSeen || fromSetup) {
      setShowTutorial(true)
      // Clear the setup flag
      sessionStorage.removeItem('from-setup')
    }
  }

  const handleTutorialComplete = () => {
    localStorage.setItem('tutorial-completed', 'true')
    setShowTutorial(false)
  }

  const loadUser = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/login')
        return
      }

      setUser(session.user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadProjects = async () => {
    if (!user) return

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, currency')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading projects:', error)
        return
      }

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handleProjectChange = (value: string) => {
    setSelectedProject(value)
  }

  const getCurrentProjectCurrency = () => {
    if (selectedProject === 'general') {
      return '$'
    }
    const project = projects.find(p => p.id === selectedProject)
    return project?.currency || '$'
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-2">Track and analyze your spending patterns</p>
          </div>
          
          {/* Project Filter */}
          <Card className="bg-gray-800 border-gray-700 w-80">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Project</label>
                <SimpleSelect
                  value={selectedProject}
                  onValueChange={handleProjectChange}
                  options={[
                    { value: 'general', label: '📁 General Expenses' },
                    ...projects.map(project => ({
                      value: project.id,
                      label: `📁 ${project.name.length > 20 ? project.name.substring(0, 17) + '...' : project.name}`
                    }))
                  ]}
                  placeholder="Select Project"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Analytics Overview
          </h2>
          <ExpenseCharts userId={user?.id} projectId={selectedProject} currency={getCurrentProjectCurrency()} />
        </div>

        {/* Expenses Table Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-green-400" />
            Recent Transactions
          </h2>
          <ExpenseList userId={user?.id} projectId={selectedProject} />
        </div>
      </div>

      {/* Tutorial Guide */}
      <TutorialGuide 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </DashboardLayout>
  )
}