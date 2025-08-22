import Link from 'next/link'
import { Receipt } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">ExpenseAI</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/setup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automate Your Expense Tracking with
            <span className="text-blue-600 block">AI-Powered Telegram Bots</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Simply photograph your receipts and chat with your personal bot. 
            AI extracts data, updates Google Sheets, and answers expense questions naturally.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/setup" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700">
              Create Your Bot
            </Link>
            <Link href="/demo" className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg text-lg hover:bg-gray-300">
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-white/80 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-bold mb-2">Snap & Send</h3>
            <p className="text-gray-600">Take a photo of any receipt and send it to your personal Telegram bot</p>
          </div>
          <div className="bg-white/80 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI Processing</h3>
            <p className="text-gray-600">Gemini Vision AI extracts store, items, prices, and categories automatically</p>
          </div>
          <div className="bg-white/80 p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Auto-Update</h3>
            <p className="text-gray-600">Data populates your Google Sheet instantly with perfect formatting</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Automate Your Expenses?</h2>
          <p className="text-xl mb-8 text-blue-100">Set up your AI expense tracker in under 10 minutes</p>
          <Link href="/setup" className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-bold hover:bg-gray-100">
            Start Free Setup
          </Link>
        </div>
      </section>
    </div>
  )
}