import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import QueryProvider from '@/components/providers/QueryProvider'
import ErrorBoundary from '@/components/error/ErrorBoundary'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
// Temporarily commented out performance monitoring to debug
// import { initPerformanceMonitoring } from '@/lib/performance'

// Initialize performance monitoring on app start
// if (typeof window !== 'undefined') {
//   initPerformanceMonitoring()
// }

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Expense Tracker - AI-Powered Receipt Processing',
  description: 'Automate expense tracking with Telegram bots and AI-powered receipt processing',
  keywords: ['expense tracker', 'telegram bot', 'AI', 'receipt processing', 'automation'],
  authors: [{ name: 'Expense Tracker Team' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="dark" storageKey="expense-tracker-theme">
          <ErrorBoundary>
            {/* <QueryProvider> */}
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {children}
              </div>
              <Toaster />
            {/* </QueryProvider> */}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}