"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { nanoid } from "nanoid"
import {
  CornerDownLeft,
  Mic,
  RotateCcw,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePedSim } from "@/components/provider"
import {
  listenContinuous,
  recordAndTranscribe,
  sttBackend,
  speak,
  speakHd,
  cancelSpeech,
  cancelHd,
  type SpeakHandle,
} from "@/lib/pedsim/speech"
import { useAvatarSettings } from "@/lib/pedsim/avatar-settings"
import { AvatarSettingsPanel } from "@/components/avatar/avatar-settings"
import type { TranscriptTurn } from "@/lib/pedsim/types"

// The 3D avatar is client-only (WebGL) — load it without SSR.
const AvatarStage = dynamic(() => import("@/components/avatar/avatar-stage"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      Loading avatar…
    </div>
  ),
})

// Optional realistic avatar: set NEXT_PUBLIC_PEDSIM_AVATAR_URL to a Ready
// Player Me .glb (with ARKit + Oculus viseme morph targets). Falls back to the
// built-in stylized head when unset.
const AVATAR_URL = process.env.NEXT_PUBLIC_PEDSIM_AVATAR_URL || null

const SUGGESTIONS = [
  "Hi there, I'm Dr. Lee. It's really nice to meet you.",
  "What do you like to do for fun?",
  "Can you tell me what's been bothering you?",
  "That sounds hard. Has this ever happened before?",
  "Is Mom giving you any medicine at home?",
  "You're being really brave. Here's what I'd like to do next.",
]

interface EngineResponse {
  engine: "llm" | "heuristic"
  childText: string
  parentText: string | null
  rapportDelta: number
  rapportAfter: number
  appliedRules: string[]
  factsSurfaced: string[]
  disclosing: boolean
  parentOnlyStreak: number
}

