// PedSim — shared type definitions for the pediatric avatar assessment platform.
// These mirror the scenario-package format described in ARCHITECTURE.md §3.

export type ContentDomain =
  | "respiratory"
  | "ent"
  | "behavioral_mental_health"
  | "allergy"

export type Temperament = "shy" | "chatty" | "defiant"

export type ParentStyle =
  | "anxious"
  | "dismissive"
  | "pushy"
  | "supportive"
  | "absent"

export interface ScenarioConfig {
  content_domain: ContentDomain
  learning_objectives: string[]
  age_range: [number, number]
  temperament: Temperament
  parent: { present: boolean; style: ParentStyle }
  location: { state: string; city?: string }
  sex?: "M" | "F"
  batch_size?: number
  seed?: number | null
}

export interface PatientDemographics {
  id: string
  name: string
  birthDate: string
  gender: string
  mrn: string
  address: string
  language: string
  race: string
  ethnicity: string
}

export interface Manifest {
  scenario_id: string
  seed: number
  config: ScenarioConfig
  abp_epa: string
  patient: PatientDemographics
}

export interface KeyFact {
  id: string
  category: "condition" | "medication" | "allergy" | "immunization" | "social"
  fact: string
  domain_relevant: boolean
  elicit_via: string
  // Overrides the default "active condition = readily disclosed" heuristic.
  // Set false for sensitive facts (e.g. mental-health concerns) that the child
  // should withhold until rapport clears the disclosure threshold.
  readily_disclosed?: boolean
}

export interface AnswerKey {
  learning_objectives: string[]
  key_facts: KeyFact[]
  scoring_note: string
}

export interface RapportRule {
  // Human-readable rule as authored in persona.json, e.g.
  // "+15 when doctor introduces themselves warmly and at eye level"
  text: string
}

// In-character lines the deterministic engine voices for this specific child.
// Making these data-driven lets any domain/temperament sound right without
// touching engine code. All optional — a respiratory-shy default fills gaps.
export interface ChildDialogue {
  greetingOpen?: string
  greetingGuarded?: string
  interestsOpen?: string
  interestsGuarded?: string
  feelingsAck?: string
  chiefOpen?: string // active condition, disclosing
  chiefGuarded?: string // active condition, minimal
  priorEpisode?: string // resolved condition
  medication?: string // medication fact
  allergyFact?: string // allergy fact
  noAllergy?: string // asked about allergies, none on file
  genericSymptomOpen?: string
  genericSymptomGuarded?: string
  medicationUnknownGuarded?: string
  counselingOpen?: string
  counselingGuarded?: string
  withhold?: string // sensitive fact, below threshold
  withdrawn?: string // clammed up (doctor talked past them)
  jargonConfused?: string
  fillerOpen?: string
  fillerGuarded?: string
  // Per-fact lines keyed by KeyFact id — for scenarios with several distinct
  // active conditions (e.g. behavioral: anxiety vs low mood vs somatic pain).
  // Falls back to the category lines above when a fact isn't listed here.
  facts?: Record<string, { open?: string; guarded?: string }>
}

// Parent interjections, keyed by situation; empty string suppresses a branch.
export interface ParentDialogue {
  reassured?: string // doctor offered reassurance
  withdrawn?: string // child clammed up
  medication?: string // medication question
  symptom?: string // symptom / prior-history question
}

export interface Persona {
  child: {
    name: string
    age: number
    temperament: Temperament
    speaking_style: string
    language_level: string
  }
  rapport: {
    initial: number
    rules: string[]
    disclosure_threshold: number
    mechanic: string
  }
  parent: {
    present: boolean
    style: ParentStyle
    behavior: string | null
    label?: string // "Mom" | "Dad" | "Grandma" … how the UI names the parent
    dialogue?: ParentDialogue
  }
  hard_rules: string[]
  dialogue?: ChildDialogue
}

