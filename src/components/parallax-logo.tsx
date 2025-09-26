'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export function ParallaxLogo() {
  const logoRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current) return

      const rect = logoRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const mouseX = e.clientX - centerX
      const mouseY = e.clientY - centerY
      
      // Calculate rotation based on mouse position relative to center
      const rotateX = (mouseY / rect.height) * -20 // Tilt up/down
      const rotateY = (mouseX / rect.width) * 20   // Tilt left/right
      
      // Calculate translation for depth effect
      const translateZ = Math.min(Math.abs(mouseX) + Math.abs(mouseY), 50)
      
      // Apply the transform with subtle scaling
      const scale = 1 + (translateZ / 1000) // Very subtle scaling based on distance
      setTransform(`
        perspective(1000px) 
        rotateX(${rotateX}deg) 
        rotateY(${rotateY}deg) 
        translateZ(${translateZ}px) 
        scale(${Math.min(scale, 1.02)})
      `)
    }

    const handleMouseLeave = () => {
      setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)')
    }

    const logoElement = logoRef.current
    if (logoElement) {
      logoElement.addEventListener('mousemove', handleMouseMove)
      logoElement.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (logoElement) {
        logoElement.removeEventListener('mousemove', handleMouseMove)
        logoElement.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  return (
    <div 
      ref={logoRef}
      className="parallax-container cursor-pointer"
      style={{ 
        transform,
        transition: 'transform 0.3s ease-out'
      }}
    >
      <Image 
        src="/express laundry.png" 
        alt="Express Laundry" 
        width={400}
        height={132}
        className="h-22 sm:h-26 md:h-29 lg:h-33 w-auto object-contain parallax-logo-dynamic"
        priority
      />
    </div>
  )
}
