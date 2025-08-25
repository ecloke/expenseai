'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ExpenseCharts from '@/components/dashboard/ExpenseCharts'
import ExpenseList from '@/components/dashboard/ExpenseList'
import TutorialGuide from '@/components/tutorial/TutorialGuide'
import { 
  BarChart3,
  Receipt
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadUser()
    checkTutorialStatus()
  }, [])

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-2">Track and analyze your spending patterns</p>
        </div>

        {/* Analytics Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-400" />
            Analytics Overview
          </h2>
          <ExpenseCharts userId={user?.id} />
        </div>

        {/* Expenses Table Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-green-400" />
            Recent Transactions
          </h2>
          <ExpenseList userId={user?.id} />
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