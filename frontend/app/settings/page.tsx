'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bot, 
  Brain, 
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
  Key,
  User
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

export default function Settings() {
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null)
  const [botSession, setBotSession] = useState<BotSession | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTelegramToken, setShowTelegramToken] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  
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
      
      if (config) {
        setUserConfig(config)
        setTelegramToken(config.telegram_bot_token || '')
        setTelegramUsername(config.telegram_bot_username || '')
        setGeminiApiKey(config.gemini_api_key || '')

        // Load bot session if bot is configured
        if (config.telegram_bot_username) {
          const { data: sessionData } = await supabase
            .from('bot_sessions')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
          
          setBotSession(sessionData)
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const supabase = createSupabaseClient()

      const configData = {
        user_id: user.id,
        telegram_bot_token: telegramToken.trim() || null,
        telegram_bot_username: telegramUsername.trim() || null,
        gemini_api_key: geminiApiKey.trim() || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_configs')
        .upsert(configData, {
          onConflict: 'user_id'
        })

      if (error) {
        throw error
      }

      setSuccess('Settings saved successfully!')
      
      // Reload data to get updated config
      setTimeout(() => {
        loadUserData()
      }, 1000)

    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const testBotConnection = async () => {
    if (!telegramToken.trim() || !telegramUsername.trim()) {
      setError('Please enter both Telegram bot token and username first')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: telegramToken.trim(),
          username: telegramUsername.trim()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to test bot connection')
      }

      const result = await response.json()
      
      if (result.success) {
        setSuccess('Bot connection successful!')
      } else {
        setError(result.error || 'Bot connection failed')
      }

    } catch (error) {
      console.error('Error testing bot:', error)
      setError('Failed to test bot connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-gray-300">Loading settings...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">Configure your Telegram bot and AI settings</p>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert className="border-red-600 bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600 bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {/* Account Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5 text-blue-400" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Email</Label>
                <div className="text-white bg-gray-700/50 p-3 rounded-md border border-gray-600">
                  {user?.email}
                </div>
              </div>
              <div>
                <Label className="text-gray-300">User ID</Label>
                <div className="text-gray-400 bg-gray-700/50 p-3 rounded-md border border-gray-600 font-mono text-sm">
                  {user?.id}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Bot Configuration */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="h-5 w-5 text-blue-400" />
              Telegram Bot Configuration
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure your Telegram bot for receipt processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bot Status */}
            {userConfig?.telegram_bot_username && (
              <div className="p-4 rounded-lg bg-gray-700/50 border border-gray-600">
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
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
              </div>
            )}

            {/* Bot Token */}
            <div className="space-y-2">
              <Label htmlFor="telegram-token" className="text-gray-300">
                Bot Token
              </Label>
              <div className="relative">
                <Input
                  id="telegram-token"
                  type={showTelegramToken ? "text" : "password"}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyz"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white h-6 w-6 p-0"
                  onClick={() => setShowTelegramToken(!showTelegramToken)}
                >
                  {showTelegramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                Get your bot token from @BotFather on Telegram
              </p>
            </div>

            {/* Bot Username */}
            <div className="space-y-2">
              <Label htmlFor="telegram-username" className="text-gray-300">
                Bot Username
              </Label>
              <Input
                id="telegram-username"
                type="text"
                placeholder="your_bot_name"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
              />
              <p className="text-sm text-gray-400">
                Your bot's username (without @)
              </p>
            </div>

            {/* Test Connection Button */}
            <Button
              onClick={testBotConnection}
              disabled={saving || !telegramToken.trim() || !telegramUsername.trim()}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              {saving ? 'Testing...' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        {/* Gemini AI Configuration */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              Gemini AI Configuration
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure Google Gemini AI for receipt text extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="gemini-key" className="text-gray-300">
                Gemini API Key
              </Label>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? "text" : "password"}
                  placeholder="AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456789"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white h-6 w-6 p-0"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                Get your API key from Google AI Studio
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}