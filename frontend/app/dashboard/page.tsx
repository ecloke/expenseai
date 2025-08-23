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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Dashboard</h1>
            <p className="text-gray-600">Track and analyze your spending patterns</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                Classic View
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/setup">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Bot Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {botSession?.is_active ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <span className="font-medium">
                    @{userConfig.telegram_bot_username}
                  </span>
                </div>
                <Badge variant={botSession?.is_active ? "default" : "secondary"}>
                  {botSession?.is_active ? "Online" : "Offline"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
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

        {/* Enhanced Features Alert */}
        <Alert className="mb-8">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            <strong>Enhanced Dashboard Features:</strong> This dashboard now uses database storage instead of Google Sheets 
            for better performance. Your bot supports commands like /today, /week, /month for instant expense queries!
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              All Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <ExpenseCharts userId={user?.id} />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpenseList userId={user?.id} />
          </TabsContent>
        </Tabs>

        {/* Database Migration Notice */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Database Migration Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Step Required:</strong> To see your expense data, run the SQL migration in your Supabase dashboard:
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">backend/migrations/add_expenses_table.sql</code>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}