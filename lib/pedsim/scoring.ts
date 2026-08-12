// PedSim — scoring module.
// Two deliberately-separated layers (ARCHITECTURE.md §2.7):
//   1. Mechanical  — no AI judgment: facts surfaced / answer-key facts, chart
//      coverage from the review log, rapport trajectory from the state machine.
//   2. Rubric      — behavioral anchors per domain, with verbatim evidence.
//      LLM-graded when available, heuristic otherwise; identical shape either way.

import { analyzeUtterance } from "./rapport"
import type {
  AnnotatedMoment,
  AnswerKey,
  KeyFact,
  MechanicalScore,
  Persona,
  ReviewLogEntry,
  RapportPoint,
  RubricDomainScore,
  ScoreReport,
  TranscriptTurn,
} from "./types"

export const CHART_TABS = [
  "SnapShot",
  "Chart Review",
  "Problem List",
  "Results",
  "Medications",
  "Immunizations",
  "Growth Chart",
]

export interface ScoreInput {
  scenarioId: string
  persona: Persona
  answerKey: AnswerKey
  transcript: TranscriptTurn[]
  reviewLog: ReviewLogEntry[]
  rapportTrace: RapportPoint[]
  factsSurfaced: string[]
  now: number
}

// ── Mechanical layer ──────────────────────────────────────────────────────

export function scoreMechanical(input: ScoreInput): MechanicalScore {
  const domainFacts = input.answerKey.key_facts.filter((f) => f.domain_relevant)
  const surfacedSet = new Set(input.factsSurfaced)
  const surfacedFacts = domainFacts.filter((f) => surfacedSet.has(f.id))
  const missed = domainFacts.filter((f) => !surfacedSet.has(f.id))

  const tabsSeen = new Map<string, number>()
  for (const e of input.reviewLog) {
    tabsSeen.set(e.tab, (tabsSeen.get(e.tab) ?? 0) + e.dwellMs)
  }
  const opened = CHART_TABS.filter((t) => tabsSeen.has(t))
  const unopened = CHART_TABS.filter((t) => !tabsSeen.has(t))
  const dwellMs = input.reviewLog.reduce((a, e) => a + e.dwellMs, 0)

  const trajectory = input.rapportTrace
  const scores = trajectory.map((p) => p.score)
  const final = scores.length ? scores[scores.length - 1] : input.persona.rapport.initial
  const peak = scores.length ? Math.max(...scores) : input.persona.rapport.initial
  const threshold = input.persona.rapport.disclosure_threshold

  return {
    historyCompleteness: {
      surfaced: surfacedFacts.length,
      total: domainFacts.length,
      pct: domainFacts.length
        ? Math.round((surfacedFacts.length / domainFacts.length) * 100)
        : 0,
      missed,
      surfacedFacts,
    },
    chartCoverage: {
      tabsOpened: opened.length,
      tabsTotal: CHART_TABS.length,
      pct: Math.round((opened.length / CHART_TABS.length) * 100),
      dwellMs,
      unopenedTabs: unopened,
    },
    rapport: {
      final,
      peak,
      threshold,
      reachedDisclosure: peak >= threshold,
      trajectory,
    },
  }
}

// ── Rubric layer (heuristic) ──────────────────────────────────────────────

interface DoctorSignalTally {
  nTurns: number
  jargonTurns: TranscriptTurn[]
  feelingTurns: TranscriptTurn[]
  nameInterestTurns: TranscriptTurn[]
  introduced: TranscriptTurn | null
  permissionTurns: TranscriptTurn[]
  planTurns: TranscriptTurn[]
  condescendingTurns: TranscriptTurn[]
  rushTurns: TranscriptTurn[]
  reassuringTurns: TranscriptTurn[]
  parentOnlyMax: number
}

