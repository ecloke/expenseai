'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, AlertCircle, ExternalLink, FileSpreadsheet, Shield, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface GoogleSheetsStepProps {
  onNext: () => void
  onBack: () => void
}

interface SheetInfo {
  title: string
  url: string
  sheet_id: string
}

export default function GoogleSheetsStep({ onNext, onBack }: GoogleSheetsStepProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if already connected on component mount
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // In a real app, you'd get the user ID from authentication
      const userId = 'temp-user-id'

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsConnected(data.success)
        
        if (data.sheetInfo) {
          setSheetInfo(data.sheetInfo)
        }
      }
    } catch (err) {
      // Not connected yet, which is fine
      console.log('Not connected to Google Sheets yet')
    }
  }

  const initiateGoogleAuth = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // In a real app, you'd get the user ID from authentication
      const userId = 'temp-user-id'

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google?user_id=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start Google authorization')
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authorization failed'
      setError(errorMessage)
      toast({
        title: "Authorization failed",
        description: errorMessage,
        variant: "destructive"
      })
      setIsConnecting(false)
    }
  }

  const createExpenseSheet = async () => {
    setIsCreatingSheet(true)
    setError(null)

    try {
      // In a real app, you'd get the user ID from authentication
      const userId = 'temp-user-id'

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/create-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          sheet_name: 'AI Expense Tracker'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create expense sheet')
      }

      setSheetInfo({
        title: 'AI Expense Tracker',
        url: data.sheet_url,
        sheet_id: data.sheet_id
      })

      toast({
        title: "Expense sheet created!",
        description: "Your Google Sheet is ready for expense tracking.",
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sheet creation failed'
      setError(errorMessage)
      toast({
        title: "Sheet creation failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsCreatingSheet(false)
    }
  }

  const handleContinue = () => {
    if (isConnected) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      {/* OAuth Instructions */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            Connect Your Google Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-green-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">1</Badge>
              <div>
                <p className="font-medium">Secure OAuth Authorization</p>
                <p className="text-sm text-gray-600">
                  You'll be redirected to Google to authorize access to your Google Sheets
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-green-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">2</Badge>
              <div>
                <p className="font-medium">Automatic Sheet Setup</p>
                <p className="text-sm text-gray-600">
                  We'll create a dedicated expense tracking sheet with proper headers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-green-600 text-white min-w-[24px] h-6 flex items-center justify-center text-xs">3</Badge>
              <div>
                <p className="font-medium">Data Privacy</p>
                <p className="text-sm text-gray-600">
                  Your expense data stays in your own Google Sheet - we never store it
                </p>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <Shield className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium">OAuth 2.0</p>
              <p className="text-xs text-gray-600">Secure authorization</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <FileSpreadsheet className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Your Data</p>
              <p className="text-xs text-gray-600">Stays in your sheets</p>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <Zap className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Real-time</p>
              <p className="text-xs text-gray-600">Instant updates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {!isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Authorize Google Sheets Access</CardTitle>
            <CardDescription>
              Connect your Google account to automatically sync expense data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={initiateGoogleAuth}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Google...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connect with Google
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                You'll be redirected to Google to authorize access
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected State */}
      {isConnected && (
        <>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-medium">Google Sheets connected successfully!</div>
              <div className="text-sm mt-1">
                Your Google account is authorized for expense tracking.
              </div>
            </AlertDescription>
          </Alert>

          {/* Sheet Creation */}
          {!sheetInfo && (
            <Card>
              <CardHeader>
                <CardTitle>Create Your Expense Sheet</CardTitle>
                <CardDescription>
                  Set up a dedicated Google Sheet for tracking your expenses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={createExpenseSheet}
                  disabled={isCreatingSheet}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingSheet ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating expense sheet...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Create Expense Sheet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Sheet Info */}
          {sheetInfo && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">
                  📊 Expense Sheet Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{sheetInfo.title}</p>
                    <p className="text-xs text-gray-600">Google Sheets Document</p>
                  </div>
                  <a
                    href={sheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="text-sm text-green-700">
                  <p className="font-medium mb-1">Your sheet includes:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Pre-formatted columns for Date, Store, Item, Category, etc.</li>
                    <li>• Automatic data population from receipt photos</li>
                    <li>• Real-time updates when you use your Telegram bot</li>
                    <li>• Full control and ownership of your expense data</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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
          onClick={handleContinue}
          disabled={!isConnected || (!sheetInfo && isConnected)}
          className="flex-1"
        >
          {isConnected && sheetInfo ? 'Complete Setup' : 'Complete Connection'}
        </Button>
      </div>

      {/* What Happens Next */}
      {isConnected && sheetInfo && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">
              🎉 You're All Set!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-blue-700">
              <p className="text-sm font-medium">What you can do now:</p>
              <ul className="text-xs space-y-1">
                <li>📱 Send receipt photos to your Telegram bot</li>
                <li>💬 Ask natural language questions about your expenses</li>
                <li>📊 Watch your data automatically appear in Google Sheets</li>
                <li>📈 Track spending patterns and get AI insights</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}