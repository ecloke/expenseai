'use client'

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, Brain, FileSpreadsheet, CheckCircle } from 'lucide-react'

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

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
    {
      id: 3,
      title: 'Google Sheets',
      description: 'Connect your Google account for data storage',
      icon: <FileSpreadsheet className="h-6 w-6" />,
    },
  ]

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }
    if (currentStep < SETUP_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
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
                <CardTitle className="text-2xl">Setup Your Expense Tracker</CardTitle>
                <CardDescription>
                  Follow these steps to automate your expense tracking
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
        <div className="grid md:grid-cols-3 gap-4 mb-8">
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
          <CardHeader className="border-b">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 text-white rounded-lg">
                {SETUP_STEPS[currentStep - 1]?.icon}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {SETUP_STEPS[currentStep - 1]?.title}
                </CardTitle>
                <CardDescription>
                  {SETUP_STEPS[currentStep - 1]?.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Step Content */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🤖 Create Your Telegram Bot</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>1.</strong> Open Telegram and search for @BotFather</p>
                    <p><strong>2.</strong> Send the command: <code className="bg-gray-100 px-2 py-1 rounded">/newbot</code></p>
                    <p><strong>3.</strong> Follow the prompts to choose a name and username</p>
                    <p><strong>4.</strong> Copy the bot token you receive</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bot Token</label>
                    <Input 
                      type="password" 
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" 
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🧠 Configure Gemini AI</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>1.</strong> Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a></p>
                    <p><strong>2.</strong> Create an API key</p>
                    <p><strong>3.</strong> Copy your API key (starts with "AI")</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gemini API Key</label>
                    <Input 
                      type="password" 
                      placeholder="AIza..." 
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">📊 Connect Google Sheets</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>We'll connect your Google account to automatically create and update your expense tracking sheet.</p>
                  </div>
                  <Button className="w-full" size="lg">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect with Google
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleNext}
                className="flex-1"
              >
                {currentStep === SETUP_STEPS.length ? 'Complete Setup' : 'Next'}
              </Button>
            </div>
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
                <Button className="mr-4">Go to Dashboard</Button>
                <Button variant="outline">Test Your Bot</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}