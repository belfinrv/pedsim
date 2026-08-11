// PedSim — rapport state machine.
// The doctor's communication *mechanically* moves a rapport score; below the
// disclosure threshold the child withholds detail, above it they open up
// (ARCHITECTURE.md §2.5). Rapport is computed deterministically from the
// persona rules — never delegated to the LLM — so scoring is defensible and
// every encounter is replayable.

import type { Persona, Temperament } from "./types"

export interface UtteranceSignals {
  introducesSelf: boolean
  warmGreeting: boolean
  usesChildName: boolean
  asksInterests: boolean
  acknowledgesFeelings: boolean
  usesJargon: boolean
  jargonTerms: string[]
  parentDirected: boolean
  childDirected: boolean
  rushesOrInterrupts: boolean
  condescending: boolean
  asksPermission: boolean
  honestAboutPlan: boolean
  sidesWithParent: boolean
  listensToTangent: boolean
  cutsOff: boolean
}

const JARGON = [
  "spirometry",
  "bronchodilator",
  "bronchodilation",
  "nebulizer",
  "nebulized",
  "auscultation",
  "auscultate",
  "exacerbation",
  "wheezing on exam",
  "expiratory",
  "tachypnea",
  "tachypneic",
  "retractions",
  "peak flow",
  "peak expiratory",
  "pulse oximetry",
  "saturation",
  "differential diagnosis",
  "etiology",
  "bilateral",
  "rales",
  "rhonchi",
  "corticosteroid",
  "albuterol",
  "prophylaxis",
  "comorbid",
]

const INTEREST_WORDS = [
  "favorite",
  "favourite",
  "like to",
  "do you like",
  "hobby",
  "hobbies",
  "school",
  "grade",
  "play",
  "game",
  "games",
  "sport",
  "fun",
  "pet",
  "dog",
  "cat",
  "cartoon",
  "show",
  "toy",
  "friend",
  "weekend",
  "summer",
]

const FEELING_WORDS = [
  "that sounds",
  "i understand",
  "i know it",
  "it's okay",
  "its okay",
  "it is okay",
  "you're being brave",
  "youre being brave",
  "so brave",
  "must be",
  "i'm sorry you",
  "im sorry you",
  "scary",
  "no rush",
  "take your time",
  "it's alright",
  "not your fault",
  "you're safe",
  "youre safe",
]

const PARENT_WORDS = [
  "mom",
  "mum",
  "dad",
  "ma'am",
  "maam",
  "sir",
  "mrs",
  "mr ",
  "your son",
  "your child",
  "his ",
  "he's ",
  "he has",
  "does he",
  "has he",
]

const PERMISSION_WORDS = [
  "is it okay if",
  "is it ok if",
  "can i",
  "may i",
  "would it be alright",
  "would that be okay",
  "would that be ok",
  "do you mind if",
  "if that's okay",
  "if thats okay",
  "is that alright",
]

const CONDESCENDING = [
  "good boy",
  "good girl",
  "or else",
  "be a big boy",
  "be a big girl",
  "now listen here",
  "stop being",
  "don't be a baby",
  "dont be a baby",
  "because i said",
]

const PLAN_WORDS = [
  "i'm going to",
  "im going to",
  "what i'll do",
  "what ill do",
  "here's what",
  "heres what",
  "this will",
  "you'll feel",
  "youll feel",
  "next i will",
  "i will listen",
  "let me explain",
  "i'd like to check",
  "id like to check",
]

function has(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n))
}