export interface AvatarDescriptor {
  age_bracket: "young_child" | "older_child" | "adolescent"
  sex: string
  race: string
  ethnicity: string
  model_url: string
  voice: string
}

// ── Compact chart (chart.json) consumed by the Epic-style viewer ──────────

export interface ProblemListEntry {
  name: string
  code?: string
  status: "active" | "resolved"
  onset?: string
  abatement?: string
}

export interface MedicationEntry {
  name: string
  status: "active" | "stopped" | "completed"
  authoredOn?: string
  reason?: string
}

export interface ImmunizationEntry {
  vaccine: string
  date: string
}

export interface EncounterEntry {
  date: string
  type: string
  reason?: string
  provider?: string
}

export interface VitalPoint {
  date: string
  ageMonths: number
  heightCm?: number
  weightKg?: number
  bmi?: number
  tempC?: number
  hr?: number
  rr?: number
  spo2?: number
}

export interface LabEntry {
  date: string
  name: string
  value: string
  unit?: string
  flag?: "normal" | "high" | "low"
}

export interface CareTeamMember {
  name: string
  role: string
}

export interface Chart {
  demographics: PatientDemographics
  problemList: ProblemListEntry[]
  medications: MedicationEntry[]
  immunizations: ImmunizationEntry[]
  encounters: EncounterEntry[]
  vitals: VitalPoint[]
  labs: LabEntry[]
  careTeam: CareTeamMember[]
  allergies: string[]
}

export interface ScenarioPackage {
  manifest: Manifest
  chart: Chart
  answer_key: AnswerKey
  persona: Persona
  avatar: AvatarDescriptor
}

// ── Runtime encounter state ───────────────────────────────────────────────

export type Speaker = "doctor" | "child" | "parent" | "system"

export interface TranscriptTurn {
  id: string
  speaker: Speaker
  text: string
  ts: number
  // Populated on doctor turns by the engine:
  rapportDelta?: number
  rapportAfter?: number
  factsSurfaced?: string[] // KeyFact ids
  appliedRules?: string[] // rule texts that fired
  disclosed?: boolean // whether the child was above threshold this turn
}

export interface RapportPoint {
  turn: number
  score: number
}

export interface ReviewLogEntry {
  tab: string
  openedAt: number
  dwellMs: number
}

export interface EncounterState {
  transcript: TranscriptTurn[]
  rapport: number
  rapportTrace: RapportPoint[]
  factsSurfaced: string[] // unique KeyFact ids surfaced across the encounter
  startedAt: number | null
  endedAt: number | null
}

// ── Scoring ───────────────────────────────────────────────────────────────

export interface MechanicalScore {
  historyCompleteness: {
    surfaced: number
    total: number
    pct: number
    missed: KeyFact[]
    surfacedFacts: KeyFact[]
  }
  chartCoverage: {
    tabsOpened: number
    tabsTotal: number
    pct: number
    dwellMs: number
    unopenedTabs: string[]
  }
  rapport: {
    final: number
    peak: number
    threshold: number
    reachedDisclosure: boolean
    trajectory: RapportPoint[]
  }
}

export interface RubricDomainScore {
  domain: string
  score: number // 0-4 behavioral-anchor scale
  max: 4
  rationale: string
  evidence: string[] // verbatim transcript excerpts
}

export interface AnnotatedMoment {
  turnId: string
  kind: "positive" | "negative" | "missed"
  note: string
  excerpt?: string
}

export interface ScoreReport {
  scenarioId: string
  generatedAt: number
  engine: "llm" | "heuristic"
  mechanical: MechanicalScore
  rubric: RubricDomainScore[]
  overall: {
    // Weighted 0-100 composite; weights derive from learning objectives.
    composite: number
    band: "Emerging" | "Developing" | "Proficient" | "Exemplary"
  }
  annotatedMoments: AnnotatedMoment[]
  missedFacts: KeyFact[]
}
