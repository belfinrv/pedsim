"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { nanoid } from "nanoid"
import { CornerDownLeft, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePedSim } from "@/components/provider"
import type { TranscriptTurn } from "@/lib/pedsim/types"

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
  const scrollRef = useRef<HTMLDivElement>(null)

  const persona = scenario.persona
  const threshold = persona.rapport.disclosure_threshold
  const domainFacts = scenario.answer_key.key_facts.filter((f) => f.domain_relevant)

  // Begin encounter + seed the scene-setting line once.
  useEffect(() => {
    beginEncounter()
    if (transcript.length === 0) {
      appendTurns([
        {
          id: nanoid(),
          speaker: "system",
          ts: Date.now(),
          text: `You enter the exam room. ${persona.child.name} is sitting on the table, swinging his legs and looking at the floor. His mother sits close beside him, looking worried.`,
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
      const res = await fetch("/api/pedsim/engine", {
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
    endEncounter()
    router.push("/report")
  }

  const disclosing = rapport >= threshold
  const doctorTurns = transcript.filter((t) => t.speaker === "doctor").length

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Chat column */}
      <div className="flex h-[calc(100vh-160px)] min-h-[520px] flex-col rounded-xl border border-border bg-card">
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
            <Bubble key={t.id} turn={t} childName={persona.child.name} />
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

        {/* Suggestions */}
        <div className="flex flex-wrap gap-1.5 border-t border-border px-4 pt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={sending}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              {s.length > 42 ? s.slice(0, 40) + "…" : s}
            </button>
          ))}
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
}: {
  turn: TranscriptTurn
  childName: string
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
        {isDoctor ? "Dr" : isParent ? "M" : childName[0]}
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
          {turn.text}
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
