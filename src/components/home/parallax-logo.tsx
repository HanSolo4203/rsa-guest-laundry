'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type ParallaxLogoVariant = 'default' | 'modern' | 'minimal'

interface ParallaxLogoProps {
  variant?: ParallaxLogoVariant
}

export function ParallaxLogo({ variant = 'default' }: ParallaxLogoProps) {
  const logoRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')

  // Variant-specific styling for logo
  const getLogoVariantStyles = () => {
    switch (variant) {
      case 'modern':
        return {
          containerClass: "parallax-container cursor-pointer",
          imageClass: "h-20 sm:h-24 md:h-28 lg:h-32 w-auto object-contain parallax-logo-dynamic drop-shadow-lg",
          transitionClass: "transform 0.2s ease-out",
          hoverEffect: true,
          maxScale: 1.05,
          maxRotation: 15
        }
      case 'minimal':
        return {
          containerClass: "cursor-pointer",
          imageClass: "h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-300",
          transitionClass: "opacity 0.3s ease-out",
          hoverEffect: false,
          maxScale: 1,
          maxRotation: 0
        }
      default:
        return {
          containerClass: "parallax-container cursor-pointer",
          imageClass: "h-22 sm:h-26 md:h-29 lg:h-33 w-auto object-contain parallax-logo-dynamic",
          transitionClass: "transform 0.3s ease-out",
          hoverEffect: true,
          maxScale: 1.02,
          maxRotation: 20
        }
    }
  }

  const logoStyles = getLogoVariantStyles()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current || !logoStyles.hoverEffect) return

      const rect = logoRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const mouseX = e.clientX - centerX
      const mouseY = e.clientY - centerY
      
      // Calculate rotation based on mouse position relative to center
      const rotateX = (mouseY / rect.height) * -logoStyles.maxRotation // Tilt up/down
      const rotateY = (mouseX / rect.width) * logoStyles.maxRotation   // Tilt left/right
      
      // Calculate translation for depth effect
      const translateZ = Math.min(Math.abs(mouseX) + Math.abs(mouseY), 50)
      
      // Apply the transform with subtle scaling
      const scale = 1 + (translateZ / 1000) // Very subtle scaling based on distance
      setTransform(`
        perspective(1000px) 
        rotateX(${rotateX}deg) 
        rotateY(${rotateY}deg) 
        translateZ(${translateZ}px) 
        scale(${Math.min(scale, logoStyles.maxScale)})
      `)
    }

    const handleMouseLeave = () => {
      if (logoStyles.hoverEffect) {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)')
      }
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
  }, [logoStyles.hoverEffect, logoStyles.maxRotation, logoStyles.maxScale])

  return (
    <div 
      ref={logoRef}
      className={logoStyles.containerClass}
      style={{ 
        transform: logoStyles.hoverEffect ? transform : undefined,
        transition: logoStyles.transitionClass
      }}
    >
      <Image 
        src="/logo2.png" 
        alt="Express Laundry" 
        width={400}
        height={132}
        className={logoStyles.imageClass}
        priority
      />
    </div>
  )
}
