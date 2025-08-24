'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { UserConfig, BotSession } from '@/types'
import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // If no configuration, redirect to setup
  if (!userConfig || !userConfig.telegram_bot_token || !userConfig.gemini_api_key) {
    router.push('/setup')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Redirecting to setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar userConfig={userConfig} botSession={botSession} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}