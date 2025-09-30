'use client'

import '@/styles/home-demo.css'
import { BookingForm } from '@/components/home/booking-form'
import { BookingsSidebar } from '@/components/home/bookings-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { ParallaxLogo } from '@/components/home/parallax-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Menu, X, Star, CheckCircle, ArrowRight, Quote, Sparkles, MapPin } from 'lucide-react'
import { useHomePage, type HomeVariant } from '@/hooks/useHomePage'
import { DevTools } from '@/components/DevTools'
import { tradeHotelBrand } from '@/config/clientBrand'

export default function DemoPage() {
  const {
    services,
    loadingServices,
    sidebarVisible,
    setSidebarVisible,
    variant,
    setVariant,
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

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center">
          {/* Hero Content */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
            <div className="mb-12">
              <div className="relative">
                <ParallaxLogo variant="modern" />
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="h-6 w-6 text-gold-accent animate-pulse" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-charcoal mb-8 leading-tight">
              Welcome to{' '}
              <span className="text-primary-green">{tradeHotelBrand.companyName}</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-text-light mb-8 max-w-3xl mx-auto leading-relaxed">
              {tradeHotelBrand.tagline}
            </p>
            
            <div className="flex items-center justify-center gap-2 text-text-light mb-12">
              <MapPin className="h-5 w-5 text-coral-pink" />
              <span className="text-lg">Cape Town CBD</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-primary-green hover:bg-primary-green-hover text-white px-12 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Book Laundry Service
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-coral-pink/30 text-coral-pink hover:bg-coral-pink/5 px-12 py-4 text-lg rounded-2xl transition-all duration-300"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 bg-background-alt">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6">
                Our Laundry Services
              </h2>
              <p className="text-xl text-text-light max-w-2xl mx-auto leading-relaxed">
                Who doesn&apos;t love a deal? Professional care for all your laundry needs with our quirky luxury approach
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card 
                  key={service.id} 
                  className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border-0 shadow-md rounded-3xl overflow-hidden bg-white"
                >
                  <CardContent className="p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-green/20 transition-colors duration-300">
                        <CheckCircle className="h-8 w-8 text-primary-green" />
                      </div>
                      <h3 className="text-2xl font-semibold text-charcoal mb-4">
                        {service.name}
                      </h3>
                      <p className="text-text-light mb-6 leading-relaxed">
                        Professional {service.name.toLowerCase()} service with eco-friendly detergents and premium care.
                      </p>
                      <div className="text-3xl font-bold text-primary-green mb-4">
                        R{service.price}
                      </div>
                      <Badge variant="outline" className="border-coral-pink/30 text-coral-pink bg-coral-pink/5">
                        🔥 Trade Hotel Special
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6">
                Why Choose The Trade Hotel
              </h2>
              <p className="text-xl text-text-light max-w-2xl mx-auto leading-relaxed">
                Quirky luxury meets modern convenience in the heart of Cape Town CBD
              </p>
            </div>
            
            <div className="space-y-24">
              {/* Feature 1 */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                  <div className="bg-gradient-to-br from-primary-green/10 to-primary-green/5 rounded-3xl p-12">
                    <h3 className="text-3xl font-bold text-charcoal mb-6">
                      Eco-Friendly Process
                    </h3>
                    <p className="text-lg text-text-light mb-8 leading-relaxed">
                      We use biodegradable detergents and energy-efficient machines to care for your clothes 
                      while protecting the environment.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Biodegradable detergents
                      </li>
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Energy-efficient machines
                      </li>
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Water conservation
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="order-1 lg:order-2">
                  <div className="bg-gradient-to-br from-charcoal/5 to-charcoal/10 rounded-3xl h-80 flex items-center justify-center">
                    <div className="text-6xl">🌱</div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="bg-gradient-to-br from-charcoal/5 to-charcoal/10 rounded-3xl h-80 flex items-center justify-center">
                    <div className="text-6xl">⚡</div>
                  </div>
                </div>
                <div>
                  <div className="bg-gradient-to-br from-coral-pink/10 to-coral-pink/5 rounded-3xl p-12">
                    <h3 className="text-3xl font-bold text-charcoal mb-6">
                      Quick Turnaround
                    </h3>
                    <p className="text-lg text-text-light mb-8 leading-relaxed">
                      Get your laundry back fresh and clean with our efficient 24-48 hour turnaround time, 
                      perfect for busy professionals.
                    </p>
                    <ul className="space-y-4">
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-coral-pink mr-3" />
                        24-48 hour service
                      </li>
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-coral-pink mr-3" />
                        Express options available
                      </li>
                      <li className="flex items-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-coral-pink mr-3" />
                        Real-time tracking
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-background-alt">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6">
                Simple Pricing
              </h2>
              <p className="text-xl text-text-light max-w-2xl mx-auto leading-relaxed">
                Transparent pricing with no hidden fees - who doesn&apos;t love a deal?
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card 
                  key={service.id}
                  className={`relative transition-all duration-500 hover:shadow-xl hover:-translate-y-2 border-0 shadow-md rounded-3xl overflow-hidden ${
                    index === 1 ? 'ring-2 ring-primary-green/30 scale-105 bg-gradient-to-br from-primary-green/5 to-white' : 'bg-white'
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary-green text-white px-6 py-2 rounded-full">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-charcoal mb-4">
                      {service.name}
                    </h3>
                    <div className="text-5xl font-bold text-primary-green mb-6">
                      R{service.price}
                    </div>
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center justify-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Professional cleaning
                      </li>
                      <li className="flex items-center justify-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Eco-friendly process
                      </li>
                      <li className="flex items-center justify-center text-text-light">
                        <CheckCircle className="h-5 w-5 text-primary-green mr-3" />
                        Quality guarantee
                      </li>
                    </ul>
                    <Button 
                      className={`w-full py-4 text-lg rounded-2xl transition-all duration-300 ${
                        index === 1 
                          ? 'bg-primary-green hover:bg-primary-green-hover text-white' 
                          : 'bg-coral-pink/10 hover:bg-coral-pink/20 text-coral-pink border border-coral-pink/30'
                      }`}
                    >
                      Choose Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6">
                What Our Guests Say
              </h2>
              <p className="text-xl text-text-light max-w-2xl mx-auto leading-relaxed">
                Trusted by thousands of satisfied guests at The Trade Hotel
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-md rounded-3xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="flex text-gold-accent">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-5 w-5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <Quote className="h-8 w-8 text-coral-pink/30 mb-4" />
                    <p className="text-text-light mb-6 leading-relaxed italic">
                      &quot;Exceptional service! My clothes have never looked better. The quirky luxury approach 
                      makes me feel good about using their service.&quot;
                    </p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary-green/10 rounded-full flex items-center justify-center mr-4">
                        <div className="text-primary-green font-semibold">J</div>
                      </div>
                      <div>
                        <div className="font-semibold text-charcoal">Jane Smith</div>
                        <div className="text-text-light">Trade Hotel Guest</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Form Section */}
        <section className="py-24 bg-background-alt">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-text-light max-w-2xl mx-auto leading-relaxed">
                Book your laundry service today and experience The Trade Hotel difference
              </p>
            </div>
            
            <div className="form-container">
              {loadingServices ? (
                <div className="text-center text-text-light py-12">Loading our amazing services...</div>
              ) : (
                <BookingForm services={services} variant="minimal" />
              )}
            </div>
          </div>
        </section>

        {/* Sidebar Toggle Button */}
        <Button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          variant="ghost"
          size="sm"
          className={`fixed top-6 right-6 z-50 bg-white/90 backdrop-blur-sm border border-primary-green/20 text-charcoal hover:bg-primary-green/5 transition-all duration-300 ease-in-out rounded-2xl shadow-md`}
        >
          {sidebarVisible ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Variant Selector */}
        <div className="fixed top-6 left-6 z-50">
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as HomeVariant)}
            className="bg-white/90 backdrop-blur-sm border border-primary-green/20 text-charcoal rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-green/50 shadow-md"
          >
            <option value="default">Default</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        {/* Mobile Overlay */}
        {sidebarVisible && (
          <div 
            className="fixed inset-0 bg-charcoal/20 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-300"
            onClick={() => setSidebarVisible(false)}
          />
        )}

        {/* Bookings Sidebar */}
        <BookingsSidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(false)} variant="minimal" />

        <Toaster />
        
        {/* Development Tools */}
        <DevTools />
      </div>
  )
}