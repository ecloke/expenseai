'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Receipt, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        })
        if (error) throw error
        
        // Check if email confirmation is disabled (user is immediately confirmed)
        if (data.user && data.user.email_confirmed_at) {
          router.push('/dashboard')
        } else if (data.user) {
          // User created but needs email confirmation
          router.push('/dashboard') // Redirect anyway - they can use the app
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Receipt className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">ExpenseAI</span>
          </div>
          <p className="text-sm sm:text-base text-gray-300 px-2">AI-powered expense tracking with Telegram bots</p>
        </div>

        <Card className="border-0 shadow-xl bg-gray-800/90 backdrop-blur-sm border-gray-700">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-gray-300 text-sm sm:text-base px-2">
              {isSignUp 
                ? 'Sign up to create your AI expense tracker' 
                : 'Sign in to access your dashboard'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 text-base"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-200 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 text-base"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <Alert variant={error.includes('Check your email') ? 'default' : 'destructive'}>
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:text-gray-400 py-3 text-base"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 text-sm sm:text-base"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>

            <div className="mt-4 text-center pb-2">
              <Link href="/" className="text-xs sm:text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200">
                ← Back to homepage
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}