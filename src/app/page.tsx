import { BookingForm } from '@/components/booking-form'
import { getServices } from '@/lib/supabase/services'
import { Toaster } from '@/components/ui/sonner'
import { Service } from '@/lib/types/database'
import Image from 'next/image'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto w-full">

          {/* Logo Section */}
          <div className="flex justify-center mb-8 sm:mb-12 md:mb-16">
            <Image 
              src="/express laundry.png" 
              alt="Express Laundry" 
              width={400}
              height={132}
              className="h-22 sm:h-26 md:h-29 lg:h-33 w-auto object-contain"
              priority
            />
          </div>

          {/* Booking Form Section */}
          <div className="mb-8 sm:mb-12 md:mb-16">
            <BookingForm services={services} />
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
