'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ExpenseCharts from '@/components/dashboard/ExpenseCharts'
import ExpenseList from '@/components/dashboard/ExpenseList'
import { 
  Bot, 
  Brain, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Settings,
  LogOut,
  ExternalLink,
  Receipt,
  Zap
} from 'lucide-react'

interface UserConfig {
  id: string
  telegram_bot_token: string | null
  telegram_bot_username: string | null
  gemini_api_key: string | null
}

interface BotSession {
  bot_username: string
  is_active: boolean
  last_activity: string
}

export default function EnhancedDashboard() {
  const [loading, setLoading] = useState(true)
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
  const [botSession, setBotSession] = useState<BotSession | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const supabase = createSupabaseClient()
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('❌ No active session, redirecting to login')
        router.push('/login')
        return
      }

      setUser(session.user)

      // Load user configuration
      const { data: config, error: configError } = await supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError
      }
      
      setUserConfig(config)

      // Load bot session if bot is configured
      if (config?.telegram_bot_username) {
        const { data: sessionData } = await supabase
          .from('bot_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        setBotSession(sessionData)
      }

    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no configuration, redirect to setup
  if (!userConfig || !userConfig.telegram_bot_token || !userConfig.gemini_api_key) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-blue-900">Complete Your Setup</CardTitle>
              <CardDescription>
                You need to configure your bot and AI settings before using the enhanced dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your bot and Gemini AI need to be configured to view expense analytics.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/setup">Complete Setup</Link>
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Expense Dashboard</h1>
            <p className="text-gray-300">Track and analyze your spending patterns</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" asChild>
              <Link href="/setup">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Bot Status */}
        <Card className="mb-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-blue-400" />
              Bot Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {botSession?.is_active ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  )}
                  <span className="font-medium text-gray-200">
                    @{userConfig.telegram_bot_username}
                  </span>
                </div>
                <Badge variant={botSession?.is_active ? "default" : "secondary"} 
                       className={botSession?.is_active ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}>
                  {botSession?.is_active ? "Online" : "Offline"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                asChild
              >
                <a 
                  href={`https://t.me/${userConfig.telegram_bot_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Bot
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Main Content */}
        <div className="space-y-8">
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

      </div>
    </div>
  )
}