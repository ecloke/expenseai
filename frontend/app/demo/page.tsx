'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TelegramBotStep from '@/components/setup/telegram-bot-step'
import GeminiKeyStep from '@/components/setup/gemini-key-step'
import GoogleSheetsStep from '@/components/setup/google-sheets-step'
import { Bot, Brain, FileSpreadsheet, Zap, Shield, MessageSquare } from 'lucide-react'

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [progress, setProgress] = useState(33)
  const [botToken, setBotToken] = useState('')
  const [botUsername, setBotUsername] = useState('')

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      setProgress((currentStep + 1) * 33.33)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setProgress((currentStep - 1) * 33.33)
    }
  }

  const handleValidationComplete = (isValid: boolean) => {
    // Demo mode - just enable next step
    console.log('Validation complete:', isValid)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">ExpenseAI Demo</span>
            </div>
            <Badge variant="secondary">Component Showcase</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Demo Info */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">🎨 Component Demo & Testing</CardTitle>
            <CardDescription>
              Interactive showcase of all expense tracker components - no backend setup required!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium">UI Components</p>
                <p className="text-sm text-gray-600">Test forms, buttons, validation</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium">Responsive Design</p>
                <p className="text-sm text-gray-600">Mobile, tablet, desktop views</p>
              </div>
              <div className="text-center">
                <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium">User Experience</p>
                <p className="text-sm text-gray-600">Complete setup wizard flow</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="wizard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wizard">Setup Wizard</TabsTrigger>
            <TabsTrigger value="components">UI Components</TabsTrigger>
            <TabsTrigger value="responsive">Responsive Test</TabsTrigger>
          </TabsList>

          {/* Setup Wizard Demo */}
          <TabsContent value="wizard" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-xl">Interactive Setup Wizard</CardTitle>
                    <CardDescription>Test the complete 3-step setup flow</CardDescription>
                  </div>
                  <Badge variant="secondary">Step {currentStep} of 3</Badge>
                </div>
                <Progress value={progress} className="h-2" />
              </CardHeader>
            </Card>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {[
                { id: 1, title: 'Telegram Bot', icon: <Bot className="h-5 w-5" />, desc: 'Bot configuration' },
                { id: 2, title: 'AI Setup', icon: <Brain className="h-5 w-5" />, desc: 'Gemini API key' },
                { id: 3, title: 'Google Sheets', icon: <FileSpreadsheet className="h-5 w-5" />, desc: 'OAuth integration' }
              ].map((step) => (
                <Card 
                  key={step.id}
                  className={`cursor-pointer transition-all ${
                    step.id === currentStep 
                      ? 'border-blue-500 bg-blue-50/80' 
                      : step.id < currentStep
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
                          : step.id < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{step.title}</CardTitle>
                        <CardDescription className="text-xs">{step.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="pt-6">
                {currentStep === 1 && (
                  <TelegramBotStep 
                    botToken={botToken}
                    setBotToken={setBotToken}
                    botUsername={botUsername}
                    setBotUsername={setBotUsername}
                    onValidationComplete={handleValidationComplete}
                  />
                )}
                {currentStep === 2 && <GeminiKeyStep onNext={handleNext} onBack={handleBack} />}
                {currentStep === 3 && <GoogleSheetsStep onNext={handleNext} onBack={handleBack} />}
                
                {/* Demo Navigation */}
                <div className="flex gap-3 pt-6 border-t mt-6">
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
                    disabled={currentStep === 3}
                    className="flex-1"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UI Components Demo */}
          <TabsContent value="components" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Buttons */}
              <Card>
                <CardHeader>
                  <CardTitle>Buttons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Button className="w-full">Primary Button</Button>
                    <Button variant="outline" className="w-full">Outline Button</Button>
                    <Button variant="secondary" className="w-full">Secondary Button</Button>
                    <Button variant="destructive" className="w-full">Destructive Button</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Form Elements */}
              <Card>
                <CardHeader>
                  <CardTitle>Form Elements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input 
                    className="w-full p-2 border rounded-md"
                    placeholder="Text input"
                  />
                  <input 
                    type="password"
                    className="w-full p-2 border rounded-md"
                    placeholder="Password input"
                  />
                  <select className="w-full p-2 border rounded-md">
                    <option>Select option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                </CardContent>
              </Card>

              {/* Badges & Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Badges & Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Error</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                  <div className="space-y-2">
                    <Progress value={25} />
                    <Progress value={50} />
                    <Progress value={75} />
                  </div>
                </CardContent>
              </Card>

              {/* Icons */}
              <Card>
                <CardHeader>
                  <CardTitle>Icons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <Bot className="h-8 w-8 mx-auto mb-1 text-blue-600" />
                      <p className="text-xs">Bot</p>
                    </div>
                    <div>
                      <Brain className="h-8 w-8 mx-auto mb-1 text-purple-600" />
                      <p className="text-xs">AI</p>
                    </div>
                    <div>
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-1 text-green-600" />
                      <p className="text-xs">Sheets</p>
                    </div>
                    <div>
                      <Shield className="h-8 w-8 mx-auto mb-1 text-gray-600" />
                      <p className="text-xs">Security</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Responsive Test */}
          <TabsContent value="responsive" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Responsive Design Test</CardTitle>
                <CardDescription>
                  Resize your browser window to test different screen sizes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <Card key={i} className="text-center">
                      <CardContent className="pt-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{i + 1}</span>
                        </div>
                        <p className="text-sm font-medium">Responsive Card {i + 1}</p>
                        <p className="text-xs text-gray-600">Adapts to screen size</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Testing Instructions */}
        <Card className="mt-8 border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-green-800">🧪 Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-green-700">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-2">What to Test:</p>
                <ul className="text-sm space-y-1">
                  <li>• Form validation (try invalid inputs)</li>
                  <li>• Button interactions and loading states</li>
                  <li>• Responsive design (resize window)</li>
                  <li>• Step navigation in wizard</li>
                  <li>• Mobile view (developer tools)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Backend Testing:</p>
                <ul className="text-sm space-y-1">
                  <li>• See QUICK-TEST.md for setup</li>
                  <li>• Run backend with minimal config</li>
                  <li>• Test API endpoints with curl</li>
                  <li>• Full integration with real services</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}