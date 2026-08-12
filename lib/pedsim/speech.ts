// PedSim — browser speech layer (voice out + optional voice in).
// Uses the built-in Web Speech API so the prototype speaks with zero keys and
// zero cost (ARCHITECTURE.md §2.6 lists edge-tts / Inworld as the production
// upgrade). Stage directions in *asterisks* and speaker prefixes are stripped
// before speaking.

export type VoiceRole = "child" | "parent"

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

// Remove *stage directions* and "Mom:"-style prefixes so the TTS reads only
// the spoken words.
export function stripForSpeech(text: string): string {
  return text
    .replace(/\*[^*]*\*/g, " ")
    .replace(/^\s*(mom|dad|mother|father|parent)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechSupported()) return resolve([])
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) {
      cachedVoices = existing
      return resolve(existing)
    }
    const handler = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      window.speechSynthesis.removeEventListener("voiceschanged", handler)
      resolve(cachedVoices)
    }
    window.speechSynthesis.addEventListener("voiceschanged", handler)
    // Fallback in case the event never fires.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500)
  })
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  role: VoiceRole,
): SpeechSynthesisVoice | undefined {
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang))
  const pool = en.length ? en : voices
  if (role === "child") {
    // Prefer a lighter/female-sounding voice; pitch is raised at speak time.
    const preferred = pool.find((v) =>
      /(zira|female|samantha|karen|tessa|child|kid|google us english)/i.test(
        v.name,
      ),
    )
    return preferred ?? pool[0]
  }
  // Parent: prefer a warmer adult voice.
  const preferred = pool.find((v) =>
    /(aria|jenny|susan|female|samantha)/i.test(v.name),
  )
  return preferred ?? pool[0]
}

export interface SpeakHandle {
  cancel: () => void
}

export interface SpeakOpts {
  onStart?: () => void
  onEnd?: () => void
  enabled?: boolean
  pitch?: number
  rate?: number
  voiceName?: string
  hdVoice?: string // explicit edge-tts voice id (speakHd only)
}

export async function speak(
  text: string,
  role: VoiceRole,
  opts: SpeakOpts = {},
): Promise<SpeakHandle> {
  const cleaned = stripForSpeech(text)
  if (!speechSupported() || opts.enabled === false || !cleaned) {
    // Simulate timing so the avatar still "mouths" the line silently.
    opts.onStart?.()
    const ms = Math.min(6000, 400 + cleaned.length * 45)
    const t = setTimeout(() => opts.onEnd?.(), ms)
    return { cancel: () => clearTimeout(t) }
  }

  const voices = await loadVoices()
  const u = new SpeechSynthesisUtterance(cleaned)
  const named =
    opts.voiceName && voices.find((v) => v.name === opts.voiceName)
  const v = named || pickVoice(voices, role)
  if (v) u.voice = v
  if (role === "child") {
    // Higher pitch + slightly slower, clearer cadence reads as a young child.
    u.pitch = opts.pitch ?? 1.9
    u.rate = opts.rate ?? 0.9
    u.volume = 1
  } else {
    // Warm adult parent.
    u.pitch = opts.pitch ?? 1.05
    u.rate = opts.rate ?? 1.0
  }
  u.onstart = () => opts.onStart?.()
  u.onend = () => opts.onEnd?.()
  u.onerror = () => opts.onEnd?.()

  window.speechSynthesis.cancel() // stop anything mid-sentence
  window.speechSynthesis.speak(u)
  return {
    cancel: () => {
      u.onend = null
      window.speechSynthesis.cancel()
    },
  }
}

export function cancelSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

// HD voice via the /api/tts (edge-tts) route. Streams MP3 and plays it; on any
// failure (edge-tts not installed, offline, Cloudflare) falls back to the
// browser Web Speech voice so the encounter always speaks.
let hdAudio: HTMLAudioElement | null = null

export async function speakHd(
  text: string,
  role: VoiceRole,
  opts: SpeakOpts = {},
): Promise<SpeakHandle> {
  const cleaned = stripForSpeech(text)
  if (opts.enabled === false || !cleaned) {
    opts.onStart?.()
    const ms = Math.min(6000, 400 + cleaned.length * 45)
    const t = setTimeout(() => opts.onEnd?.(), ms)
    return { cancel: () => clearTimeout(t) }
  }
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: cleaned, role, voice: opts.hdVoice }),
    })
    if (!res.ok) throw new Error(`tts ${res.status}`)
    const buf = await res.arrayBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }))
    if (hdAudio) hdAudio.pause()
    const audio = new Audio(url)
    hdAudio = audio
    const done = () => {
      URL.revokeObjectURL(url)
      opts.onEnd?.()
    }
    audio.onended = done
    audio.onerror = done
    opts.onStart?.()
    await audio.play()
    return {
      cancel: () => {
        audio.onended = null
        audio.pause()
        URL.revokeObjectURL(url)
      },
    }
  } catch {
    // Fall back to the browser voice.
    return speak(text, role, { ...opts, onStart: opts.onStart })
  }
}

export function cancelHd() {
  if (hdAudio) {
    hdAudio.onended = null
    hdAudio.pause()
    hdAudio = null
  }
}

// For the settings voice picker: English voices, name + lang.
export async function listVoices(): Promise<
  { name: string; lang: string }[]
> {
  const voices = await loadVoices()
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang))
  return (en.length ? en : voices).map((v) => ({ name: v.name, lang: v.lang }))
}

// ── Optional voice input (doctor dictation) ───────────────────────────────

type SpeechRecognitionCtor = new () => {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function recognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export function listenOnce(
  onText: (text: string) => void,
  onEnd?: () => void,
): { stop: () => void } | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = "en-US"
  rec.interimResults = false
  rec.continuous = false
  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript
    if (t) onText(t)
  }
  rec.onend = () => onEnd?.()
  rec.onerror = () => onEnd?.()
  rec.start()
  return { stop: () => rec.stop() }
}
