let audioContext = null

function getContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

function tone(ctx, { frequency, start, duration, volume = 0.12, type = 'sine' }) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + duration + 0.05)
}

/** Short two-note ping for a new chat message. */
export function playMessagePing() {
  try {
    const ctx = getContext()
    if (!ctx) return
    tone(ctx, { frequency: 880, start: 0, duration: 0.12, volume: 0.06 })
    tone(ctx, { frequency: 1320, start: 0.1, duration: 0.16, volume: 0.05 })
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}

/** Soft three-note alarm chime. */
export function playAlarmChime() {
  try {
    const ctx = getContext()
    if (!ctx) return
    tone(ctx, { frequency: 784, start: 0, duration: 0.25, type: 'triangle' })
    tone(ctx, { frequency: 988, start: 0.22, duration: 0.25, type: 'triangle' })
    tone(ctx, { frequency: 1175, start: 0.44, duration: 0.4, type: 'triangle' })
  } catch {
    // Browsers may block audio until the user interacts with the page.
  }
}