export default function EncounterPage() {
  const router = useRouter()
  const {
    scenario,
    transcript,
    rapport,
    factsSurfaced,
    parentOnlyStreak,
    beginEncounter,
    appendTurns,
    applyTurnResult,
    endEncounter,
    resetEncounter,
  } = usePedSim()

  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [engineLabel, setEngineLabel] = useState<"llm" | "heuristic" | null>(null)
  const [voiceOn, setVoiceOn] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [activeSpeaker, setActiveSpeaker] = useState<"child" | "parent" | null>(
    null,
  )
  const [caption, setCaption] = useState<string>("")
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [interim, setInterim] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const speakHandle = useRef<SpeakHandle | null>(null)
  const contHandle = useRef<{ stop: () => void } | null>(null)
  const recHandle = useRef<{ stop: () => Promise<string> } | null>(null)
  const { settings, update: updateSettings, reset: resetSettings } =
    useAvatarSettings()

  const persona = scenario.persona
  const threshold = persona.rapport.disclosure_threshold
  const parentLabel = persona.parent.label ?? "Mom"
  const domainFacts = scenario.answer_key.key_facts.filter((f) => f.domain_relevant)
  const avatarUrl =
    (/^https?:\/\//.test(settings.avatarUrl) ? settings.avatarUrl : null) ||
    AVATAR_URL ||
    (/^https?:\/\//.test(scenario.avatar.model_url)
      ? scenario.avatar.model_url
      : null)

  // Speak the child's reply, then the parent's (if any), animating the avatar.
  const speakReply = (childText: string, parentText: string | null) => {
    cancelSpeech()
    cancelHd()
    const say = settings.hdVoice ? speakHd : speak
    const runChild = async () => {
      setActiveSpeaker("child")
      setSpeaking(true)
      setCaption(childText)
      speakHandle.current = await say(childText, "child", {
        enabled: voiceOn,
        pitch: settings.childPitch,
        rate: settings.childRate,
        voiceName: settings.childVoice,
        hdVoice: settings.childHdVoice,
        onEnd: () => {
          if (parentText) runParent()
          else {
            setSpeaking(false)
            setActiveSpeaker(null)
          }
        },
      })
    }
    const runParent = async () => {
      setActiveSpeaker("parent")
      setSpeaking(true)
      setCaption(parentText as string)
      speakHandle.current = await say(parentText as string, "parent", {
        enabled: voiceOn,
        hdVoice: settings.parentHdVoice,
        onEnd: () => {
          setSpeaking(false)
          setActiveSpeaker(null)
        },
      })
    }
    runChild()
  }

  // Stop any speech + dictation when leaving the screen.
  useEffect(
    () => () => {
      cancelSpeech()
      cancelHd()
      contHandle.current?.stop()
    },
    [],
  )

  // Begin encounter + seed the scene-setting line once.
  useEffect(() => {
    beginEncounter()
    if (transcript.length === 0) {
      const poss =
        scenario.manifest.patient.gender === "female" ? "her" : "his"
      appendTurns([
        {
          id: nanoid(),
          speaker: "system",
          ts: Date.now(),
          text: `You enter the exam room. ${persona.child.name} is sitting on the exam table, swinging ${poss} legs. ${parentLabel} sits close by.`,
        },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [transcript, pending, sending])

  const send = async (text: string) => {
    const utterance = text.trim()
    if (!utterance || sending) return
    setInput("")
    setPending(utterance)
    setSending(true)
    try {
      const res = await fetch("/api/engine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.manifest.scenario_id,
          utterance,
          transcript,
          rapport,
          parentOnlyStreak,
          alreadySurfaced: factsSurfaced,
        }),
      })
      const r = (await res.json()) as EngineResponse
      setEngineLabel(r.engine)
      const now = Date.now()
      const turns: TranscriptTurn[] = [
        {
          id: nanoid(),
          speaker: "doctor",
          text: utterance,
          ts: now,
          rapportDelta: r.rapportDelta,
          rapportAfter: r.rapportAfter,
          appliedRules: r.appliedRules,
          factsSurfaced: r.factsSurfaced,
          disclosed: r.disclosing,
        },
        { id: nanoid(), speaker: "child", text: r.childText, ts: now + 1 },
      ]
      if (r.parentText)
        turns.push({
          id: nanoid(),
          speaker: "parent",
          text: r.parentText,
          ts: now + 2,
        })
      appendTurns(turns)
      applyTurnResult({
        rapportAfter: r.rapportAfter,
        factsSurfaced: r.factsSurfaced,
        parentOnlyStreak: r.parentOnlyStreak,
      })
      speakReply(r.childText, r.parentText)
    } catch {
      appendTurns([
        {
          id: nanoid(),
          speaker: "system",
          ts: Date.now(),
          text: "⚠️ The engine did not respond. Please try again.",
        },
      ])
    } finally {
      setPending(null)
      setSending(false)
    }
  }

  const finish = () => {
    cancelSpeech()
    cancelHd()
    contHandle.current?.stop()
    endEncounter()
    router.push("/report")
  }

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) {
        cancelSpeech()
        cancelHd()
      }
      return !v
    })
  }

  const micBackend = sttBackend()

  const toggleMic = async () => {
    if (micBackend === "browser") {
      // Hands-free continuous dictation: interim shows live, auto-sends on pause.
      if (listening) {
        contHandle.current?.stop()
        return
      }
      const h = listenContinuous({
        onInterim: (t) => setInterim(t),
        onFinal: (t) => {
          setInterim("")
          send(t)
        },
        onEnd: () => {
          setListening(false)
          setInterim("")
        },
      })
      if (h) {
        contHandle.current = h
        setListening(true)
      }
    } else if (micBackend === "whisper") {
      // Record → transcribe via /api/stt (Whisper) for non-Chrome browsers.
      if (listening) {
        const rec = recHandle.current
        recHandle.current = null
        setListening(false)
        if (rec) {
          const text = await rec.stop()
          if (text) setInput((p) => (p ? `${p} ${text}` : text))
        }
        setTranscribing(false)
        return
      }
      try {
        const rec = await recordAndTranscribe((s) =>
          setTranscribing(s === "transcribing"),
        )
        recHandle.current = rec
        setListening(true)
      } catch {
        /* mic permission denied */
      }
    }
  }

  const disclosing = rapport >= threshold
  const doctorTurns = transcript.filter((t) => t.speaker === "doctor").length
  const micOk = micBackend !== "none"

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Chat column */}
      <div className="relative flex h-[calc(100vh-160px)] min-h-[520px] flex-col rounded-xl border border-border bg-card">
        {/* 3D avatar stage */}
        <div className="relative h-[280px] shrink-0 overflow-hidden rounded-t-xl border-b border-border bg-[#eef2f8]">
          <AvatarStage
            speaking={speaking}
            speaker={activeSpeaker}
            mood={rapport}
            avatarUrl={avatarUrl}
            avatar={{
              age_bracket: scenario.avatar.age_bracket,
              sex: scenario.avatar.sex,
              race: scenario.avatar.race,
            }}
          />
          {/* speaker chip */}
          {activeSpeaker && (
            <div className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
              {activeSpeaker === "child" ? persona.child.name : parentLabel}{" "}
              {speaking && <span className="animate-pulse">🔊</span>}
            </div>
          )}
          {/* voice controls */}
          <div className="absolute right-3 top-3 flex gap-1.5">
            <button
              onClick={toggleVoice}
              title={voiceOn ? "Mute voice" : "Unmute voice"}
              className="grid size-8 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
            >
              {voiceOn ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeX className="size-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              title="Avatar & voice settings"
              className="grid size-8 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition hover:bg-background"
            >
              <Settings2 className="size-4" />
            </button>
          </div>

          {/* live listening indicator with interim transcript */}
          {(listening || transcribing) && (
            <div className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-2 rounded-lg bg-primary/90 px-3 py-2 text-sm text-primary-foreground shadow-lg">
              <span className="relative flex size-3 shrink-0">
                {!transcribing && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
                )}
                <span className="relative inline-flex size-3 rounded-full bg-white" />
              </span>
              <span className="truncate">
                {transcribing
                  ? "Transcribing…"
                  : interim
                    ? interim
                    : "Listening… speak now"}
              </span>
            </div>
          )}
        </div>

        {settingsOpen && (
          <AvatarSettingsPanel
            settings={settings}
            onUpdate={updateSettings}
            onReset={resetSettings}
            onClose={() => setSettingsOpen(false)}
            childName={persona.child.name}
          />
        )}

        {/* live caption (kept clear of the face) */}
        {caption && (
          <div className="shrink-0 border-b border-border bg-secondary/40 px-4 py-2 text-center text-sm">
            <span className="font-medium text-muted-foreground">
              {activeSpeaker === "parent"
                ? `${parentLabel}: `
                : `${persona.child.name}: `}
            </span>
            {caption.replace(/^\s*(mom|dad)\s*:\s*/i, "")}
          </div>
        )}

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              Encounter · {persona.child.name}, {persona.child.age} y/o
            </p>
            <p className="text-xs text-muted-foreground">
              {doctorTurns} doctor turn{doctorTurns === 1 ? "" : "s"}
              {engineLabel && (
                <>
                  {" · "}
                  <span className="uppercase tracking-wide">
                    {engineLabel === "llm" ? "LLM engine" : "rule engine"}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetEncounter}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button size="sm" onClick={finish} disabled={doctorTurns === 0}>
              End &amp; Score
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {transcript.map((t) => (
            <Bubble
              key={t.id}
              turn={t}
              childName={persona.child.name}
              parentLabel={parentLabel}
            />
          ))}
          {pending && (
            <Bubble
              turn={{
                id: "pending",
                speaker: "doctor",
                text: pending,
                ts: 0,
              }}
              childName={persona.child.name}
              parentLabel={parentLabel}
            />
          )}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                {persona.child.name[0]}
              </span>
              <span className="animate-pulse">
                {persona.child.name} is thinking…
              </span>
            </div>
          )}
        </div>

        {/* Suggestions (parent label adapts per scenario) */}
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 pt-3">
          {SUGGESTIONS.map((raw) => {
            const s = raw.replace(/\bMom\b/g, parentLabel)
            return (
              <button
                key={raw}
                onClick={() => send(s)}
                disabled={sending}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                {s.length > 42 ? s.slice(0, 40) + "…" : s}
              </button>
            )
          })}
        </div>

        {/* Input */}
        <form
          className="flex items-end gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder="Speak to the child (or their parent)…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          {micOk && (
            <Button
              type="button"
              size="icon-lg"
              variant={listening ? "default" : "outline"}
              onClick={toggleMic}
              disabled={transcribing}
              title={
                transcribing
                  ? "Transcribing…"
                  : listening
                    ? micBackend === "whisper"
                      ? "Stop & transcribe"
                      : "Stop dictation"
                    : micBackend === "whisper"
                      ? "Record (speech-to-text)"
                      : "Dictate hands-free"
              }
              className={listening || transcribing ? "animate-pulse" : ""}
            >
              <Mic className="size-4" />
            </Button>
          )}
          <Button type="submit" size="icon-lg" disabled={sending || !input.trim()}>
            <CornerDownLeft className="size-4" />
          </Button>
        </form>
      </div>

      {/* Live state sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Rapport</p>
            <Badge variant={disclosing ? "default" : "secondary"}>
              {disclosing ? "Open" : "Guarded"}
            </Badge>
          </div>
          <RapportMeter value={rapport} threshold={threshold} />
          <p className="mt-2 text-xs text-muted-foreground">
            {disclosing
              ? `Above the disclosure threshold (${threshold}). ${persona.child.name} is answering openly.`
              : `Below the disclosure threshold (${threshold}). Build rapport before asking sensitive questions.`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            History facts surfaced
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            {domainFacts.filter((f) => factsSurfaced.includes(f.id)).length}/
            {domainFacts.length} domain-relevant facts elicited
          </p>
          <ul className="space-y-2">
            {domainFacts.map((f) => {
              const got = factsSurfaced.includes(f.id)
              return (
                <li key={f.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${
                      got
                        ? "bg-emerald-500 text-white"
                        : "border border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={got ? "" : "text-muted-foreground"}>
                    {f.fact}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Hard rules in play</p>
          <ul className="list-inside list-disc space-y-1">
            {persona.hard_rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function RapportMeter({ value, threshold }: { value: number; threshold: number }) {
  const color =
    value >= threshold
      ? "bg-emerald-500"
      : value >= threshold - 20
        ? "bg-amber-500"
        : "bg-destructive"
  return (
    <div className="relative h-3 w-full rounded-full bg-muted">
      <div
        className={`h-3 rounded-full transition-all ${color}`}
        style={{ width: `${value}%` }}
      />
      {/* threshold marker */}
      <div
        className="absolute top-[-3px] h-[18px] w-0.5 bg-foreground/60"
        style={{ left: `${threshold}%` }}
        title={`Disclosure threshold ${threshold}`}
      />
      <span className="absolute -bottom-5 text-[10px] font-medium tabular-nums" style={{ left: `calc(${value}% - 8px)` }}>
        {value}
      </span>
    </div>
  )
}

