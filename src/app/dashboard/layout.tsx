'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Settings,
  Menu,
  X,
  Home,
  Package,
  LogOut,
  BarChart3,
  MessageSquare
} from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuth } from '@/contexts/auth-context'
import { SearchProvider } from '@/contexts/search-context'
import { toast } from 'sonner'

const navigation = [
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
  const { signOut } = useAuth()

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
      <SearchProvider>
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
          <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-20 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-800 border-r border-gray-700">
              <div className="flex h-16 shrink-0 items-center justify-center border-b border-gray-700">
                <Home className="h-8 w-8 text-white" />
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
          <div className="lg:pl-32 xl:pl-36">
            {/* Mobile menu button - only visible on mobile */}
            <div className="lg:hidden sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-gray-700 bg-gray-800 px-3 sm:px-4 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-700 mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* Page content */}
            <main className="py-4 sm:py-6 lg:py-8 bg-gray-900 min-h-screen">
              <div className="px-4 sm:px-6 lg:px-8 xl:px-12">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SearchProvider>
    </ProtectedRoute>
  )
}
