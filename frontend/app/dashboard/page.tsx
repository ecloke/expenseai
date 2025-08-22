'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
  Zap
} from 'lucide-react'

interface ExpenseData {
  date: string
  amount: number
  category: string
  store: string
}

interface DashboardStats {
  totalExpenses: number
  monthlyTotal: number
  categoryCounts: Record<string, number>
  recentExpenses: ExpenseData[]
  botStatus: 'active' | 'inactive' | 'error'
  sheetsConnected: boolean
  aiProcessed: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 847,
    monthlyTotal: 1247.89,
    categoryCounts: {
      'Food & Dining': 15,
      'Shopping': 8,
      'Transportation': 5,
      'Utilities': 3,
      'Entertainment': 7
    },
    recentExpenses: [
      { date: '2024-01-15', amount: 23.45, category: 'Food & Dining', store: 'Starbucks' },
      { date: '2024-01-14', amount: 89.99, category: 'Shopping', store: 'Amazon' },
      { date: '2024-01-13', amount: 12.50, category: 'Transportation', store: 'Uber' },
      { date: '2024-01-12', amount: 67.30, category: 'Food & Dining', store: 'Whole Foods' },
      { date: '2024-01-11', amount: 156.78, category: 'Utilities', store: 'Electric Company' }
    ],
    botStatus: 'active',
    sheetsConnected: true,
    aiProcessed: 234
  })

  const [timeRange, setTimeRange] = useState('30d')

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
              <Badge variant={stats.botStatus === 'active' ? 'default' : 'destructive'}>
                {stats.botStatus === 'active' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Bot Active
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Bot Offline
                  </>
                )}
              </Badge>
              <Button variant="outline" size="sm">Settings</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back! 👋</h1>
          <p className="text-gray-600">Here's your expense tracking overview</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExpenses}</div>
              <p className="text-xs text-muted-foreground">
                Tracked this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Processed</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aiProcessed}</div>
              <p className="text-xs text-muted-foreground">
                Receipts analyzed
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">97.2%</div>
              <p className="text-xs text-muted-foreground">
                AI processing accuracy
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Expense Categories */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Expense Categories
                  </CardTitle>
                  <CardDescription>Breakdown by category this month</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant={timeRange === '7d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('7d')}
                  >
                    7D
                  </Button>
                  <Button 
                    variant={timeRange === '30d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('30d')}
                  >
                    30D
                  </Button>
                  <Button 
                    variant={timeRange === '90d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('90d')}
                  >
                    90D
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.categoryCounts).map(([category, count]) => {
                  const total = Object.values(stats.categoryCounts).reduce((a, b) => a + b, 0)
                  const percentage = (count / total) * 100
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">{count} expenses</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>Current system health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm">Telegram Bot</span>
                </div>
                <Badge variant={stats.botStatus === 'active' ? 'default' : 'destructive'}>
                  {stats.botStatus === 'active' ? 'Active' : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-sm">Google Sheets</span>
                </div>
                <Badge variant={stats.sheetsConnected ? 'default' : 'destructive'}>
                  {stats.sheetsConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm">AI Processing</span>
                </div>
                <Badge variant="default">Operational</Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Last Activity</div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">2 minutes ago</span>
                </div>
              </div>

              <Button className="w-full" size="sm">
                View Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
            <CardDescription>Your latest tracked expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentExpenses.map((expense, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{expense.store}</div>
                      <div className="text-sm text-muted-foreground">{expense.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${expense.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{expense.date}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t mt-4">
              <Button variant="outline" className="w-full">
                View All Expenses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Quick Action</div>
                  <div className="text-lg font-semibold">Test Bot</div>
                </div>
                <Bot className="h-8 w-8 opacity-80" />
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full">
                Send Test Message
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Export Data</div>
                  <div className="text-lg font-semibold">Download CSV</div>
                </div>
                <FileSpreadsheet className="h-8 w-8 opacity-80" />
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full">
                Export Expenses
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">Settings</div>
                  <div className="text-lg font-semibold">Manage Config</div>
                </div>
                <Activity className="h-8 w-8 opacity-80" />
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full">
                Update Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}