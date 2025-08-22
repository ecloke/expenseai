'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Brain, 
  FileSpreadsheet, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Clock,
  Zap,
  Settings,
  LogOut,
  Plus,
  ExternalLink,
  Receipt
} from 'lucide-react'

interface UserConfig {
  id: string
  telegram_bot_token: string | null
  telegram_bot_username: string | null
  google_sheet_id: string | null
  gemini_api_key: string | null
  sheet_name: string | null
}

interface BotSession {
  bot_username: string
  is_active: boolean
  last_activity: string
}

interface ReceiptLog {
  store_name: string | null
  total_amount: number | null
  processing_status: 'success' | 'error' | 'partial'
  created_at: string
}

interface DashboardStats {
  totalExpenses: number
  monthlyTotal: number
  recentExpenses: ReceiptLog[]
  botStatus: 'active' | 'inactive' | 'not_configured'
  sheetsConnected: boolean
  aiProcessed: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
  const [botSession, setBotSession] = useState<BotSession | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 Dashboard Debug - Session:', session?.user?.id)
      if (!session) {
        console.log('❌ No session found, redirecting to login')
        router.push('/login')
        return
      }
      
      console.log('✅ User authenticated:', session.user.id)
      setUser(session.user)

      // Load user configuration
      console.log('🔍 Looking for user_config with user_id:', session.user.id)
      const { data: config, error: configError } = await supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      console.log('📊 User config result:', { config, configError })
      
      if (configError && configError.code !== 'PGRST116') {
        console.log('❌ Config error (not PGRST116):', configError)
        throw configError
      }

      console.log('✅ User config loaded:', {
        hasConfig: !!config,
        botToken: config?.telegram_bot_token ? '[ENCRYPTED]' : null,
        botUsername: config?.telegram_bot_username,
        geminiKey: config?.gemini_api_key ? '[ENCRYPTED]' : null,
        googleToken: config?.google_access_token ? '[ENCRYPTED]' : null
      })
      
      setUserConfig(config)