function Bubble({
  turn,
  childName,
  parentLabel = "Mom",
}: {
  turn: TranscriptTurn
  childName: string
  parentLabel?: string
}) {
  if (turn.speaker === "system") {
    return (
      <p className="mx-auto max-w-lg text-center text-xs italic text-muted-foreground">
        {turn.text}
      </p>
    )
  }
  const isDoctor = turn.speaker === "doctor"
  const isParent = turn.speaker === "parent"
  return (
    <div className={`flex gap-2 ${isDoctor ? "flex-row-reverse" : ""}`}>
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isDoctor
            ? "bg-primary text-primary-foreground"
            : isParent
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
              : "bg-accent/15 text-accent"
        }`}
      >
        {isDoctor ? "Dr" : isParent ? parentLabel[0] : childName[0]}
      </span>
      <div className={`max-w-[78%] ${isDoctor ? "items-end" : ""}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isDoctor
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : isParent
                ? "rounded-tl-sm border border-purple-500/30 bg-purple-500/5"
                : "rounded-tl-sm bg-secondary"
          }`}
        >
          {isParent ? `${parentLabel}: ${turn.text}` : turn.text}
        </div>
        {isDoctor &&
          (turn.appliedRules?.length || typeof turn.rapportDelta === "number") && (
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              {typeof turn.rapportDelta === "number" && turn.rapportDelta !== 0 && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    turn.rapportDelta > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {turn.rapportDelta > 0 ? "+" : ""}
                  {turn.rapportDelta} rapport
                </span>
              )}
              {turn.factsSurfaced?.map((f) => (
                <span
                  key={f}
                  className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