function tally(input: ScoreInput): DoctorSignalTally {
  const t: DoctorSignalTally = {
    nTurns: 0,
    jargonTurns: [],
    feelingTurns: [],
    nameInterestTurns: [],
    introduced: null,
    permissionTurns: [],
    planTurns: [],
    condescendingTurns: [],
    rushTurns: [],
    reassuringTurns: [],
    parentOnlyMax: 0,
  }
  let streak = 0
  for (const turn of input.transcript) {
    if (turn.speaker !== "doctor") continue
    t.nTurns++
    const s = analyzeUtterance(turn.text, input.persona.child.name)
    const u = turn.text.toLowerCase()
    if (s.usesJargon) t.jargonTurns.push(turn)
    if (s.acknowledgesFeelings) t.feelingTurns.push(turn)
    if (s.usesChildName || s.asksInterests) t.nameInterestTurns.push(turn)
    if (s.introducesSelf && s.warmGreeting && !t.introduced) t.introduced = turn
    if (s.asksPermission) t.permissionTurns.push(turn)
    if (s.condescending) t.condescendingTurns.push(turn)
    if (s.rushesOrInterrupts) t.rushTurns.push(turn)
    if (
      s.honestAboutPlan ||
      /\b(you have|it'?s called|we'?ll give|you'?ll be|the plan is)\b/.test(u)
    )
      t.planTurns.push(turn)
    if (
      /\b(don'?t worry|not serious|mild|common|nothing to worry|reassur|good news|he'?ll be (fine|okay))\b/.test(
        u,
      )
    )
      t.reassuringTurns.push(turn)
    if (s.parentDirected && !s.childDirected) {
      streak++
      t.parentOnlyMax = Math.max(t.parentOnlyMax, streak)
    } else {
      streak = 0
    }
  }
  return t
}

function excerpts(turns: TranscriptTurn[], n = 2): string[] {
  return turns.slice(0, n).map((t) => t.text)
}

function clamp04(v: number): number {
  return Math.max(0, Math.min(4, Math.round(v)))
}

export function scoreRubricHeuristic(input: ScoreInput): RubricDomainScore[] {
  const t = tally(input)

  // 1. Age-adapted language
  let lang = 4 - Math.min(t.jargonTurns.length, 3)
  if (t.nTurns === 0) lang = 0
  const langScore: RubricDomainScore = {
    domain: "Age-adapted language",
    score: clamp04(lang),
    max: 4,
    rationale: t.jargonTurns.length
      ? `Used unexplained medical jargon on ${t.jargonTurns.length} turn(s); a ${input.persona.child.age}-year-old cannot follow those words.`
      : "Consistently spoke in plain, child-friendly language.",
    evidence: t.jargonTurns.length
      ? excerpts(t.jargonTurns)
      : excerpts(t.feelingTurns.length ? t.feelingTurns : t.nameInterestTurns),
  }

  // 2. Rapport technique
  let rapport = 1
  if (t.introduced) rapport += 1
  if (t.nameInterestTurns.length) rapport += 1
  if (t.feelingTurns.length) rapport += 1
  const mech = scoreMechanical(input)
  if (mech.rapport.final < input.persona.rapport.initial) rapport -= 1
  const rapportScore: RubricDomainScore = {
    domain: "Rapport technique",
    score: clamp04(rapport),
    max: 4,
    rationale: `Rapport moved from ${input.persona.rapport.initial} to ${mech.rapport.final} (peak ${mech.rapport.peak}). ${
      mech.rapport.reachedDisclosure
        ? "Cleared the disclosure threshold — the child opened up."
        : "Never cleared the disclosure threshold, so the child stayed guarded."
    }`,
    evidence: excerpts(
      [t.introduced, ...t.feelingTurns, ...t.nameInterestTurns].filter(
        Boolean,
      ) as TranscriptTurn[],
    ),
  }

  // 3. Counseling clarity
  let counseling = 1
  if (t.planTurns.length) counseling += 1
  if (t.reassuringTurns.length) counseling += 1
  if (t.planTurns.length && t.jargonTurns.length === 0) counseling += 1
  const counselingScore: RubricDomainScore = {
    domain: "Counseling clarity",
    score: clamp04(counseling),
    max: 4,
    rationale: t.planTurns.length
      ? "Explained the plan/findings; " +
        (t.reassuringTurns.length
          ? `handled the ${input.persona.parent.style} parent with reassurance.`
          : `could address the ${input.persona.parent.style} parent more explicitly.`)
      : "Did not clearly counsel the child/parent on findings or next steps.",
    evidence: excerpts(
      t.planTurns.length ? t.planTurns : t.reassuringTurns,
    ),
  }

  // 4. Professionalism
  let prof = 4
  prof -= Math.min(t.condescendingTurns.length * 2, 3)
  if (t.parentOnlyMax >= 3) prof -= 1
  if (t.rushTurns.length >= 2) prof -= 1
  const profScore: RubricDomainScore = {
    domain: "Professionalism",
    score: clamp04(prof),
    max: 4,
    rationale:
      t.condescendingTurns.length || t.parentOnlyMax >= 3 || t.rushTurns.length >= 2
        ? "Lapses: " +
          [
            t.condescendingTurns.length ? "condescending/threatening tone" : "",
            t.parentOnlyMax >= 3 ? "talked over the child to the parent" : "",
            t.rushTurns.length >= 2 ? "rushed the child" : "",
          ]
            .filter(Boolean)
            .join("; ") +
          "."
        : "Respectful, patient, and child-centered throughout.",
    evidence: excerpts(
      [...t.condescendingTurns, ...t.rushTurns].filter(Boolean),
    ),
  }

  return [langScore, rapportScore, counselingScore, profScore]
}

// ── Composite + annotations ───────────────────────────────────────────────

const DOMAIN_WEIGHTS: Record<string, number> = {
  historyCompleteness: 0.3,
  "Rapport technique": 0.25,
  "Age-adapted language": 0.15,
  "Counseling clarity": 0.15,
  Professionalism: 0.15,
}

function band(composite: number): ScoreReport["overall"]["band"] {
  if (composite >= 85) return "Exemplary"
  if (composite >= 65) return "Proficient"
  if (composite >= 45) return "Developing"
  return "Emerging"
}

export function annotate(input: ScoreInput): AnnotatedMoment[] {
  const moments: AnnotatedMoment[] = []
  for (const turn of input.transcript) {
    if (turn.speaker !== "doctor") continue
    const s = analyzeUtterance(turn.text, input.persona.child.name)
    if (s.introducesSelf && s.warmGreeting)
      moments.push({
        turnId: turn.id,
        kind: "positive",
        note: "Warm self-introduction built early rapport.",
        excerpt: turn.text,
      })
    if (s.acknowledgesFeelings)
      moments.push({
        turnId: turn.id,
        kind: "positive",
        note: "Acknowledged the child's feelings.",
        excerpt: turn.text,
      })
    if (turn.factsSurfaced && turn.factsSurfaced.length)
      moments.push({
        turnId: turn.id,
        kind: "positive",
        note: `Elicited a key history fact (${turn.factsSurfaced.join(", ")}).`,
        excerpt: turn.text,
      })
    if (s.usesJargon)
      moments.push({
        turnId: turn.id,
        kind: "negative",
        note: `Used unexplained jargon (${s.jargonTerms.join(", ")}).`,
        excerpt: turn.text,
      })
    if (s.condescending)
      moments.push({
        turnId: turn.id,
        kind: "negative",
        note: "Condescending or threatening tone.",
        excerpt: turn.text,
      })
  }
  return moments
}

export function assembleReport(
  input: ScoreInput,
  rubric: RubricDomainScore[],
  engine: "llm" | "heuristic",
): ScoreReport {
  const mechanical = scoreMechanical(input)

  const historyPct = mechanical.historyCompleteness.pct
  let composite = historyPct * DOMAIN_WEIGHTS.historyCompleteness
  for (const r of rubric) {
    const w = DOMAIN_WEIGHTS[r.domain] ?? 0
    composite += (r.score / 4) * 100 * w
  }
  composite = Math.round(composite)

  return {
    scenarioId: input.scenarioId,
    generatedAt: input.now,
    engine,
    mechanical,
    rubric,
    overall: { composite, band: band(composite) },
    annotatedMoments: annotate(input),
    missedFacts: mechanical.historyCompleteness.missed,
  }
}

// ── LLM rubric prompt ─────────────────────────────────────────────────────

export function buildRubricPrompt(input: ScoreInput): {
  system: string
  user: string
} {
  const transcript = input.transcript
    .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
    .join("\n")
  const system = `You are an expert pediatric OSCE examiner. Grade the DOCTOR (candidate) in the transcript below against four behavioral domains, each on a 0-4 anchored scale:
  0 = absent/harmful, 1 = emerging, 2 = developing, 3 = proficient, 4 = exemplary.

Domains:
  - "Age-adapted language": vocabulary matched to a ${input.persona.child.age}-year-old; no unexplained jargon.
  - "Rapport technique": warm introduction, uses the child's name/interests, acknowledges feelings, addresses the child (not only the parent).
  - "Counseling clarity": explains findings and next steps in plain terms; reassures the ${input.persona.parent.style} parent without dismissing concerns.
  - "Professionalism": respectful, patient, child-centered; no condescension, threats, or rushing.

Score ONLY what is observable in the transcript. Cite verbatim excerpts as evidence.
Return STRICT JSON, no prose:
{"domains":[{"domain":"Age-adapted language","score":0-4,"rationale":"...","evidence":["...","..."]}, ...four items...]}`
  const user = `Learning objectives: ${input.answerKey.learning_objectives.join("; ")}

TRANSCRIPT:
${transcript}`
  return { system, user }
}

export function parseRubricJson(raw: string): RubricDomainScore[] | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as {
      domains?: {
        domain: string
        score: number
        rationale?: string
        evidence?: string[]
      }[]
    }
    if (!parsed.domains?.length) return null
    return parsed.domains.map((d) => ({
      domain: d.domain,
      score: clamp04(d.score),
      max: 4,
      rationale: d.rationale ?? "",
      evidence: (d.evidence ?? []).slice(0, 3),
    }))
  } catch {
    return null
  }
}
