'use client'

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
  AlertCircle
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  userConfig?: {
    telegram_bot_username: string | null
  }
  botSession?: {
    is_active: boolean
  }
}

export default function Sidebar({ userConfig, botSession }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings'
    }
  ]

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">ExpenseAI</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
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
          onClick={handleSignOut}
          className="w-full justify-start text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}