'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Brain, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

// Import the functional step components (Google Sheets removed per enhancement)
import TelegramBotStep from '@/components/setup/telegram-bot-step'
import GeminiKeyStep from '@/components/setup/gemini-key-step'
// GoogleSheetsStep removed - now using database storage

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [supabase])

  const SETUP_STEPS = [
    {
      id: 1,
      title: 'Telegram Bot',
      description: 'Create and configure your personal expense bot',
      icon: <Bot className="h-6 w-6" />,
    },
    {
      id: 2,
      title: 'AI Configuration', 
      description: 'Connect Gemini AI for receipt processing',
      icon: <Brain className="h-6 w-6" />,
    },
    // Google Sheets step removed - now using direct database storage
  ]

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('setup-progress')
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress)
        setCurrentStep(progress.currentStep || 1)
        setCompletedSteps(progress.completedSteps || [])
        setBotToken(progress.botToken || '')
        setBotUsername(progress.botUsername || '')
      } catch (error) {
        console.error('Error loading setup progress:', error)
      }
    }
  }, [])

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    const progress = {
      currentStep,
      completedSteps,
      botToken,
      botUsername
    }
    localStorage.setItem('setup-progress', JSON.stringify(progress))
  }, [currentStep, completedSteps, botToken, botUsername])

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }
    if (currentStep < SETUP_STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      // Setup complete
      handleSetupComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepValidation = (stepNumber: number, isValid: boolean) => {
    if (isValid && !completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => [...prev, stepNumber])
    } else if (!isValid && completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => prev.filter(step => step !== stepNumber))
    }
  }

  const handleSetupComplete = async () => {
    try {
      if (!userId) {
        toast({
          title: "Error",
          description: "User not authenticated. Please sign in and try again.",
          variant: "destructive"
        })
        return
      }

      // Start the Telegram bot for this user
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bot/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        }),
      })

      if (response.ok) {
        toast({
          title: "Setup Complete! 🎉", 
          description: "Your enhanced expense tracker is ready! Now using database storage with instant commands.",
        })
      } else {
        toast({
          title: "Setup Complete! ⚠️",
          description: "Setup finished but bot startup had issues. Check dashboard for details.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error starting bot:', error)
      toast({
        title: "Setup Complete! ⚠️", 
        description: "Setup finished but bot startup failed. You can start it manually from dashboard.",
        variant: "destructive"
      })
    }
    
    // Clear setup progress
    localStorage.removeItem('setup-progress')
    
    // Redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  }

  const progressPercentage = (currentStep / SETUP_STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">ExpenseAI Setup</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Section */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-2xl">Setup Your Enhanced Expense Tracker</CardTitle>
                <CardDescription>
                  Simplified setup - now with database storage and instant commands (no Google Sheets needed!)
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                Step {currentStep} of {SETUP_STEPS.length}
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </CardHeader>
        </Card>

        {/* Steps Overview */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {SETUP_STEPS.map((step) => (
            <Card 
              key={step.id}
              className={`relative border-2 transition-all cursor-pointer ${
                step.id === currentStep 
                  ? 'border-blue-500 bg-blue-50/80' 
                  : completedSteps.includes(step.id)
                  ? 'border-green-500 bg-green-50/80'
                  : 'border-gray-200 bg-white/60'
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    step.id === currentStep
                      ? 'bg-blue-500 text-white'
                      : completedSteps.includes(step.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Current Step Content */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-6">
            {/* Render the appropriate functional step component */}
            {currentStep === 1 && (
              <TelegramBotStep
                botToken={botToken}
                setBotToken={setBotToken}
                botUsername={botUsername}
                setBotUsername={setBotUsername}
                onValidationComplete={(isValid) => handleStepValidation(1, isValid)}
              />
            )}

            {currentStep === 2 && (
              <GeminiKeyStep
                onNext={handleSetupComplete}
                onBack={handleBack}
              />
            )}

            {/* Google Sheets step removed - now using database storage */}

            {/* Navigation for Step 1 only (other steps have built-in navigation) */}
            {currentStep === 1 && (
              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={!completedSteps.includes(1)}
                  className="flex-1"
                >
                  {currentStep === SETUP_STEPS.length ? 'Complete Setup' : 'Next'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Status */}
        {completedSteps.length === SETUP_STEPS.length && (
          <Card className="mt-8 border-0 shadow-lg bg-green-50/80 backdrop-blur-sm border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Setup Complete! 🎉
                </h2>
                <p className="text-green-700 mb-4">
                  Your AI expense tracker is ready to use!
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={handleSetupComplete}
                    className="w-full"
                    size="lg"
                  >
                    Go to Dashboard
                  </Button>
                  <p className="text-xs text-green-600">
                    You'll be redirected automatically in a moment...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}