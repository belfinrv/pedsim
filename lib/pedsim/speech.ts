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

export async function speak(
  text: string,
  role: VoiceRole,
  opts: { onStart?: () => void; onEnd?: () => void; enabled?: boolean } = {},
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
  const v = pickVoice(voices, role)
  if (v) u.voice = v
  if (role === "child") {
    u.pitch = 1.6 // childlike
    u.rate = 0.98
  } else {
    u.pitch = 1.0
    u.rate = 1.02
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
