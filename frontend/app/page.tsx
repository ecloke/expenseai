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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">ExpenseAI</span>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="w-20 h-9 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automate Your Expense Tracking with
            <span className="text-blue-600 block">AI-Powered Telegram Bots</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Simply photograph your receipts and chat with your personal bot. 
            AI extracts data, updates Google Sheets, and answers expense questions naturally.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="text-lg px-8 py-3">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="lg" className="text-lg px-8 py-3">
                    <Bot className="mr-2 h-5 w-5" />
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-3">
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
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>📸 Snap & Send</CardTitle>
              <CardDescription>
                Take a photo of any receipt and send it to your personal Telegram bot
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>🤖 AI Processing</CardTitle>
              <CardDescription>
                Gemini Vision AI extracts store, items, prices, and categories automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Receipt className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>📊 Auto-Update</CardTitle>
              <CardDescription>
                Data populates your Google Sheet instantly with perfect formatting
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Chat Example */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Ask Questions Naturally
          </h2>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-lg py-2 px-4 max-w-xs">
                    "How much did I spend on groceries this month?"
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg py-2 px-4 max-w-md">
                    <Bot className="inline-block h-4 w-4 mr-2" />
                    I'll analyze your receipt data and provide detailed spending insights with category breakdowns and trends.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-lg py-2 px-4 max-w-xs">
                    "Show me my biggest expenses"
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg py-2 px-4 max-w-md">
                    <Bot className="inline-block h-4 w-4 mr-2" />
                    I can identify your largest purchases and spending patterns from your uploaded receipts.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose ExpenseAI?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">Your data stays in your Google Sheets. End-to-end encryption.</p>
          </div>
          <div className="text-center">
            <Zap className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm">Process receipts in seconds. Get insights instantly.</p>
          </div>
          <div className="text-center">
            <Bot className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Personal Bot</h3>
            <p className="text-gray-600 text-sm">Your own Telegram bot that learns your spending patterns.</p>
          </div>
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Natural Language</h3>
            <p className="text-gray-600 text-sm">Ask questions like you're talking to a friend.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Automate Your Expenses?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Set up your AI expense tracker in under 10 minutes
          </p>
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                <MessageSquare className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
                <Bot className="mr-2 h-5 w-5" />
                Start Free Setup
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Receipt className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold">ExpenseAI</span>
          </div>
          <p className="text-gray-400">
            Automate your expense tracking with AI-powered Telegram bots
          </p>
        </div>
      </footer>
    </div>
  )
}