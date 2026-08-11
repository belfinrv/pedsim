import Link from "next/link"
import {
  Activity,
  ClipboardList,
  FileText,
  MessagesSquare,
  Stethoscope,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const SCREENS = [
  {
    href: "/builder",
    icon: ClipboardList,
    step: "Screen 0",
    title: "Scenario Builder",
    body: "An educator picks a content domain, learning objectives, temperament, and parent style. PedSim derives the persona, rapport rules, and answer key.",
  },
  {
    href: "/chart",
    icon: Stethoscope,
    step: "Screen 1",
    title: "Chart Review",
    body: "An Epic-style viewer of the synthetic patient's chart. Tab-open and dwell time are logged as the chart-review coverage signal.",
  },
  {
    href: "/encounter",
    icon: MessagesSquare,
    step: "Screen 2",
    title: "Encounter",
    body: "Talk to the child. A rapport state machine gates disclosure: good communication mechanically yields a better history. The anxious parent interjects.",
  },
  {
    href: "/report",
    icon: FileText,
    step: "Screen 3",
    title: "Score Report",
    body: "Mechanical scores (facts surfaced, chart coverage, rapport trajectory) plus a rubric across four behavioral domains, with verbatim evidence.",
  },
]

export default function PedSimHome() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Activity className="size-3.5" />
          ABP Core Competencies 3 & 4 · Behavioral / Mental-Health EPA
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          PedSim — pediatric avatar assessment
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Simulated child patients for evaluating pediatricians&apos;
          interpersonal &amp; communication skills, history-taking, counseling,
          and professionalism. The scenario package below is generated from
          synthetic Synthea data; the encounter engine, rapport state machine,
          and scoring module are implemented and runnable here — no API key
          required.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/builder">Start the exam flow</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/encounter">Jump to the encounter</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {SCREENS.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {s.step}
                    </p>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {s.body}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">How the rapport mechanic works</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The child starts guarded. Every doctor turn is scored against the
          persona&apos;s rapport rules — a warm introduction and using the
          child&apos;s name raise rapport; medical jargon or talking only to the
          parent lower it. Below the disclosure threshold the child gives
          minimal answers and withholds detail; above it, they open up and the
          key history facts become elicitable. Rapport and fact-tracking are
          computed deterministically (never left to the model), so every score
          is defensible and every encounter is replayable.
        </p>
      </section>
    </div>
  )
}
