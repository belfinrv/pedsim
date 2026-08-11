"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePedSim } from "@/components/provider"
import { ageFromDob } from "@/lib/pedsim/scenario-builder"
import { CHART_TABS } from "@/lib/pedsim/scoring"
import type { Chart } from "@/lib/pedsim/types"

export default function ChartReviewPage() {
  const { scenario, reviewLog, logTab } = usePedSim()
  const chart = scenario.chart
  const [tab, setTab] = useState<string>(CHART_TABS[0])
  const openedAt = useRef<number>(Date.now())

  // Log dwell time whenever the active tab changes or the page unmounts —
  // this is the chart-review coverage signal the scorer reads.
  const switchTab = (next: string) => {
    if (next === tab) return
    logTab(tab, Date.now() - openedAt.current)
    openedAt.current = Date.now()
    setTab(next)
  }
  useEffect(() => {
    const current = tab
    const opened = openedAt
    return () => {
      logTab(current, Date.now() - opened.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const p = chart.demographics
  const age = ageFromDob(p.birthDate)
  const seen = new Set(reviewLog.map((r) => r.tab))

  return (
    <div className="space-y-4">
      {/* Storyboard header */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {p.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {age} y/o {p.gender} · MRN {p.mrn.slice(0, 8)} · DOB {p.birthDate}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.address} · {p.language}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
            Simulation — Synthetic Data
          </Badge>
          <Button asChild size="sm">
            <Link href="/encounter">Begin Encounter →</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        {/* Tab rail */}
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {CHART_TABS.map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary"
              }`}
            >
              <span>{t}</span>
              {seen.has(t) && tab !== t && (
                <span className="ml-2 size-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Tab body */}
        <div className="min-h-[420px] rounded-xl border border-border bg-card p-5">
          <TabBody tab={tab} chart={chart} age={age} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tabs opened: {seen.size}/{CHART_TABS.length}. Dwell time on each tab is
        logged and contributes to your chart-review coverage score.
      </p>
    </div>
  )
}

function TabBody({ tab, chart, age }: { tab: string; chart: Chart; age: number }) {
  switch (tab) {
    case "SnapShot":
      return <SnapShot chart={chart} age={age} />
    case "Chart Review":
      return <Encounters chart={chart} />
    case "Problem List":
      return <ProblemList chart={chart} />
    case "Results":
      return <Results chart={chart} />
    case "Medications":
      return <Medications chart={chart} />
    case "Immunizations":
      return <Immunizations chart={chart} />
    case "Growth Chart":
      return <GrowthChart chart={chart} />
    default:
      return null
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}

function SnapShot({ chart, age }: { chart: Chart; age: number }) {
  const active = chart.problemList.filter((p) => p.status === "active")
  const activeMeds = chart.medications.filter((m) => m.status === "active")
  const latestVitals = chart.vitals[chart.vitals.length - 1]
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Active problems</SectionTitle>
        {active.length ? (
          <ul className="space-y-1 text-sm">
            {active.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-destructive" />
                {p.name}{" "}
                <span className="text-xs text-muted-foreground">
                  onset {p.onset}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None on file.</p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <SectionTitle>Active medications</SectionTitle>
          <ul className="space-y-1 text-sm">
            {activeMeds.map((m, i) => (
              <li key={i}>{m.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle>Most recent vitals</SectionTitle>
          {latestVitals ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {latestVitals.tempC != null && (
                <Vital k="Temp" v={`${latestVitals.tempC} °C`} />
              )}
              {latestVitals.hr != null && (
                <Vital k="HR" v={`${latestVitals.hr} bpm`} />
              )}
              {latestVitals.rr != null && (
                <Vital k="RR" v={`${latestVitals.rr} /min`} />
              )}
              {latestVitals.spo2 != null && (
                <Vital k="SpO₂" v={`${latestVitals.spo2}%`} />
              )}
              {latestVitals.heightCm != null && (
                <Vital k="Height" v={`${latestVitals.heightCm} cm`} />
              )}
              {latestVitals.weightKg != null && (
                <Vital k="Weight" v={`${latestVitals.weightKg} kg`} />
              )}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">None.</p>
          )}
        </div>
      </div>
      <div>
        <SectionTitle>Allergies</SectionTitle>
        <p className="text-sm">
          {chart.allergies.length ? chart.allergies.join(", ") : "No known drug allergies (NKDA)"}
        </p>
      </div>
      <div>
        <SectionTitle>Care team</SectionTitle>
        <ul className="text-sm text-muted-foreground">
          {chart.careTeam.map((c, i) => (
            <li key={i}>
              {c.name} — {c.role}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Vital({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </>
  )
}

function Encounters({ chart }: { chart: Chart }) {
  return (
    <div>
      <SectionTitle>Encounters</SectionTitle>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {chart.encounters.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[22px] top-1 size-2.5 rounded-full bg-primary" />
            <p className="text-sm font-medium">
              {e.type} · <span className="text-muted-foreground">{e.date}</span>
            </p>
            <p className="text-sm text-muted-foreground">{e.reason}</p>
            {e.provider && (
              <p className="text-xs text-muted-foreground">{e.provider}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ProblemList({ chart }: { chart: Chart }) {
  return (
    <div>
      <SectionTitle>Problem list</SectionTitle>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Problem</th>
            <th>Status</th>
            <th>Onset</th>
            <th>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {chart.problemList.map((p, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 pr-2">{p.name}</td>
              <td>
                <Badge
                  variant={p.status === "active" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {p.status}
                </Badge>
              </td>
              <td className="text-muted-foreground">{p.onset ?? "—"}</td>
              <td className="text-muted-foreground">{p.abatement ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Results({ chart }: { chart: Chart }) {
  return (
    <div>
      <SectionTitle>Results</SectionTitle>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2">Test</th>
            <th>Value</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {chart.labs.map((l, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 pr-2">{l.name}</td>
              <td>
                <span
                  className={
                    l.flag === "high"
                      ? "font-medium text-destructive"
                      : l.flag === "low"
                        ? "font-medium text-amber-600"
                        : ""
                  }
                >
                  {l.value}
                  {l.unit ? ` ${l.unit}` : ""}
                </span>
              </td>
              <td className="text-muted-foreground">{l.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Medications({ chart }: { chart: Chart }) {
  return (
    <div>
      <SectionTitle>Medications</SectionTitle>
      <ul className="space-y-2">
        {chart.medications.map((m, i) => (
          <li key={i} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{m.name}</span>
              <Badge
                variant={m.status === "active" ? "default" : "outline"}
                className="shrink-0 text-[10px]"
              >
                {m.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {m.authoredOn ? `Authored ${m.authoredOn}` : ""}
              {m.reason ? ` · ${m.reason}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Immunizations({ chart }: { chart: Chart }) {
  return (
    <div>
      <SectionTitle>Immunizations ({chart.immunizations.length})</SectionTitle>
      <div className="grid gap-1 sm:grid-cols-2">
        {chart.immunizations.map((im, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm"
          >
            <span>{im.vaccine}</span>
            <span className="text-xs text-muted-foreground">{im.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GrowthChart({ chart }: { chart: Chart }) {
  const pts = chart.vitals.filter(
    (v) => v.heightCm != null && v.weightKg != null,
  )
  if (pts.length < 2)
    return <p className="text-sm text-muted-foreground">Not enough data.</p>

  const W = 560
  const H = 300
  const pad = 40
  const maxAge = Math.max(...pts.map((p) => p.ageMonths))
  const maxH = Math.max(...pts.map((p) => p.heightCm!))
  const maxW = Math.max(...pts.map((p) => p.weightKg!))

  const x = (m: number) => pad + (m / maxAge) * (W - 2 * pad)
  const yH = (h: number) => H - pad - (h / maxH) * (H - 2 * pad)
  const yW = (w: number) => H - pad - (w / maxW) * (H - 2 * pad)

  const line = (fn: (p: (typeof pts)[number]) => number) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.ageMonths)} ${fn(p)}`).join(" ")

  return (
    <div>
      <SectionTitle>Growth chart</SectionTitle>
      <div className="overflow-x-auto">
        <svg width={W} height={H} className="text-muted-foreground">
          {/* axes */}
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" strokeOpacity={0.3} />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="currentColor" strokeOpacity={0.3} />
          {/* height line */}
          <path d={line((p) => yH(p.heightCm!))} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
          {pts.map((p, i) => (
            <circle key={`h${i}`} cx={x(p.ageMonths)} cy={yH(p.heightCm!)} r={3} fill="var(--color-primary)" />
          ))}
          {/* weight line */}
          <path d={line((p) => yW(p.weightKg!))} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeDasharray="4 3" />
          {pts.map((p, i) => (
            <circle key={`w${i}`} cx={x(p.ageMonths)} cy={yW(p.weightKg!)} r={3} fill="var(--color-accent)" />
          ))}
          {/* x labels */}
          {pts.map((p, i) => (
            <text key={`x${i}`} x={x(p.ageMonths)} y={H - pad + 14} fontSize={9} textAnchor="middle" fill="currentColor">
              {Math.round(p.ageMonths / 12)}y
            </text>
          ))}
          <text x={W / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="currentColor">
            Age (years)
          </text>
        </svg>
      </div>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary" /> Height (cm)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-accent" /> Weight (kg)
        </span>
      </div>
    </div>
  )
}
