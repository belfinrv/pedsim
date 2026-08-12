"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePedSim } from "@/components/provider"
import type { RapportPoint, ScoreReport } from "@/lib/pedsim/types"

const BAND_COLOR: Record<string, string> = {
  Emerging: "text-destructive",
  Developing: "text-amber-600 dark:text-amber-400",
  Proficient: "text-primary",
  Exemplary: "text-emerald-600 dark:text-emerald-400",
}

export default function ReportPage() {
  const {
    scenario,
    transcript,
    reviewLog,
    rapportTrace,
    factsSurfaced,
    report,
    setReport,
  } = usePedSim()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doctorTurns = transcript.filter((t) => t.speaker === "doctor").length

  const runScore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.manifest.scenario_id,
          transcript,
          reviewLog,
          rapportTrace,
          factsSurfaced,
        }),
      })
      if (!res.ok) throw new Error(`score failed (${res.status})`)
      const data = (await res.json()) as ScoreReport
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "scoring failed")
    } finally {
      setLoading(false)
    }
  }, [scenario, transcript, reviewLog, rapportTrace, factsSurfaced, setReport])

  useEffect(() => {
    if (!report && doctorTurns > 0 && !loading) runScore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (doctorTurns === 0) {
    return (
      <EmptyState />
    )
  }

  if (loading || (!report && !error)) {
    return (
      <div className="grid place-items-center py-24 text-sm text-muted-foreground">
        Scoring the encounter…
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-sm text-destructive">Could not score: {error}</p>
        <Button onClick={runScore}>Retry</Button>
      </div>
    )
  }

  if (!report) return <EmptyState />

  const m = report.mechanical
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Screen 3 · {report.engine === "llm" ? "LLM-graded rubric" : "Heuristic rubric"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Score report</h1>
          <p className="text-sm text-muted-foreground">
            {scenario.manifest.patient.name} · {scenario.manifest.config.content_domain} ·{" "}
            {scenario.manifest.abp_epa}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runScore}>
            Re-score
          </Button>
          <Button asChild>
            <Link href="/encounter">Back to encounter</Link>
          </Button>
        </div>
      </div>

      {/* Composite */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">Overall composite</p>
            <p className="text-5xl font-bold tabular-nums">
              {report.overall.composite}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
            <p className={`text-lg font-semibold ${BAND_COLOR[report.overall.band]}`}>
              {report.overall.band}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat
              label="History"
              value={`${m.historyCompleteness.pct}%`}
              sub={`${m.historyCompleteness.surfaced}/${m.historyCompleteness.total} facts`}
            />
            <Stat
              label="Chart"
              value={`${m.chartCoverage.pct}%`}
              sub={`${m.chartCoverage.tabsOpened}/${m.chartCoverage.tabsTotal} tabs`}
            />
            <Stat
              label="Rapport"
              value={`${m.rapport.final}`}
              sub={m.rapport.reachedDisclosure ? "disclosed" : "guarded"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mechanical */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mechanical scores</CardTitle>
            <CardDescription>No AI judgment — counted from the log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>History completeness</span>
                <span className="font-medium">
                  {m.historyCompleteness.surfaced}/{m.historyCompleteness.total}
                </span>
              </div>
              <Meter pct={m.historyCompleteness.pct} />
              {m.historyCompleteness.surfacedFacts.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {m.historyCompleteness.surfacedFacts.map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      {f.fact}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Chart-review coverage</span>
                <span className="font-medium">
                  {m.chartCoverage.tabsOpened}/{m.chartCoverage.tabsTotal} tabs ·{" "}
                  {(m.chartCoverage.dwellMs / 1000).toFixed(0)}s
                </span>
              </div>
              <Meter pct={m.chartCoverage.pct} />
              {m.chartCoverage.unopenedTabs.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Never opened: {m.chartCoverage.unopenedTabs.join(", ")}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Rapport trajectory</span>
                <span className="font-medium">
                  peak {m.rapport.peak} · final {m.rapport.final}
                </span>
              </div>
              <RapportSpark trace={m.rapport.trajectory} threshold={m.rapport.threshold} />
            </div>
          </CardContent>
        </Card>

        {/* Rubric */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rubric domains</CardTitle>
            <CardDescription>
              Behavioral anchors, 0–4, with transcript evidence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.rubric.map((r) => (
              <div key={r.domain} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.domain}</span>
                  <span className="flex gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`size-3 rounded-sm ${
                          i < r.score ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                      {r.score}/4
                    </span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{r.rationale}</p>
                {r.evidence.length > 0 && (
                  <ul className="space-y-1">
                    {r.evidence.map((e, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground"
                      >
                        “{e}”
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Annotated moments + missed facts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annotated moments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.annotatedMoments.length === 0 && (
              <p className="text-sm text-muted-foreground">No notable moments flagged.</p>
            )}
            {report.annotatedMoments.map((a, i) => (
              <div key={i} className="flex gap-2 text-sm">
                {a.kind === "positive" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div>
                  <p>{a.note}</p>
                  {a.excerpt && (
                    <p className="text-xs italic text-muted-foreground">“{a.excerpt}”</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missed history facts</CardTitle>
            <CardDescription>Domain-relevant facts never elicited</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.missedFacts.length === 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Complete — every domain-relevant fact was surfaced.
              </p>
            ) : (
              report.missedFacts.map((f) => (
                <div key={f.id} className="flex gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div>
                    <p>{f.fact}</p>
                    <p className="text-xs text-muted-foreground">
                      Would have surfaced via {f.elicit_via}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Clinical reasoning is reported as feedback but carries near-zero score
        weight — PedSim scores what is observable in the transcript (ABP Core
        Competencies 3 &amp; 4). This is a prototype, not a summative instrument.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid place-items-center gap-4 py-24 text-center">
      <p className="text-sm text-muted-foreground">
        No encounter yet. Complete an encounter to generate a score report.
      </p>
      <Button asChild>
        <Link href="/encounter">Go to the encounter</Link>
      </Button>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function RapportSpark({
  trace,
  threshold,
}: {
  trace: RapportPoint[]
  threshold: number
}) {
  const W = 320
  const H = 80
  const pad = 6
  if (trace.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough turns to plot.</p>
  }
  const maxTurn = Math.max(...trace.map((p) => p.turn), 1)
  const x = (t: number) => pad + (t / maxTurn) * (W - 2 * pad)
  const y = (s: number) => H - pad - (s / 100) * (H - 2 * pad)
  const d = trace.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.turn)} ${y(p.score)}`).join(" ")
  return (
    <svg width={W} height={H} className="w-full text-muted-foreground">
      <line
        x1={pad}
        y1={y(threshold)}
        x2={W - pad}
        y2={y(threshold)}
        stroke="currentColor"
        strokeDasharray="3 3"
        strokeOpacity={0.5}
      />
      <text x={W - pad} y={y(threshold) - 3} fontSize={8} textAnchor="end" fill="currentColor">
        threshold {threshold}
      </text>
      <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {trace.map((p, i) => (
        <circle
          key={i}
          cx={x(p.turn)}
          cy={y(p.score)}
          r={2.5}
          fill={p.score >= threshold ? "var(--color-primary)" : "var(--color-accent)"}
        />
      ))}
    </svg>
  )
}
