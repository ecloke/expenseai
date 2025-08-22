'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy } from 'lucide-react'

interface TelegramBotStepProps {
  botToken: string
  setBotToken: (token: string) => void
  botUsername: string
  setBotUsername: (username: string) => void
  onValidationComplete: (isValid: boolean) => void
  isLoading?: boolean
}

interface BotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

export default function TelegramBotStep({
  botToken,
  setBotToken,
  botUsername,
  setBotUsername,
  onValidationComplete,
  isLoading = false
}: TelegramBotStepProps) {
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    botInfo?: BotInfo
    error?: string
  } | null>(null)

  const validateBotToken = async (token: string) => {
    if (!token || token.trim().length === 0) {
      setValidationResult({
        isValid: false,
        error: 'Bot token is required'
      })
      onValidationComplete(false)
      return
    }

    // Basic format validation for Telegram bot tokens
    const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/
    if (!tokenPattern.test(token.trim())) {
      setValidationResult({
        isValid: false,
        error: 'Invalid bot token format. Should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
      })
      onValidationComplete(false)
      return
    }

    setValidating(true)
    setValidationResult(null)

    try {
      // Validate bot token via Telegram API getMe endpoint
      const response = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`)
      const data = await response.json()

      if (data.ok && data.result) {
        const botInfo: BotInfo = data.result
        
        if (!botInfo.is_bot) {
          setValidationResult({
            isValid: false,
            error: 'The provided token does not belong to a bot account'
          })
          onValidationComplete(false)
          return
        }

        // Success - save bot info to database
        try {
          console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
          console.log('Saving bot config for user_id: temp-user-id')
          const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot/setup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: 'temp-user-id', // TODO: Replace with actual user ID
              bot_token: token.trim(),
              bot_username: botInfo.username
            }),
          })

          const saveData = await saveResponse.json()
          console.log('Save response:', saveResponse.status, saveData)
          
          if (!saveResponse.ok) {
            throw new Error(saveData.message || 'Failed to save bot configuration')
          }

          // Update local state only after successful database save
          setBotUsername(botInfo.username)
          setValidationResult({
            isValid: true,
            botInfo: botInfo
          })
          onValidationComplete(true)
          
        } catch (saveError) {
          console.error('Error saving bot config:', saveError)
          const errorMessage = saveError instanceof Error ? saveError.message : 'Unknown error'
          setValidationResult({
            isValid: false,
            error: `Validation successful but failed to save: ${errorMessage}`
          })
          onValidationComplete(false)
        }

      } else {
        setValidationResult({
          isValid: false,
          error: data.description || 'Invalid bot token. Please check your token.'
        })
        onValidationComplete(false)
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: 'Failed to validate bot token. Please check your internet connection and try again.'
      })
      onValidationComplete(false)
    } finally {
      setValidating(false)
    }
  }

  const handleTokenChange = (value: string) => {
    setBotToken(value)
    setValidationResult(null)
    onValidationComplete(false)
  }

  const handleValidate = () => {
    validateBotToken(botToken)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 text-white rounded-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Create Your Telegram Bot</h3>
            <p className="text-sm text-gray-600">Set up a personal bot for expense tracking</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Bot className="h-5 w-5 mr-2 text-amber-600" />
              Step-by-Step Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                <div className="space-y-1">
                  <p><strong>Open Telegram and search for @BotFather</strong></p>
                  <Button variant="link" className="p-0 h-auto text-xs" asChild>
                    <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open @BotFather
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                <div className="space-y-1">
                  <p><strong>Send the command to create a new bot</strong></p>
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
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                <p><strong>Choose a name for your bot</strong><br />
                   <span className="text-gray-600">e.g., "My Expense Tracker"</span></p>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                <p><strong>Choose a username ending in "bot"</strong><br />
                   <span className="text-gray-600">e.g., "myexpense_bot"</span></p>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-semibold">5</span>
                <p><strong>Copy the bot token from BotFather's response</strong><br />
                   <span className="text-gray-600">It looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Bot Token</Label>
            <div className="space-y-2">
              <Input
                id="bot-token"
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={botToken}
                onChange={(e) => handleTokenChange(e.target.value)}
                disabled={isLoading || validating}
                className={
                  validationResult?.isValid === true 
                    ? "border-green-500 bg-green-50" 
                    : validationResult?.isValid === false
                    ? "border-red-500 bg-red-50"
                    : ""
                }
              />
              <Button
                onClick={handleValidate}
                disabled={validating || isLoading || !botToken.trim()}
                className="w-full"
                variant={validationResult?.isValid ? "default" : "outline"}
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating Bot Token...
                  </>
                ) : validationResult?.isValid ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Bot Token Validated
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Validate Bot Token
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <Alert variant={validationResult.isValid ? "default" : "destructive"}>
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationResult.isValid ? (
                  <div className="space-y-2">
                    <p className="font-medium">✅ Bot token is valid!</p>
                    {validationResult.botInfo && (
                      <div className="text-sm space-y-1">
                        <p><strong>Bot Name:</strong> {validationResult.botInfo.first_name}</p>
                        <p><strong>Username:</strong> @{validationResult.botInfo.username}</p>
                        <p><strong>Bot ID:</strong> {validationResult.botInfo.id}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">❌ Validation failed</p>
                    <p className="text-sm mt-1">{validationResult.error}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success message with next steps */}
          {validationResult?.isValid && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-green-800">
                      Great! Your bot is ready for the next step.
                    </p>
                    <p className="text-green-700">
                      You can now proceed to configure AI processing with Gemini API.
                    </p>
                    <p className="text-xs text-green-600">
                      Once setup is complete, you'll be able to send receipt photos to @{validationResult.botInfo?.username} and get automated expense tracking!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}