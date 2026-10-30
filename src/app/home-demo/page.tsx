'use client'

import '@/styles/home-demo.css'
import { BookingsSidebar } from '@/components/home/bookings-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { ParallaxLogo } from '@/components/home/parallax-logo'
import { Button } from '@/components/ui/button'
import { Menu, X, Sparkles, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useHomePage } from '@/hooks/useHomePage'

export default function HomeDemo() {
  const {
    sidebarVisible,
    setSidebarVisible,
  } = useHomePage()

  return (
    <div className="home-demo-variant min-h-screen relative overflow-hidden">
      {/* Trade Hotel Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-float-gentle"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl animate-float-reverse-gentle"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full blur-3xl animate-float-slow-gentle"></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/6 right-1/6 w-48 h-48 rounded-full blur-2xl animate-float-drift"></div>
        <div className="absolute bottom-1/4 left-1/6 w-72 h-72 rounded-full blur-3xl animate-float-drift-reverse"></div>
        
        {/* Lens Flare Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="lens-flare-container">
            <div className="lens-flare-1"></div>
            <div className="lens-flare-2"></div>
            <div className="lens-flare-3"></div>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <Button
        onClick={() => setSidebarVisible(!sidebarVisible)}
        variant="ghost"
        size="sm"
        className={`fixed top-4 z-50 bg-slate-800/80 backdrop-blur-sm border border-white/10 text-white hover:bg-slate-700/80 transition-all duration-300 ease-in-out ${
          sidebarVisible ? 'right-4' : 'right-4'
        }`}
      >
        {sidebarVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen flex flex-col justify-center py-12 w-full px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out ${
        sidebarVisible 
          ? 'transform translate-x-0 sm:translate-x-[12rem] md:translate-x-[13.5rem] lg:translate-x-[15rem]' 
          : 'transform translate-x-0'
      }`}>
        <div className="mx-auto w-full max-w-4xl">

          {/* Hero Section */}
          <div className="hero-section text-center mb-12 sm:mb-16 md:mb-20">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <ParallaxLogo variant="modern" />
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-6 w-6 text-gold-accent animate-pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-charcoal">
              Welcome to{' '}
              <span className="text-primary-green">The Trade Hotel</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-text-light mb-4 max-w-2xl mx-auto">
              A Boutique Hotel In Cape Town CBD
            </p>
            
            <div className="flex items-center justify-center gap-2 text-text-light">
              <MapPin className="h-5 w-5 text-coral-pink" />
              <span className="text-lg">Cape Town CBD</span>
            </div>
          </div>

          {/* Booking Form Section */}
          <div className="mb-8 sm:mb-12 md:mb-16">
              <div className="form-container text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2">
                  Book Your Laundry Service
                </h2>
                <p className="text-text-light mb-6">
                  Guest booking now lives on the property page.
                </p>
                <Link
                  href="/trade"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2B5F44] px-6 text-base font-medium text-white"
                >
                  Open the Trade booking page
                </Link>
              </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden transition-all duration-500 ease-in-out"
          onClick={() => setSidebarVisible(false)}
        />
      )}

      {/* Bookings Sidebar - Using 'modern' variant */}
      <BookingsSidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(false)} variant="modern" />

      <Toaster />
    </div>
  )
}
