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
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff, Brain } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const geminiKeySchema = z.object({
  apiKey: z.string()
    .min(1, 'API key is required')
    .regex(/^AI[A-Za-z0-9_-]+$/, 'Invalid Gemini API key format')
})

type GeminiKeyForm = z.infer<typeof geminiKeySchema>

interface GeminiKeyStepProps {
  onNext: () => void
  onBack: () => void
}

export default function GeminiKeyStep({ onNext, onBack }: GeminiKeyStepProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<GeminiKeyForm>({
    resolver: zodResolver(geminiKeySchema)
  })

  const apiKey = watch('apiKey')

  const validateApiKey = async (key: string) => {
    setIsValidating(true)
    setError(null)

    try {
      // In a real app, you'd get the user ID from authentication
      const userId = 'temp-user-id'

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/gemini-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          api_key: key,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'API key validation failed')
      }

      setIsConfigured(true)
      toast({
        title: "Gemini AI configured!",
        description: "Your API key has been validated and saved securely.",
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

  const handleContinue = () => {
    if (isConfigured) {
      onNext()
    }
  }

  const onSubmit = async (data: GeminiKeyForm) => {
    await validateApiKey(data.apiKey)
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            Get Your Gemini AI API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">1</Badge>
              <div>
                <p className="font-medium">Visit Google AI Studio</p>
                <p className="text-sm text-gray-600">
                  Go to{' '}
                  <a 
                    href="https://makersuite.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline inline-flex items-center gap-1"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}to get your free API key
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-purple-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">2</Badge>
              <div>
                <p className="font-medium">Create an API key</p>
                <p className="text-sm text-gray-600">
                  Click "Create API key" and select your Google Cloud project
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-purple-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">3</Badge>
              <div>
                <p className="font-medium">Copy your API key</p>
                <p className="text-sm text-gray-600">
                  Your key will start with "AI" followed by random characters
                </p>
              </div>
            </div>
          </div>

          {/* Features Info */}
          <div className="mt-4 p-3 bg-white/60 rounded-lg border">
            <p className="text-sm font-medium text-gray-800 mb-2">What Gemini AI will do:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>📸 <strong>Receipt OCR:</strong> Extract store names, items, and prices from photos</li>
              <li>🏷️ <strong>Smart Categorization:</strong> Automatically categorize expenses (groceries, dining, etc.)</li>
              <li>💬 <strong>Natural Language:</strong> Understand your expense questions and provide insights</li>
              <li>📊 <strong>Data Formatting:</strong> Structure data perfectly for Google Sheets</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* API Key Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Gemini API Key</CardTitle>
          <CardDescription>
            Your API key is encrypted and stored securely
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                Gemini API Key
              </label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder="AIza..."
                  {...register('apiKey')}
                  className={`pr-10 ${errors.apiKey ? 'border-red-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.apiKey && (
                <p className="text-sm text-red-500">{errors.apiKey.message}</p>
              )}
            </div>

            {/* Validation Status */}
            {isValidating && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Testing your API key with Gemini AI...
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isConfigured && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-medium">Gemini AI configured successfully!</div>
                  <div className="text-sm mt-1">
                    Your API key has been validated and encrypted for secure storage.
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
                disabled={isValidating || (!apiKey && !isConfigured)}
                className="flex-1"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : isConfigured ? (
                  'Continue'
                ) : (
                  'Validate & Save'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pricing & Usage Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800">
            💡 Gemini AI Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-blue-700">
            <p className="text-sm">
              <strong>Free tier includes:</strong> 15 requests per minute, 1,500 requests per day
            </p>
            <p className="text-sm">
              <strong>Typical usage:</strong> 1 request per receipt photo + 1 request per chat question
            </p>
            <p className="text-sm">
              <strong>Cost estimate:</strong> Most users stay within the free tier limits
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Capabilities Preview */}
      {isConfigured && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-green-800">
              🚀 AI Features Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 text-green-700">
              <div>
                <p className="font-medium text-sm">Receipt Processing</p>
                <ul className="text-xs space-y-1 mt-1">
                  <li>• Store name extraction</li>
                  <li>• Item-by-item breakdown</li>
                  <li>• Price and quantity detection</li>
                  <li>• Smart categorization</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-sm">Natural Language Chat</p>
                <ul className="text-xs space-y-1 mt-1">
                  <li>• "How much did I spend on food?"</li>
                  <li>• "Show my biggest expenses"</li>
                  <li>• "Compare this month to last"</li>
                  <li>• "What's my average grocery bill?"</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}