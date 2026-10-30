const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function linearize(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function parseHex(value: string): [number, number, number] | null {
  const match = HEX.exec(value.trim())
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((channel) => channel + channel)
      .join('')
  }
  if (hex.length === 8) hex = hex.slice(0, 6)
  const color = Number.parseInt(hex, 16)
  return [(color >> 16) & 255, (color >> 8) & 255, color & 255]
}

export function hexForColorInput(value: string, fallback = '#000000'): string {
  const channels = parseHex(value) ?? parseHex(fallback)
  if (!channels) return '#000000'
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function luminance(value: string): number | null {
  const channels = parseHex(value)
  if (!channels) return null
  const [red, green, blue] = channels
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue)
}

export function contrastRatio(foreground: string, background: string): number | null {
  const foregroundLuminance = luminance(foreground)
  const backgroundLuminance = luminance(background)
  if (foregroundLuminance == null || backgroundLuminance == null) return null
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

const READABLE_CONTRAST = 4.5

export function buttonContrastWarning(buttonText: string, primary: string): string | null {
  const ratio = contrastRatio(buttonText, primary)
  if (ratio == null || ratio >= READABLE_CONTRAST) return null
  return `Button text is hard to read on the primary colour (${ratio.toFixed(1)}:1). Aim for at least ${READABLE_CONTRAST}:1.`
}

export function readableTextColor(background: string): string {
  const onWhite = contrastRatio('#ffffff', background)
  const onInk = contrastRatio('#111827', background)
  if (onWhite == null || onInk == null) return '#ffffff'
  return onWhite >= onInk ? '#ffffff' : '#111827'
}
