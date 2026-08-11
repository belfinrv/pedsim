// PedSim — fact elicitation & tracking.
// The scorer's mechanical layer is "answer-key facts surfaced in the
// transcript / total". A fact only surfaces when the doctor asks the matching
// kind of question (hard rule: never volunteer unprompted) and — for
// sensitive/historical facts — only once rapport clears the disclosure
// threshold.

import type { AnswerKey, KeyFact } from "./types"

export type QuestionIntent =
  | "symptom"
  | "medication"
  | "allergy"
  | "prior_history"
  | "none"

const SYMPTOM_WORDS = [
  "cough",
  "coughing",
  "breath",
  "breathing",
  "wheez",
  "chest",
  "hurt",
  "hurts",
  "feel",
  "feeling",
  "sick",
  "fever",
  "temperature",
  "cold",
  "snot",
  "runny",
  "tired",
  "sleep",
  "night",
  "brought you in",
  "going on",
  "what's wrong",
  "whats wrong",
  "bothering you",
  "symptom",
]

const MED_WORDS = [
  "medicine",
  "medication",
  "medicines",
  "taking anything",
  "take anything",
  "syrup",
  "pill",
  "pills",
  "puffer",
  "inhaler",
  "drops",
  "tablet",
  "give you",
  "gives you",
  "dose",
  "treatment at home",
]

const ALLERGY_WORDS = ["allerg"]

const PRIOR_WORDS = [
  "before",
  "happened before",
  "ever had",
  "last time",
  "used to",
  "in the past",
  "again",
  "history",
  "recur",
  "come back",
  "keep getting",
  "keeps happening",
  "another time",
]

function has(t: string, words: string[]): boolean {
  return words.some((w) => t.includes(w))
}

export function classifyQuestion(raw: string): QuestionIntent[] {
  const t = ` ${raw.toLowerCase()} `
  const intents: QuestionIntent[] = []
  if (has(t, ALLERGY_WORDS)) intents.push("allergy")
  if (has(t, MED_WORDS)) intents.push("medication")
  if (has(t, PRIOR_WORDS)) intents.push("prior_history")
  if (has(t, SYMPTOM_WORDS)) intents.push("symptom")
  if (intents.length === 0) intents.push("none")
  return intents
}

// A fact readily disclosed regardless of rapport: the active chief complaint
// (that's why the family came in). Everything else — resolved episodes, meds,
// allergies — is "sensitive/detailed" and needs rapport above threshold.
export function isReadilyDisclosed(fact: KeyFact): boolean {
  return fact.category === "condition" && / \(active\)$/.test(fact.fact)
}

function matchesIntent(fact: KeyFact, intents: QuestionIntent[]): boolean {
  const via = fact.elicit_via
  if (via.includes("symptom"))
    return intents.includes("symptom") || intents.includes("prior_history")
  if (via.includes("medication")) return intents.includes("medication")
  if (via.includes("allergy")) return intents.includes("allergy")
  return false
}

export interface EligibilityInput {
  utterance: string
  answerKey: AnswerKey
  disclosing: boolean
  alreadySurfaced: string[] // fact ids
}

// Which answer-key facts this doctor turn is entitled to elicit.
export function eligibleFacts(input: EligibilityInput): KeyFact[] {
  const intents = classifyQuestion(input.utterance)
  const t = input.utterance.toLowerCase()
  return input.answerKey.key_facts.filter((f) => {
    if (input.alreadySurfaced.includes(f.id)) return false
    if (!matchesIntent(f, intents)) return false

    // Resolved / historical conditions need an explicit "before / again /
    // has this happened" style probe, not just a generic symptom question.
    const isHistorical =
      f.category === "condition" && /\(resolved\)$/.test(f.fact)
    if (isHistorical && !intents.includes("prior_history")) return false

    if (isReadilyDisclosed(f)) return true
    return input.disclosing
  })
}

// Detects which answer-key facts a produced child/parent reply actually
// surfaced (used to verify LLM replies against the key). Keyword-net over the
// distinctive tokens of each fact.
const FACT_KEYWORDS: Record<string, string[]> = {
  condition_bronchitis: ["cough", "chest", "bronch", "cold in my chest"],
  medication_cough: [
    "syrup",
    "medicine",
    "purple medicine",
    "night medicine",
    "cough medicine",
    "dextromethorphan",
    "doxylamine",
  ],
}

export function detectSurfacedFacts(
  reply: string,
  eligible: KeyFact[],
): string[] {
  const t = reply.toLowerCase()
  const surfaced: string[] = []
  for (const f of eligible) {
    if (f.category === "condition" && /bronch/i.test(f.fact)) {
      if (FACT_KEYWORDS.condition_bronchitis.some((k) => t.includes(k)))
        surfaced.push(f.id)
    } else if (f.category === "medication") {
      if (FACT_KEYWORDS.medication_cough.some((k) => t.includes(k)))
        surfaced.push(f.id)
    } else if (f.category === "allergy") {
      if (t.includes("allerg")) surfaced.push(f.id)
    }
  }
  return surfaced
}
