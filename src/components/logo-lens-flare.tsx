'use client'

import { useEffect, useState } from 'react'

export function LogoLensFlare() {
  const [showFlare, setShowFlare] = useState(false)

  useEffect(() => {
    // Trigger lens flare on page load/refresh
    setShowFlare(true)
    
    // Hide flare after animation completes
    const timer = setTimeout(() => {
      setShowFlare(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  if (!showFlare) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <div className="sparkle-flare-container">
        <div className="sparkle-1"></div>
        <div className="sparkle-2"></div>
        <div className="sparkle-3"></div>
        <div className="sparkle-4"></div>
        <div className="sparkle-5"></div>
        <div className="sparkle-trail"></div>
      </div>
    </div>
  )
}
