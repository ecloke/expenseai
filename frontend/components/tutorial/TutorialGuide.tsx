'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, X, MessageCircle, BarChart3, List, Bot, Smartphone, Upload, FolderPlus } from 'lucide-react'

interface TutorialStep {
  id: number
  title: string
  icon: React.ReactNode
  content: React.ReactNode
}

interface TutorialGuideProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function TutorialGuide({ isOpen, onClose, onComplete }: TutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "Start with Telegram",
      icon: <MessageCircle className="h-8 w-8 text-blue-400" />,
      content: (
        <div className="space-y-4 text-gray-300">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-200 mb-2">🤖 Your Personal Bot is Ready!</h4>
            <p className="text-sm">Go to your Telegram bot and type <code className="bg-gray-800 px-2 py-1 rounded text-blue-300">/start</code> to begin.</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Send Receipt Photos</p>
                <p className="text-sm">Take a photo of any receipt and send it to your bot</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">AI Processing</p>
                <p className="text-sm">The bot will automatically extract store name, date, and total amount</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Instant Saving</p>
                <p className="text-sm">Your expenses are automatically saved to the database</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              💡 <strong>Tip:</strong> You can also use commands like <code className="text-blue-300">/summary</code>, <code className="text-blue-300">/today</code>, or <code className="text-blue-300">/month</code> to get insights!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Dashboard Overview",
      icon: <BarChart3 className="h-8 w-8 text-green-400" />,
      content: (
        <div className="space-y-4 text-gray-300">
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <h4 className="font-semibold text-green-200 mb-2">📊 Your Financial Hub</h4>
            <p className="text-sm">The dashboard gives you a complete overview of your spending habits.</p>
          </div>
          
          <div className="grid gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">📈 Spending Charts</h5>
              <p className="text-sm">Visual breakdown of your expenses by category and time period</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">🏪 Top Stores</h5>
              <p className="text-sm">See where you spend the most money</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">💰 Quick Stats</h5>
              <p className="text-sm">Total spending, recent expenses, and category summaries</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              💡 <strong>Tip:</strong> The dashboard updates automatically whenever you upload new receipts via Telegram!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Transactions Management",
      icon: <List className="h-8 w-8 text-purple-400" />,
      content: (
        <div className="space-y-4 text-gray-300">
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-200 mb-2">📋 Manage All Expenses</h4>
            <p className="text-sm">View, search, edit, and organize all your transaction history.</p>
          </div>
          
          <div className="grid gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">🔍 Smart Search</h5>
              <p className="text-sm">Find expenses by store name, category, or time period</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">✏️ Edit & Delete</h5>
              <p className="text-sm">Fix any mistakes or remove unwanted transactions</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">📊 Export CSV</h5>
              <p className="text-sm">Download your data for external analysis</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              💡 <strong>Tip:</strong> Use filters to quickly find specific transactions or export data for analysis.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Project Management",
      icon: <FolderPlus className="h-8 w-8 text-orange-400" />,
      content: (
        <div className="space-y-4 text-gray-300">
          <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
            <h4 className="font-semibold text-orange-200 mb-2">📁 Organize by Projects</h4>
            <p className="text-sm">Create projects for trips, events, or any specific purpose to track expenses separately.</p>
          </div>
          
          <div className="grid gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">🆕 Create Projects</h5>
              <p className="text-sm">Use <code className="text-blue-300">/new</code> in Telegram or visit the Projects page</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">💱 Custom Currencies</h5>
              <p className="text-sm">Set different currencies for each project (THB, RM, EUR, etc.)</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">📊 Project Analytics</h5>
              <p className="text-sm">Filter dashboard and transactions by project to see detailed spending</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h5 className="font-medium text-white mb-1">🔄 Project Status</h5>
              <p className="text-sm">Open/close projects with <code className="text-blue-300">/close</code> and <code className="text-blue-300">/open</code> commands</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-400">
              💡 <strong>Ready to start?</strong> Create your first project in Telegram with <code className="text-blue-300">/new</code> or visit the Projects page!
            </p>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps.find(step => step.id === currentStep) || steps[0]
  const isLastStep = currentStep === steps.length
  const isFirstStep = currentStep === 1

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else if (onComplete) {
      onComplete()
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    if (onComplete) {
      onComplete()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              {currentStepData.title}
            </div>
            <Badge variant="secondary" className="text-xs">
              {currentStep} of {steps.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              {currentStepData.content}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Skip Tutorial
              </Button>
            </div>
            
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
              )}
              
              <Button 
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLastStep ? 'Get Started!' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}