'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Receipt, MessageSquare, Smartphone, Zap, Shield, LogIn, LogOut } from 'lucide-react'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    
    getUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b bg-gray-900/80 backdrop-blur-sm border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">ExpenseAI</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {loading ? (
              <div className="w-16 sm:w-20 h-9 bg-gray-700 animate-pulse rounded"></div>
            ) : user ? (
              <>
                <Link href="/dashboard" className="hidden sm:block">
                  <Button variant="ghost" className="text-white hover:bg-gray-800 hover:text-white">Dashboard</Button>
                </Link>
                <Link href="/dashboard" className="sm:hidden">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 hover:text-white px-2">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut} className="text-white hover:bg-gray-800 hover:text-white">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" className="text-white hover:bg-gray-800 hover:text-white">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4">
                    <span className="sm:hidden">Start</span>
                    <span className="hidden sm:inline">Get Started</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
            Automate Your Expense Tracking with
            <span className="text-blue-400 block">AI-Powered Telegram Bots</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed px-2 sm:px-0">
            Simply photograph your receipts and chat with your personal bot. 
            AI extracts data, provides insights, and tracks expenses automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3">
                    <Bot className="mr-2 h-5 w-5" />
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3">
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <Card className="text-center border-0 shadow-lg bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
              <CardTitle className="text-white text-lg sm:text-xl">📸 Snap & Send</CardTitle>
              <CardDescription className="text-gray-300 text-sm sm:text-base">
                Take a photo of any receipt and send it to your personal Telegram bot
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
              <CardTitle className="text-white text-lg sm:text-xl">🤖 AI Processing</CardTitle>
              <CardDescription className="text-gray-300 text-sm sm:text-base">
                Gemini Vision AI extracts store, items, prices, and categories automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-gray-800/80 backdrop-blur-sm sm:col-span-2 md:col-span-1">
            <CardHeader className="pb-4">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
              <CardTitle className="text-white text-lg sm:text-xl">📊 Smart Tracking</CardTitle>
              <CardDescription className="text-gray-300 text-sm sm:text-base">
                Advanced analytics, summaries, and spending insights delivered instantly
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Chat Example */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">
            Ask Questions Naturally
          </h2>
          <Card className="bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-4 sm:p-8">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-lg py-2 px-3 sm:px-4 max-w-xs text-sm sm:text-base">
                    "How much did I spend on groceries this month?"
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 rounded-lg py-2 px-3 sm:px-4 max-w-sm sm:max-w-md text-sm sm:text-base">
                    <Bot className="inline-block h-4 w-4 mr-2" />
                    I'll analyze your expense data and provide detailed spending insights with category breakdowns and trends.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-lg py-2 px-3 sm:px-4 max-w-xs text-sm sm:text-base">
                    "Show me my biggest expenses"
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-gray-100 rounded-lg py-2 px-3 sm:px-4 max-w-sm sm:max-w-md text-sm sm:text-base">
                    <Bot className="inline-block h-4 w-4 mr-2" />
                    I can identify your largest purchases and spending patterns from your receipts.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-8 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">
          Why Choose ExpenseAI?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Secure & Private</h3>
            <p className="text-gray-300 text-sm">Your data stays secure with encrypted storage and privacy-first design.</p>
          </div>
          <div className="text-center">
            <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-green-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Lightning Fast</h3>
            <p className="text-gray-300 text-sm">Process receipts in seconds. Get insights instantly.</p>
          </div>
          <div className="text-center">
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Personal Bot</h3>
            <p className="text-gray-300 text-sm">Your own Telegram bot that learns your spending patterns.</p>
          </div>
          <div className="text-center">
            <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Natural Language</h3>
            <p className="text-gray-300 text-sm">Ask questions like you're talking to a friend.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-700 text-white py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Automate Your Expenses?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-blue-200 px-4 sm:px-0">
            Set up your AI expense tracker in under 10 minutes
          </p>
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3">
                <MessageSquare className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3">
                <Bot className="mr-2 h-5 w-5" />
                Start Free Setup
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Receipt className="h-6 w-6 text-blue-300" />
            <span className="text-xl font-bold">ExpenseAI</span>
          </div>
          <p className="text-gray-500">
            Automate your expense tracking with AI-powered Telegram bots
          </p>
        </div>
      </footer>
    </div>
  )
}