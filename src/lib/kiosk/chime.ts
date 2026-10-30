type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

let audioContext: AudioContext | null = null
let lastPlayedAt = 0
let lastBeepAt = 0

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioContext) return audioContext
  const Ctx = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!Ctx) return null
  audioContext = new Ctx()
  return audioContext
}

function ring(ctx: AudioContext) {
  const start = ctx.currentTime
  const notes = [
    { frequency: 784, offset: 0 },
    { frequency: 1046.5, offset: 0.13 },
  ]

  for (const note of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const at = start + note.offset
    osc.type = 'sine'
    osc.frequency.setValueAtTime(note.frequency, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.34)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }
}

export function unlockKioskChime() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
}

export function playKioskChime() {
  const now = Date.now()
  if (now - lastPlayedAt < 500) return
  lastPlayedAt = now

  const ctx = getAudioContext()
  if (!ctx) return

  const start = () => {
    try {
      ring(ctx)
    } catch {
      lastPlayedAt = 0
    }
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(() => {
      lastPlayedAt = 0
    })
    return
  }

  start()
}

function blip(ctx: AudioContext) {
  const start = ctx.currentTime
  for (const offset of [0, 0.2]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const at = start + offset
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.16)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  }
}

export function playKioskBeep() {
  const now = Date.now()
  if (now - lastBeepAt < 400) return
  lastBeepAt = now

  const ctx = getAudioContext()
  if (!ctx) return

  const start = () => {
    try {
      blip(ctx)
    } catch {
      lastBeepAt = 0
    }
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().then(start).catch(() => {
      lastBeepAt = 0
    })
    return
  }

  start()
}
