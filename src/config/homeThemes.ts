// Theme configuration for home page variants
export interface HomeTheme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: {
      primary: string
      secondary: string
      muted: string
    }
    border: string
    hover: string
    focus: string
    success: string
    warning: string
    error: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    xxl: string
  }
  typography: {
    fontFamily: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      xxl: string
      xxxl: string
    }
    fontWeight: {
      normal: number
      medium: number
      semibold: number
      bold: number
    }
    lineHeight: {
      tight: number
      normal: number
      relaxed: number
    }
    letterSpacing: {
      tight: string
      normal: string
      wide: string
    }
  }
  effects: {
    borderRadius: {
      sm: string
      md: string
      lg: string
      full: string
    }
    shadow: {
      sm: string
      md: string
      lg: string
      xl: string
    }
    backdropBlur: string
    transition: string
  }
  animations: {
    duration: {
      fast: string
      normal: string
      slow: string
    }
    easing: {
      ease: string
      easeIn: string
      easeOut: string
      easeInOut: string
    }
  }
}

export const defaultTheme: HomeTheme = {
  name: 'default',
  colors: {
    primary: '#3b82f6', // blue-500
    secondary: '#64748b', // slate-500
    accent: '#f59e0b', // amber-500
    background: '#0f172a', // slate-900
    surface: '#1e293b', // slate-800
    text: {
      primary: '#ffffff',
      secondary: '#cbd5e1', // slate-300
      muted: '#94a3b8', // slate-400
    },
    border: '#334155', // slate-700
    hover: '#475569', // slate-600
    focus: '#3b82f6', // blue-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
      xxxl: '2rem', // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  effects: {
    borderRadius: {
      sm: '0.125rem', // 2px
      md: '0.375rem', // 6px
      lg: '0.5rem', // 8px
      full: '9999px',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    backdropBlur: 'blur(8px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
}

export const modernTheme: HomeTheme = {
  name: 'modern',
  colors: {
    primary: '#6366f1', // indigo-500
    secondary: '#8b5cf6', // violet-500
    accent: '#06b6d4', // cyan-500
    background: '#0f172a', // slate-900
    surface: '#1e293b', // slate-800
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0', // slate-200
      muted: '#94a3b8', // slate-400
    },
    border: '#475569', // slate-600
    hover: '#64748b', // slate-500
    focus: '#6366f1', // indigo-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444', // red-500
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    xxl: '3rem', // 48px
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
      xxxl: '2rem', // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  effects: {
    borderRadius: {
      sm: '0.25rem', // 4px
      md: '0.5rem', // 8px
      lg: '0.75rem', // 12px
      full: '9999px',
    },
    shadow: {
      sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    backdropBlur: 'blur(12px)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  animations: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '400ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
}

export const minimalTheme: HomeTheme = {
  name: 'minimal',
  colors: {
    primary: '#84A98C', // sage green
    secondary: '#2F3E46', // charcoal
    accent: '#84A98C', // sage green accent
    background: '#ffffff',
    surface: '#fafbfc', // very light sage tint
    text: {
      primary: '#2F3E46', // charcoal
      secondary: '#5a6b73', // lighter charcoal
      muted: '#8a9ba4', // muted sage-gray
    },
    border: '#e8ecef', // very light sage-gray
    hover: '#f1f5f7', // light sage tint
    focus: '#84A98C', // sage green
    success: '#84A98C', // sage green
    warning: '#d97706', // amber-600
    error: '#dc2626', // red-600
  },
  spacing: {
    xs: '0.375rem', // 6px (increased by 50%)
    sm: '0.75rem', // 12px
    md: '1.5rem', // 24px
    lg: '2.25rem', // 36px
    xl: '3rem', // 48px
    xxl: '4.5rem', // 72px
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      xxl: '1.5rem', // 24px
      xxxl: '2rem', // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  effects: {
    borderRadius: {
      sm: '0.125rem', // 2px
      md: '0.25rem', // 4px
      lg: '0.375rem', // 6px
      full: '9999px',
    },
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      lg: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      xl: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    backdropBlur: 'blur(4px)',
    transition: 'all 0.15s ease-out',
  },
  animations: {
    duration: {
      fast: '100ms',
      normal: '150ms',
      slow: '300ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
}

// Theme selector function
export function getTheme(themeName: 'default' | 'modern' | 'minimal'): HomeTheme {
  switch (themeName) {
    case 'modern':
      return modernTheme
    case 'minimal':
      return minimalTheme
    default:
      return defaultTheme
  }
}

// Utility function to generate CSS custom properties from theme
export function generateThemeCSS(theme: HomeTheme): string {
  const cssVars = Object.entries(theme.colors).reduce((acc, [key, value]) => {
    if (typeof value === 'object') {
      return {
        ...acc,
        ...Object.entries(value).reduce((subAcc, [subKey, subValue]) => ({
          ...subAcc,
          [`--color-${key}-${subKey}`]: subValue,
        }), {}),
      }
    }
    return {
      ...acc,
      [`--color-${key}`]: value,
    }
  }, {})

  const spacingVars = Object.entries(theme.spacing).reduce((acc, [key, value]) => ({
    ...acc,
    [`--spacing-${key}`]: value,
  }), {})

  const typographyVars = {
    '--font-family': theme.typography.fontFamily,
    ...Object.entries(theme.typography.fontSize).reduce((acc, [key, value]) => ({
      ...acc,
      [`--font-size-${key}`]: value,
    }), {}),
    ...Object.entries(theme.typography.fontWeight).reduce((acc, [key, value]) => ({
      ...acc,
      [`--font-weight-${key}`]: value,
    }), {}),
  }

  const effectsVars = {
    ...Object.entries(theme.effects.borderRadius).reduce((acc, [key, value]) => ({
      ...acc,
      [`--border-radius-${key}`]: value,
    }), {}),
    '--backdrop-blur': theme.effects.backdropBlur,
    '--transition': theme.effects.transition,
  }

  const allVars = {
    ...cssVars,
    ...spacingVars,
    ...typographyVars,
    ...effectsVars,
  }

  return Object.entries(allVars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n')
}

// Demo-specific minimal theme with sage green and charcoal
export const demoMinimalTheme: HomeTheme = {
  name: 'demo-minimal',
  colors: {
    primary: '#84A98C', // sage green
    secondary: '#2F3E46', // charcoal
    accent: '#84A98C', // sage green accent
    background: '#ffffff',
    surface: '#fafbfc', // very light sage tint
    text: {
      primary: '#2F3E46', // charcoal
      secondary: '#5a6b73', // lighter charcoal
      muted: '#8a9ba4', // muted sage-gray
    },
    border: '#e8ecef', // very light sage-gray
    hover: '#f1f5f7', // light sage tint
    focus: '#84A98C', // sage green
    success: '#84A98C', // sage green
    warning: '#d97706', // amber-600
    error: '#dc2626', // red-600
  },
  spacing: {
    xs: '0.375rem', // 6px (increased by 50%)
    sm: '0.75rem', // 12px
    md: '1.5rem', // 24px
    lg: '2.25rem', // 36px
    xl: '3rem', // 48px
    xxl: '4.5rem', // 72px
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1.125rem', // 18px (larger base)
      lg: '1.375rem', // 22px (larger headings)
      xl: '1.625rem', // 26px
      xxl: '2rem', // 32px (larger main headings)
      xxxl: '2.75rem', // 44px (hero headings)
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.6, // more airy
      relaxed: 1.8, // more whitespace
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  },
  effects: {
    borderRadius: {
      sm: '0.375rem', // 6px (softer)
      md: '0.75rem', // 12px (softer)
      lg: '1rem', // 16px (softer)
      full: '9999px',
    },
    shadow: {
      sm: '0 2px 8px 0 rgba(47, 62, 70, 0.08)',
      md: '0 4px 16px 0 rgba(47, 62, 70, 0.12)',
      lg: '0 8px 24px 0 rgba(47, 62, 70, 0.16)',
      xl: '0 16px 32px 0 rgba(47, 62, 70, 0.20)',
    },
    backdropBlur: 'blur(4px)',
    transition: 'all 0.15s ease-out',
  },
  animations: {
    duration: {
      fast: '100ms',
      normal: '150ms',
      slow: '300ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
}

// Export all themes as an array for easy iteration
export const allThemes: HomeTheme[] = [defaultTheme, modernTheme, minimalTheme, demoMinimalTheme]
