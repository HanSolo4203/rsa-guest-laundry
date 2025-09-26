import { BookingForm } from '@/components/booking-form'
import { getServices } from '@/lib/supabase/services'
import { Toaster } from '@/components/ui/sonner'
import { Service } from '@/lib/types/database'
import Image from 'next/image'
import { ParallaxLogo } from '../components/parallax-logo'

export default async function Home() {
  let services: Service[] = []
  
  try {
    services = await getServices()
  } catch (error) {
    console.error('Failed to fetch services:', error)
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-gentle"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float-reverse-gentle"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-float-slow-gentle"></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/6 right-1/6 w-48 h-48 bg-indigo-500/8 rounded-full blur-2xl animate-float-drift"></div>
        <div className="absolute bottom-1/4 left-1/6 w-72 h-72 bg-pink-500/8 rounded-full blur-3xl animate-float-drift-reverse"></div>
        
        {/* Lens Flare Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="lens-flare-container">
            <div className="lens-flare-1"></div>
            <div className="lens-flare-2"></div>
            <div className="lens-flare-3"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center py-0">
        <div className="max-w-7xl mx-auto w-full">

          {/* Logo Section */}
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-10">
            <ParallaxLogo />
          </div>

          {/* Booking Form Section */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <BookingForm services={services} />
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
