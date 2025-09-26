'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Settings,
  Menu,
  X,
  Home,
  Package,
  LogOut,
  Search,
  Bell,
  Star,
  BarChart3,
  MessageSquare
} from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Star,
    current: false,
  },
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home,
    current: false,
  },
  {
    name: 'Bookings',
    href: '/dashboard/bookings',
    icon: Calendar,
    current: false,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    current: false,
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
    current: false,
  },
  {
    name: 'Services',
    href: '/dashboard/services',
    icon: Package,
    current: false,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    current: false,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Successfully signed out')
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Error signing out')
    }
  }

  return (
    <ProtectedRoute>
      <div className="dashboard min-h-screen bg-gray-900 text-white">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 sm:w-80 bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              Laundry Admin
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="mt-4 px-4">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors relative",
                        isActive
                          ? "bg-purple-900/30 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"></div>
                      )}
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-16 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-800 border-r border-gray-700">
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-gray-700">
            <Star className="h-8 w-8 text-white" />
          </div>
          <nav className="flex flex-1 flex-col px-2 pb-4">
            <ul className="flex flex-1 flex-col gap-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-center px-3 py-3 text-sm font-medium rounded-lg transition-colors relative group",
                        isActive
                          ? "bg-purple-900/30 text-white"
                          : "text-gray-400 hover:bg-gray-700 hover:text-white"
                      )}
                      title={item.name}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"></div>
                      )}
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </li>
                )
              })}
              <li className="mt-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-3 py-3 text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-16">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-4 border-b border-gray-700 bg-gray-800 px-3 sm:px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1">
              <div className="relative w-full max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-x-2 sm:gap-x-4 lg:gap-x-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 sm:py-6 lg:py-8 bg-gray-900 min-h-screen">
          <div className="px-3 sm:px-4 lg:px-6 xl:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}