      if (config) {
        // Load bot session if bot is configured
        if (config.telegram_bot_username) {
          console.log('🤖 Loading bot session for user:', session.user.id)
          const { data: botData, error: botError } = await supabase
            .from('bot_sessions')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          console.log('🤖 Bot session result:', { botData, botError })
          console.log('🤖 Bot session status:', {
            isActive: botData?.is_active,
            botUsername: botData?.bot_username,
            lastActivity: botData?.last_activity
          })
          
          setBotSession(botData)
        } else {
          console.log('⚠️ No telegram bot username in config, skipping bot session load')
        }

        // Load receipt logs for stats
        const { data: receipts } = await supabase
          .from('receipt_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Calculate stats from real data
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const monthlyReceipts = receipts?.filter(r => 
          new Date(r.created_at) >= monthStart
        ) || []

        const monthlyTotal = monthlyReceipts.reduce((sum, r) => 
          sum + (r.total_amount || 0), 0
        )

        const successfulReceipts = receipts?.filter(r => 
          r.processing_status === 'success'
        ).length || 0

        setStats({
          totalExpenses: monthlyReceipts.length,
          monthlyTotal,
          recentExpenses: receipts?.slice(0, 5) || [],
          botStatus: config.telegram_bot_token 
            ? (botSession?.is_active ? 'active' : 'inactive')
            : 'not_configured',
          sheetsConnected: !!config.google_sheet_id,
          aiProcessed: successfulReceipts
        })
      } else {
        // New user - no configuration yet
        setStats({
          totalExpenses: 0,
          monthlyTotal: 0,
          recentExpenses: [],
          botStatus: 'not_configured',
          sheetsConnected: false,
          aiProcessed: 0
        })
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show setup required state for new users
  if (!userConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">ExpenseAI</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.email}
                </span>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to ExpenseAI! 🎉</h1>
            <p className="text-xl text-gray-600 mb-8">
              Let's set up your AI-powered expense tracker in just a few steps.
            </p>
          </div>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Complete the setup wizard to start tracking your expenses with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-6">
                  <Bot className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">1. Create Telegram Bot</h3>
                  <p className="text-sm text-gray-600">Set up your personal bot token</p>
                </div>
                <div className="text-center p-6">
                  <Brain className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">2. Add Gemini AI</h3>
                  <p className="text-sm text-gray-600">Enable AI receipt processing</p>
                </div>
                <div className="text-center p-6">
                  <FileSpreadsheet className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">3. Connect Google Sheets</h3>
                  <p className="text-sm text-gray-600">Link your expense spreadsheet</p>
                </div>
              </div>
              
              <div className="text-center pt-4">
                <Link href="/setup">
                  <Button size="lg" className="text-lg px-8 py-3">
                    <Plus className="mr-2 h-5 w-5" />
                    Start Setup Wizard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show main dashboard for configured users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">ExpenseAI</span>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={stats?.botStatus === 'active' ? 'default' : 'secondary'}>
                {stats?.botStatus === 'active' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Bot Active
                  </>
                ) : stats?.botStatus === 'inactive' ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Bot Offline
                  </>
                ) : (
                  <>
                    <Settings className="h-3 w-3 mr-1" />
                    Setup Required
                  </>
                )}
              </Badge>
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600">
            {userConfig.telegram_bot_username 
              ? `Your bot @${userConfig.telegram_bot_username} is ready to process expenses`
              : 'Complete your setup to start tracking expenses'
            }
          </p>
        </div>

        {/* How to Use Section */}
        {userConfig.telegram_bot_username && (
          <Card className="mb-8 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Zap className="h-5 w-5" />
                How to Track Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Send Receipt Photos</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Message @{userConfig.telegram_bot_username} with photos of your receipts. 
                    The AI will extract items, prices, and store info automatically.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Ask Questions</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Type questions like "How much did I spend on groceries?" or 
                    "Show my expenses from last week" to get instant insights.
                  </p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Start chatting with your bot:</span>
                  <Button 
                    size="sm" 
                    asChild
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <a 
                      href={`https://t.me/${userConfig.telegram_bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open @{userConfig.telegram_bot_username}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.monthlyTotal.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalExpenses || 0} expenses this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receipts Processed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aiProcessed || 0}</div>
              <p className="text-xs text-muted-foreground">
                Successfully analyzed
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.botStatus === 'active' ? 'Online' : 
                 stats?.botStatus === 'inactive' ? 'Offline' : 'Setup'}
              </div>
              <p className="text-xs text-muted-foreground">
                {userConfig.telegram_bot_username || 'Not configured'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Sheets</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.sheetsConnected ? 'Connected' : 'Not Setup'}
              </div>
              <p className="text-xs text-muted-foreground">
                {userConfig.sheet_name || 'No sheet configured'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses or Setup Reminder */}
        {(stats?.recentExpenses?.length ?? 0) > 0 ? (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Expenses
              </CardTitle>
              <CardDescription>Your latest processed receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentExpenses?.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        expense.processing_status === 'success' 
                          ? 'bg-green-100' 
                          : expense.processing_status === 'error'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                      }`}>
                        <DollarSign className={`h-5 w-5 ${
                          expense.processing_status === 'success' 
                            ? 'text-green-600' 
                            : expense.processing_status === 'error'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium">
                          {expense.store_name || 'Unknown Store'}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {expense.processing_status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${expense.total_amount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm mb-8">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No expenses tracked yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Send a receipt photo to your Telegram bot to get started!
                </p>
                {userConfig.telegram_bot_username && (
                  <Button variant="outline" asChild>
                    <a 
                      href={`https://t.me/${userConfig.telegram_bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Telegram Bot
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Quick Action</div>
                  <div className="text-lg font-semibold">
                    {userConfig.telegram_bot_username ? 'Chat with Bot' : 'Setup Bot'}
                  </div>
                </div>
                <Bot className="h-8 w-8 opacity-80" />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-4 w-full"
                asChild={!!userConfig.telegram_bot_username}
              >
                {userConfig.telegram_bot_username ? (
                  <a 
                    href={`https://t.me/${userConfig.telegram_bot_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Telegram
                  </a>
                ) : (
                  <Link href="/setup">
                    Setup Bot
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Google Sheets</div>
                  <div className="text-lg font-semibold">
                    {userConfig.google_sheet_id ? 'View Sheet' : 'Connect Sheets'}
                  </div>
                </div>
                <FileSpreadsheet className="h-8 w-8 opacity-80" />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-4 w-full"
                asChild={!!userConfig.google_sheet_id}
              >
                {userConfig.google_sheet_id ? (
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${userConfig.google_sheet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Sheet
                  </a>
                ) : (
                  <Link href="/setup">
                    Connect Sheets
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Settings</div>
                  <div className="text-lg font-semibold">Update Config</div>
                </div>
                <Settings className="h-8 w-8 opacity-80" />
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" asChild>
                <Link href="/setup">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}