export function analyzeUtterance(
  raw: string,
  childName: string,
): UtteranceSignals {
  const t = ` ${raw.toLowerCase().trim()} `
  const name = childName.toLowerCase()

  const jargonTerms = JARGON.filter((j) => t.includes(j))
  // Jargon "explained" if the doctor immediately defines it in kid terms.
  const explained =
    /\bmeans\b|\bthat'?s when\b|\bwhich is\b|\blike a\b|\bkind of like\b/.test(t)

  const introducesSelf =
    /\b(i'?m|i am|my name is|this is)\b/.test(t) &&
    /\b(dr|doctor|nurse)\b/.test(t)
  const warmGreeting =
    /\b(hi|hey|hello|nice to meet|good morning|good afternoon)\b/.test(t)
  const usesChildName = name.length > 1 && t.includes(` ${name}`)
  const asksInterests = has(t, INTEREST_WORDS) && t.includes("?")
  const acknowledgesFeelings = has(t, FEELING_WORDS)

  const parentDirected = has(t, PARENT_WORDS)
  const childDirected =
    usesChildName ||
    /\byou\b|\byour\b/.test(t) ||
    warmGreeting ||
    asksInterests
  const rushesOrInterrupts =
    /\b(quickly|hurry|hurry up|just tell me|let me stop you|we don'?t have time|come on|spit it out)\b/.test(
      t,
    ) || (raw.trim().split("?").length - 1 >= 3)
  const condescending = has(t, CONDESCENDING)
  const asksPermission = has(t, PERMISSION_WORDS)
  const honestAboutPlan = has(t, PLAN_WORDS)
  const sidesWithParent =
    parentDirected &&
    /\b(you're right|youre right|i agree|exactly|kids do exaggerate|he's fine|hes fine)\b/.test(
      t,
    )
  const listensToTangent =
    /\b(that sounds fun|cool|neat|tell me more|really|wow|awesome)\b/.test(t)
  const cutsOff =
    /\b(anyway|moving on|enough|let'?s focus|stop|that'?s enough)\b/.test(t)

  return {
    introducesSelf,
    warmGreeting,
    usesChildName,
    asksInterests,
    acknowledgesFeelings,
    usesJargon: jargonTerms.length > 0 && !explained,
    jargonTerms,
    parentDirected,
    childDirected,
    rushesOrInterrupts,
    condescending,
    asksPermission,
    honestAboutPlan,
    sidesWithParent,
    listensToTangent,
    cutsOff,
  }
}

export interface RapportEval {
  delta: number
  appliedRules: string[]
  parentOnlyStreak: number
}

// Applies the persona's temperament-specific rapport rules to one doctor turn.
// `parentOnlyStreak` carries the count of consecutive parent-directed turns so
// the shy "-20 when doctor talks only to the parent for 3+ turns" rule can fire.
export function evaluateRapport(
  utterance: string,
  persona: Persona,
  prevParentOnlyStreak: number,
): RapportEval {
  const s = analyzeUtterance(utterance, persona.child.name)
  const temperament: Temperament = persona.child.temperament
  const applied: string[] = []
  let delta = 0

  const streak =
    s.parentDirected && !s.childDirected ? prevParentOnlyStreak + 1 : 0

  const fire = (rule: string, points: number) => {
    applied.push(rule)
    delta += points
  }

  if (temperament === "shy") {
    if (s.introducesSelf && s.warmGreeting)
      fire("+15 when doctor introduces themselves warmly and at eye level", 15)
    if (s.usesChildName || s.asksInterests)
      fire("+10 when doctor uses the child's name or asks about interests", 10)
    if (s.acknowledgesFeelings)
      fire("+10 when doctor acknowledges feelings ('that sounds scary')", 10)
    if (s.usesJargon)
      fire("-15 when doctor uses medical jargon without explaining", -15)
    if (streak >= 3)
      fire("-20 when doctor talks only to the parent for 3+ turns", -20)
    if (s.rushesOrInterrupts)
      fire("-10 when doctor rushes or interrupts", -10)
  } else if (temperament === "chatty") {
    if (s.listensToTangent)
      fire(
        "+10 when doctor listens to a tangent briefly before redirecting kindly",
        10,
      )
    if (s.cutsOff) fire("-15 when doctor cuts the child off abruptly", -15)
    if (s.rushesOrInterrupts)
      fire("-10 when doctor shows visible impatience", -10)
  } else if (temperament === "defiant") {
    if (s.asksPermission)
      fire("+15 when doctor treats the child as capable and asks permission", 15)
    if (s.honestAboutPlan)
      fire("+10 when doctor is honest about what will happen", 10)
    if (s.condescending)
      fire("-20 when doctor is condescending or threatens ('or else')", -20)
    if (s.sidesWithParent)
      fire("-15 when doctor sides with the parent against the child", -15)
  }

  return { delta, appliedRules: applied, parentOnlyStreak: streak }
}

export function clampRapport(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}
