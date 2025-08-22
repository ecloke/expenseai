'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const telegramBotSchema = z.object({
  botToken: z.string()
    .min(1, 'Bot token is required')
    .regex(/^\d+:[A-Za-z0-9_-]{35}$/, 'Invalid bot token format')
})

type TelegramBotForm = z.infer<typeof telegramBotSchema>

interface TelegramBotStepProps {
  onNext: () => void
  onBack: () => void
}

interface BotInfo {
  id: number
  username: string
  first_name: string
  is_bot: boolean
}

export default function TelegramBotStep({ onNext, onBack }: TelegramBotStepProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TelegramBotForm>({
    resolver: zodResolver(telegramBotSchema)
  })

  const botToken = watch('botToken')

  const validateBotToken = async (token: string) => {
    setIsValidating(true)
    setError(null)
    setBotInfo(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bot/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bot_token: token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Token validation failed')
      }

      setBotInfo(data.bot_info)
      toast({
        title: "Bot token validated!",
        description: `Successfully connected to @${data.bot_info.username}`,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed'
      setError(errorMessage)
      toast({
        title: "Validation failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsValidating(false)
    }
  }

  const saveBotConfiguration = async (data: TelegramBotForm) => {
    if (!botInfo) {
      await validateBotToken(data.botToken)
      return
    }

    try {
      // In a real app, you'd get the user ID from authentication
      const userId = 'temp-user-id' // This would come from your auth system

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bot/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          bot_token: data.botToken,
          bot_username: botInfo.username,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Setup failed')
      }

      toast({
        title: "Bot configured successfully!",
        description: "Your Telegram bot is ready to process receipts.",
      })

      onNext()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Setup failed'
      toast({
        title: "Setup failed",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      })
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            How to Create Your Telegram Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">1</Badge>
              <div>
                <p className="font-medium">Open Telegram and find @BotFather</p>
                <p className="text-sm text-gray-600">
                  Search for @BotFather in Telegram or{' '}
                  <a 
                    href="https://t.me/botfather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    click here <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">2</Badge>
              <div>
                <p className="font-medium">Create a new bot</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Send this command to @BotFather:</p>
                  <div className="bg-gray-100 p-2 rounded font-mono text-sm flex items-center justify-between">
                    <span>/newbot</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard('/newbot')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">3</Badge>
              <div>
                <p className="font-medium">Follow the prompts</p>
                <p className="text-sm text-gray-600">
                  Choose a name (e.g., "My Expense Bot") and username (e.g., "my_expense_bot")
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">4</Badge>
              <div>
                <p className="font-medium">Copy your bot token</p>
                <p className="text-sm text-gray-600">
                  @BotFather will give you a token that looks like: <code className="bg-gray-100 px-1 rounded">123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Bot Token</CardTitle>
          <CardDescription>
            Paste the token from @BotFather to connect your bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(saveBotConfiguration)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="botToken" className="text-sm font-medium">
                Bot Token
              </label>
              <Input
                id="botToken"
                type="password"
                placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                {...register('botToken')}
                className={errors.botToken ? 'border-red-500' : ''}
              />
              {errors.botToken && (
                <p className="text-sm text-red-500">{errors.botToken.message}</p>
              )}
            </div>

            {/* Validation Status */}
            {botToken && botToken.length > 10 && !botInfo && !isValidating && (
              <Button
                type="button"
                variant="outline"
                onClick={() => validateBotToken(botToken)}
                className="w-full"
              >
                Validate Token
              </Button>
            )}

            {isValidating && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Validating bot token...
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {botInfo && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-medium">Bot validated successfully!</div>
                  <div className="text-sm mt-1">
                    Connected to: <strong>@{botInfo.username}</strong> ({botInfo.first_name})
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={!botInfo || isValidating}
                className="flex-1"
              >
                {botInfo ? 'Continue' : 'Validate & Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bot Features Preview */}
      {botInfo && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">
              🎉 Your Bot is Ready!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-3">
              Once setup is complete, you'll be able to:
            </p>
            <ul className="text-green-700 space-y-1 text-sm">
              <li>📸 Send receipt photos to @{botInfo.username}</li>
              <li>💬 Ask questions like "How much did I spend this week?"</li>
              <li>📊 Get automatic expense categorization and tracking</li>
              <li>🔗 See all data synced to your Google Sheets</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}