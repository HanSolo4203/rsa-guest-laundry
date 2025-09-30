'use client'

import { useEffect } from 'react'
import { generateThemeCSS, type HomeTheme } from '@/config/homeThemes'

interface ThemeProviderProps {
  theme: HomeTheme
  children: React.ReactNode
  className?: string
}

export function ThemeProvider({ theme, children, className = '' }: ThemeProviderProps) {
  useEffect(() => {
    // Generate CSS custom properties from theme
    const cssVars = generateThemeCSS(theme)
    
    // Apply to document root
    const style = document.createElement('style')
    style.textContent = `
      :root {
        ${cssVars}
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [theme])

  return (
    <div 
      className={`theme-${theme.name} ${className}`}
      style={{
        '--theme-name': theme.name,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// Hook to get current theme styles
export function useThemeStyles(theme: HomeTheme) {
  return {
    // Color utilities
    colors: {
      primary: `var(--color-primary)`,
      secondary: `var(--color-secondary)`,
      accent: `var(--color-accent)`,
      background: `var(--color-background)`,
      surface: `var(--color-surface)`,
      text: {
        primary: `var(--color-text-primary)`,
        secondary: `var(--color-text-secondary)`,
        muted: `var(--color-text-muted)`,
      },
      border: `var(--color-border)`,
      hover: `var(--color-hover)`,
      focus: `var(--color-focus)`,
      success: `var(--color-success)`,
      warning: `var(--color-warning)`,
      error: `var(--color-error)`,
    },
    // Spacing utilities
    spacing: {
      xs: `var(--spacing-xs)`,
      sm: `var(--spacing-sm)`,
      md: `var(--spacing-md)`,
      lg: `var(--spacing-lg)`,
      xl: `var(--spacing-xl)`,
      xxl: `var(--spacing-xxl)`,
    },
    // Typography utilities
    typography: {
      fontFamily: `var(--font-family)`,
      fontSize: {
        xs: `var(--font-size-xs)`,
        sm: `var(--font-size-sm)`,
        base: `var(--font-size-base)`,
        lg: `var(--font-size-lg)`,
        xl: `var(--font-size-xl)`,
        xxl: `var(--font-size-xxl)`,
        xxxl: `var(--font-size-xxxl)`,
      },
      fontWeight: {
        normal: `var(--font-weight-normal)`,
        medium: `var(--font-weight-medium)`,
        semibold: `var(--font-weight-semibold)`,
        bold: `var(--font-weight-bold)`,
      },
    },
    // Effects utilities
    effects: {
      borderRadius: {
        sm: `var(--border-radius-sm)`,
        md: `var(--border-radius-md)`,
        lg: `var(--border-radius-lg)`,
        full: `var(--border-radius-full)`,
      },
      backdropBlur: `var(--backdrop-blur)`,
      transition: `var(--transition)`,
    },
  }
}
