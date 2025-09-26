'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Mail, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      const { error } = await signIn(data.email, data.password)
      
      if (error) {
        toast.error(error.message || 'Failed to sign in')
        console.error('Login error:', error)
      } else {
        toast.success('Successfully signed in!')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Unexpected error during login:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Dark Blue Background with Centered Login */}
      <div className="w-full lg:w-1/2 bg-black flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo/Branding */}
          <div className="mb-8">
            <div className="w-32 h-8 bg-white/10 rounded flex items-center justify-center">
              <span className="text-white font-semibold text-sm">LAUNDRY PRO</span>
            </div>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white mb-8">Sign In</h1>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* User Name Field */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  User Name
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
                  <input
                    type="email"
                    placeholder="Enter User Name"
                    className="w-full bg-transparent border border-white/20 rounded-md px-3 pl-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    {...form.register('email')}
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
                  <input
                    type="password"
                    placeholder="Enter Password"
                    className="w-full bg-transparent border border-white/20 rounded-md px-3 pl-10 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    {...form.register('password')}
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <a href="#" className="text-white text-sm hover:text-blue-400 transition-colors">
                  FORGOT PASSWORD?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-white text-sm">
                Don&apos;t have an account?{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Promotional Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
              {Array.from({ length: 400 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-white/10"
                  style={{
                    gridColumn: `${(i % 20) + 1}`,
                    gridRow: `${Math.floor(i / 20) + 1}`,
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Abstract Shapes */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-gradient-to-tr from-green-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
          
          {/* Flowing Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 800 600">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d="M0,300 Q200,100 400,300 T800,300"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M0,400 Q300,200 600,400 T800,400"
              stroke="url(#lineGradient)"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M100,500 Q400,300 700,500"
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white mb-4 leading-relaxed">
              A new way to experience real estate in the infinite virtual space.
            </h2>
            <button className="text-white text-lg font-medium hover:text-blue-400 transition-colors">
              LEARN MORE
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-8 right-8 flex items-center space-x-4">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-1 bg-white/30 rounded-full">
              <div className="w-2 h-1 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* Navigation Arrows */}
          <div className="flex items-center space-x-2">
            <button className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
