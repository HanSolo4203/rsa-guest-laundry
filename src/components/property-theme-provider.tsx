import { DM_Serif_Display, Inter, Playfair_Display, Poppins, Space_Grotesk } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' })
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' })

const brandFonts = {
  inter,
  playfair,
  poppins,
  'dm-serif': dmSerif,
  'space-grotesk': spaceGrotesk,
} as const

export type BrandFont = keyof typeof brandFonts

const fallbackColors = {
  primary: '#2B5F44',
  accent: '#84A98C',
  background: '#FFFFFF',
  text: '#2F2F2F',
  buttonText: '#FFFFFF',
}

function brandColor(value: string | null, fallback: string): string {
  if (!value) return fallback
  const trimmed = value.trim()
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed
  }
  return fallback
}

function brandFont(value: string) {
  if (value in brandFonts) return brandFonts[value as BrandFont]
  return brandFonts.inter
}

interface PropertyThemeProviderProps {
  font: string
  primaryColor: string | null
  accentColor: string | null
  backgroundColor: string | null
  textColor: string | null
  buttonTextColor: string | null
  children: ReactNode
}

export function PropertyThemeProvider({
  font,
  primaryColor,
  accentColor,
  backgroundColor,
  textColor,
  buttonTextColor,
  children,
}: PropertyThemeProviderProps) {
  const style = {
    '--brand-primary': brandColor(primaryColor, fallbackColors.primary),
    '--brand-accent': brandColor(accentColor, fallbackColors.accent),
    '--brand-bg': brandColor(backgroundColor, fallbackColors.background),
    '--brand-text': brandColor(textColor, fallbackColors.text),
    '--brand-button-text': brandColor(buttonTextColor, fallbackColors.buttonText),
  } as CSSProperties

  return (
    <div className={`${brandFont(font).className} min-h-dvh`} style={style}>
      {children}
    </div>
  )
}
