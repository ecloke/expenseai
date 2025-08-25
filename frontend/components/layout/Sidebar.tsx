'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  LogOut,
  Bot,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  Menu,
  X
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { UserConfig, BotSession } from '@/types'
import TutorialGuide from '@/components/tutorial/TutorialGuide'

interface SidebarProps {
  userConfig?: UserConfig | null
  botSession?: BotSession | null
}

export default function Sidebar({ userConfig, botSession }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showTutorial, setShowTutorial] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleOpenTutorial = () => {
    setShowTutorial(true)
    setIsMobileMenuOpen(false) // Close mobile menu when opening tutorial
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Close mobile menu on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'Transactions',
      href: '/transactions',
      icon: Receipt,
      current: pathname === '/transactions'
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
      current: pathname === '/projects'
    },
    {
      name: 'Tutorial',
      href: '#',
      icon: HelpCircle,
      current: false,
      onClick: handleOpenTutorial
    },

  ]

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-white">ExpenseAI</h1>
          <button
            onClick={toggleMobileMenu}
            className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50" 
          onClick={closeMobileMenu}
        />
      )}

      {/* Desktop Sidebar & Mobile Slide-out Menu */}
      <div className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:static
        inset-y-0 left-0 z-30 lg:z-0
        w-64 
        flex h-full flex-col bg-gray-900 border-r border-gray-800
        transition-transform duration-300 ease-in-out
        lg:transition-none
      `}>
        {/* Logo/Brand - Hidden on mobile (shown in header instead) */}
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">ExpenseAI</h1>
        </div>

        {/* Mobile spacer for fixed header */}
        <div className="lg:hidden h-16"></div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-4 py-6">
          {navigation.map((item) => {
            const Icon = item.icon
            
            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`
                    w-full group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left
                    ${item.current
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </button>
              )
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${item.current
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bot Status */}
        {userConfig?.telegram_bot_username && (
          <div className="border-t border-gray-800 p-4">
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Bot className="h-4 w-4" />
                Bot Status
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {botSession?.is_active ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-xs text-gray-400 truncate">
                  @{userConfig.telegram_bot_username}
                </span>
              </div>
              <Badge 
                variant={botSession?.is_active ? "default" : "secondary"} 
                className={`text-xs ${botSession?.is_active ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}`}
              >
                {botSession?.is_active ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="border-t border-gray-800 p-4">
          <Button
            variant="ghost"
            onClick={() => {
              handleSignOut()
              closeMobileMenu()
            }}
            className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Tutorial Guide */}
      <TutorialGuide 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)}
      />
    </>
  )
}