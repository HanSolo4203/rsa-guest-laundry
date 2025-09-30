'use client'

import { useEffect, useRef } from 'react'

interface VideoBackgroundProps {
  videoId: string
  className?: string
}

export function VideoBackground({ videoId, className = '' }: VideoBackgroundProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Ensure the iframe is properly loaded
    if (iframeRef.current) {
      iframeRef.current.style.pointerEvents = 'none'
    }
  }, [])

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1&start=0&end=55`}
        title="Background Video"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        className="w-full h-full object-cover"
        style={{
          pointerEvents: 'none',
          border: 'none',
          outline: 'none',
          transform: 'scale(1.5)',
          transformOrigin: 'center center'
        }}
      />
      {/* Overlay to ensure content is clickable and improve readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />
    </div>
  )
}
