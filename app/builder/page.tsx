"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePedSim } from "@/components/provider"
import {
  DOMAINS,
  PARENT_STYLE_LABELS,
  PARENT_STYLES,
  TEMPERAMENTS,
} from "@/lib/pedsim/registry"
import { scenariosForDomain } from "@/lib/pedsim/scenarios"
import {
  ageFromDob,
  buildAnswerKey,
  buildPersona,
} from "@/lib/pedsim/scenario-builder"
import type {
  ContentDomain,
  ParentStyle,
  ScenarioConfig,
  Temperament,
} from "@/lib/pedsim/types"

export default function BuilderPage() {
  const { scenario, selectScenario } = usePedSim()

  const [domain, setDomain] = useState<ContentDomain>(
    scenario.manifest.config.content_domain,
  )
  const [temperament, setTemperament] = useState<Temperament>(
    scenario.manifest.config.temperament,
  )
  const [parentPresent, setParentPresent] = useState(
    scenario.manifest.config.parent.present,
  )
  const [parentStyle, setParentStyle] = useState<ParentStyle>(
    scenario.manifest.config.parent.style,
  )
  const [objectives, setObjectives] = useState(
    scenario.manifest.config.learning_objectives.join("\n"),
  )
  const [committed, setCommitted] = useState(false)

  // The demo library ships pre-generated patients. Synthea patient generation
  // itself is a Java backend step (see ARCHITECTURE.md §2.1) run offline.
  const matched = useMemo(() => scenariosForDomain(domain)[0] ?? null, [domain])

  const config: ScenarioConfig = useMemo(
    () => ({
      content_domain: domain,
      learning_objectives: objectives.split("\n").map((l) => l.trim()).filter(Boolean),
      age_range: DOMAINS[domain] ? [6, 10] : [6, 10],
      temperament,
      parent: { present: parentPresent, style: parentStyle },
      location: { state: "North Carolina", city: "Charlotte" },
      batch_size: 40,
      seed: null,
    }),
    [domain, objectives, temperament, parentPresent, parentStyle],
  )

  const derivedPersona = useMemo(() => {
    if (!matched) return null
    const age = ageFromDob(matched.manifest.patient.birthDate)
    return buildPersona(config, matched.manifest.patient.name, age)
  }, [config, matched])

  const derivedAnswerKey = useMemo(
    () => (matched ? buildAnswerKey(matched.chart, config) : null),
    [config, matched],
  )

  const handleGenerate = () => {
    if (!matched) return
    selectScenario(matched.manifest.scenario_id)
    setCommitted(true)
  }

  const domainDef = DOMAINS[domain]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Screen 0
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Scenario Builder</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure the case. Objectives drive everything — they select the
          patient, derive the answer key, and weight the rubric. The Synthea
          patient generator runs offline; this demo picks the best pre-generated
          patient for your domain.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Config form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Educator configuration</CardTitle>
            <CardDescription>
              {domainDef.abp_epa}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Content domain</Label>
              <Select
                value={domain}
                onValueChange={(v) => {
                  const dom = v as ContentDomain
                  setDomain(dom)
                  // Sync the form to the pre-generated patient for this domain so
                  // the persona preview matches the scenario that will run.
                  const match = scenariosForDomain(dom)[0]
                  if (match) {
                    const c = match.manifest.config
                    setTemperament(c.temperament)
                    setParentStyle(c.parent.style)
                    setParentPresent(c.parent.present)
                    setObjectives(c.learning_objectives.join("\n"))
                  } else {
                    setObjectives(DOMAINS[dom].default_objectives.join("\n"))
                  }
                  setCommitted(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOMAINS) as ContentDomain[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {DOMAINS[d].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Child temperament</Label>
                <Select
                  value={temperament}
                  onValueChange={(v) => {
                    setTemperament(v as Temperament)
                    setCommitted(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TEMPERAMENTS) as Temperament[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TEMPERAMENTS[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent style</Label>
                <Select
                  value={parentStyle}
                  onValueChange={(v) => {
                    setParentStyle(v as ParentStyle)
                    setParentPresent(v !== "absent")
                    setCommitted(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PARENT_STYLES) as ParentStyle[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PARENT_STYLE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Learning objectives (one per line)</Label>
              <Textarea
                rows={5}
                value={objectives}
                onChange={(e) => {
                  setObjectives(e.target.value)
                  setCommitted(false)
                }}
                className="text-sm"
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Location: Charlotte, North Carolina · Age range 6–10 · Batch 40 ·
              Random seed (recorded in manifest for reproducibility)
            </div>

            <Button onClick={handleGenerate} disabled={!matched} className="w-full">
              <Sparkles className="size-4" />
              Generate scenario package
            </Button>
            {!matched && (
              <p className="text-xs text-destructive">
                No pre-generated patient for this domain in the demo library.
                Run{" "}
                <code className="rounded bg-muted px-1">
                  generate_scenario.py
                </code>{" "}
                to add one, or choose Respiratory.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Live derived package preview */}
        <div className="space-y-4">
          {committed && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Scenario committed. Proceed to Chart Review.
              <Button asChild size="sm" variant="secondary" className="ml-auto">
                <Link href="/chart">Chart Review →</Link>
              </Button>
            </div>
          )}

          {matched && derivedPersona && derivedAnswerKey ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Patient</CardTitle>
                    <Badge variant="secondary">
                      seed {matched.manifest.seed}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Field label="Name" value={matched.manifest.patient.name} />
                  <Field
                    label="Age"
                    value={`${ageFromDob(matched.manifest.patient.birthDate)} y/o`}
                  />
                  <Field label="Sex" value={matched.manifest.patient.gender} />
                  <Field
                    label="Race / ethnicity"
                    value={`${matched.manifest.patient.race} / ${matched.manifest.patient.ethnicity}`}
                  />
                  <Field
                    label="Location"
                    value={matched.manifest.patient.address}
                  />
                  <Field label="EPA" value={matched.manifest.abp_epa} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Persona &amp; rapport rules
                  </CardTitle>
                  <CardDescription>
                    {TEMPERAMENTS[temperament].label} child · initial rapport{" "}
                    {derivedPersona.rapport.initial} · discloses at{" "}
                    {derivedPersona.rapport.disclosure_threshold}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {derivedPersona.child.speaking_style}
                  </p>
                  <ul className="space-y-1">
                    {derivedPersona.rapport.rules.map((r) => (
                      <li
                        key={r}
                        className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1 font-mono text-xs"
                      >
                        <span
                          className={
                            r.startsWith("+")
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          }
                        >
                          {r.split(" ")[0]}
                        </span>
                        <span className="text-muted-foreground">
                          {r.slice(r.indexOf(" ") + 1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {derivedPersona.parent.present && (
                    <p className="rounded-md border border-border p-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {PARENT_STYLE_LABELS[derivedPersona.parent.style]} parent:
                      </span>{" "}
                      {derivedPersona.parent.behavior}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Derived answer key
                  </CardTitle>
                  <CardDescription>
                    Facts a well-conducted history should surface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {derivedAnswerKey.key_facts.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-start gap-2 rounded-md border border-border p-2 text-sm"
                    >
                      <Badge
                        variant={f.domain_relevant ? "default" : "outline"}
                        className="mt-0.5 shrink-0 text-[10px]"
                      >
                        {f.domain_relevant ? "domain" : "context"}
                      </Badge>
                      <div>
                        <p className="leading-snug">{f.fact}</p>
                        <p className="text-xs text-muted-foreground">
                          elicit via {f.elicit_via}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Configure a domain with a pre-generated patient to preview the
                scenario package.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </>
  )
}
