'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Monitor, Eye, Home, Zap } from 'lucide-react'

interface PageToggleProps {
  className?: string
}

export function PageToggle({ className = '' }: PageToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(false)
  const [currentPage, setCurrentPage] = useState<'original' | 'demo'>('original')

  // Check if we're in development mode
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    setIsVisible(isDevelopment)
  }, [])

  // Determine current page based on pathname
  useEffect(() => {
    if (pathname === '/demo' || pathname === '/client-preview' || pathname === '/home-demo') {
      setCurrentPage('demo')
    } else {
      setCurrentPage('original')
    }
  }, [pathname])

  const togglePage = () => {
    if (currentPage === 'original') {
      router.push('/demo')
    } else {
      router.push('/')
    }
  }

  // Don't render if not in development mode
  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] ${className}`}>
      <Button
        onClick={togglePage}
        variant="outline"
        size="sm"
        className={`
          group relative overflow-hidden
          bg-slate-900/90 backdrop-blur-sm border border-white/20
          hover:bg-slate-800/90 hover:border-white/30
          text-white shadow-lg hover:shadow-xl
          transition-all duration-300 ease-out
          ${currentPage === 'demo' 
            ? 'ring-2 ring-pink-500/50 shadow-pink-500/20' 
            : 'ring-2 ring-blue-500/50 shadow-blue-500/20'
          }
        `}
        title={`Switch to ${currentPage === 'original' ? 'Demo' : 'Original'} Page`}
      >
        {/* Background gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="relative flex items-center gap-2">
          {/* Icon */}
          <div className="flex items-center justify-center">
            {currentPage === 'original' ? (
              <Eye className="h-4 w-4 text-pink-400" />
            ) : (
              <Home className="h-4 w-4 text-blue-400" />
            )}
          </div>
          
          {/* Label */}
          <span className="text-xs font-medium hidden sm:inline">
            {currentPage === 'original' ? 'View Demo' : 'View Original'}
          </span>
          
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            currentPage === 'demo' ? 'bg-pink-400' : 'bg-blue-400'
          }`} />
        </div>
        
        {/* Hover tooltip */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {currentPage === 'original' ? 'Switch to Demo Version' : 'Switch to Original Version'}
          </div>
        </div>
      </Button>
    </div>
  )
}

// Development mode indicator component
export function DevModeIndicator() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    setIsVisible(isDevelopment)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed top-16 right-4 z-[9999]">
      <div className="flex items-center gap-2 bg-yellow-500/90 backdrop-blur-sm text-yellow-900 px-3 py-1 rounded-full text-xs font-medium shadow-lg border border-yellow-400/30">
        <Zap className="h-3 w-3" />
        <span>DEV MODE</span>
      </div>
    </div>
  )
}

// Quick navigation component for development
export function DevQuickNav() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    setIsVisible(isDevelopment)
  }, [])

  if (!isVisible) {
    return null
  }

  const routes = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/demo', label: 'Demo', icon: Monitor },
    { path: '/client-preview', label: 'Preview', icon: Eye },
    { path: '/dashboard', label: 'Dashboard', icon: Zap },
  ]

  return (
    <div className="fixed top-28 right-4 z-[9998] hidden lg:block">
      <div className="bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-lg p-2 shadow-lg">
        <div className="text-xs text-white/60 mb-2 px-2">Quick Nav</div>
        <div className="space-y-1">
          {routes.map((route) => {
            const Icon = route.icon
            const isActive = pathname === route.path
            return (
              <button
                key={route.path}
                onClick={() => router.push(route.path)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1 rounded text-xs
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-600/50 text-blue-200' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Icon className="h-3 w-3" />
                {route.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
