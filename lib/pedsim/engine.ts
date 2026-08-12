// PedSim — scenario engine (turn loop).
//
// Per doctor turn:
//   update rapport (persona rules, deterministic)
//     -> decide disclosure (rapport vs threshold)
//     -> compute which answer-key facts are elicitable this turn
//     -> generate the child (and anxious parent) reply
//     -> record which facts the reply surfaced
//
// Two reply backends share the exact same rapport + fact bookkeeping:
//   • deterministic  — rule-based child voice, fully offline ($0, replayable)
//   • llm            — Anthropic completes the natural language, constrained to
//                      reveal only the facts the deterministic layer permits.
// Hard rules (never volunteer facts, never break character, clinical detail
// only from the chart) are enforced in both paths.

import { analyzeUtterance, clampRapport, evaluateRapport } from "./rapport"
import {
  classifyQuestion,
  detectSurfacedFacts,
  eligibleFacts,
  isReadilyDisclosed,
} from "./facts"
import type {
  AnswerKey,
  Chart,
  ChildDialogue,
  KeyFact,
  ParentDialogue,
  Persona,
  TranscriptTurn,
} from "./types"

export interface TurnContext {
  persona: Persona
  answerKey: AnswerKey
  chart: Chart
  transcript: TranscriptTurn[]
  rapport: number
  parentOnlyStreak: number
  alreadySurfaced: string[]
}

export interface TurnComputation {
  rapportDelta: number
  rapportAfter: number
  appliedRules: string[]
  disclosing: boolean
  parentOnlyStreak: number
  eligible: KeyFact[]
  intents: ReturnType<typeof classifyQuestion>
  withdrawn: boolean
}

// Deterministic bookkeeping shared by both backends.
export function computeTurn(
  utterance: string,
  ctx: TurnContext,
): TurnComputation {
  const { delta, appliedRules, parentOnlyStreak } = evaluateRapport(
    utterance,
    ctx.persona,
    ctx.parentOnlyStreak,
  )
  const rapportAfter = clampRapport(ctx.rapport + delta)
  const disclosing = rapportAfter >= ctx.persona.rapport.disclosure_threshold
  const eligible = eligibleFacts({
    utterance,
    answerKey: ctx.answerKey,
    disclosing,
    alreadySurfaced: ctx.alreadySurfaced,
  })
  const intents = classifyQuestion(utterance)
  const s = analyzeUtterance(utterance, ctx.persona.child.name)
  const withdrawn = parentOnlyStreak >= 3 || (s.parentDirected && !s.childDirected)
  return {
    rapportDelta: delta,
    rapportAfter,
    appliedRules,
    disclosing,
    parentOnlyStreak,
    eligible,
    intents,
    withdrawn,
  }
}

export interface TurnResult {
  childText: string
  parentText: string | null
  rapportDelta: number
  rapportAfter: number
  appliedRules: string[]
  factsSurfaced: string[]
  disclosing: boolean
  parentOnlyStreak: number
}

// ── Deterministic child voice (data-driven) ───────────────────────────────

// Respiratory-shy default; any scenario overrides via persona.dialogue.
const DEFAULT_CHILD_DIALOGUE: Required<ChildDialogue> = {
  greetingOpen: "Hi. *small smile*",
  greetingGuarded: "*quietly* ...hi. *looks at Mom*",
  interestsOpen:
    "*small smile* I like dinosaurs... and Minecraft. I built a whole castle.",
  interestsGuarded: "*quietly* ...I like dinosaurs, I guess.",
  feelingsAck: "*nods a little* ...okay. Thank you.",
  chiefOpen:
    "Yeah... I've been coughing a lot, especially at night. My chest feels kinda tight and it hurts a little when I cough.",
  chiefGuarded: "*small cough* My chest feels yucky.",
  priorEpisode:
    "Um... I got sick like this last year too. I had a really bad cough and the doctor said it was in my chest.",
  medication:
    "Mommy gives me the purple medicine before bed. It tastes yucky but it helps me stop coughing so I can sleep.",
  allergyFact: "I can't have some stuff... it makes me itchy.",
  noAllergy: "No... I don't think I'm allergic to anything.",
  genericSymptomOpen: "I feel kind of tired, and coughing makes my throat sore.",
  genericSymptomGuarded: "*quietly* ...I dunno. A little bad, I guess.",
  medicationUnknownGuarded: "*looks at Mom* ...um, I don't know.",
  counselingOpen: "*nods* Okay. Will the medicine make my cough go away?",
  counselingGuarded: "*nods slowly* ...okay.",
  withhold: "*shrugs* ...I don't really wanna talk about it.",
  withdrawn: "*stays quiet, looking down at the floor*",
  jargonConfused:
    "*glances at Mom, looking confused* ...I don't know what that word means.",
  fillerOpen: "Okay. *nods*",
  fillerGuarded: "*looks down* ...um.",
  facts: {},
}

// Parent lines carry no speaker prefix — the UI labels them from parent.label.
const DEFAULT_PARENT_DIALOGUE: Required<ParentDialogue> = {
  reassured: "Oh... okay. Thank you, doctor. That makes me feel a little better.",
  withdrawn: "He gets shy with new people — should I just answer for him?",
  medication:
    "I've been giving him that cough syrup every night — that's okay, right? I read online it can be dangerous for little kids...",
  symptom:
    "Doctor, is it his lungs? My nephew ended up in the hospital with pneumonia. Should we be worried?",
}

function dialogueFor(ctx: TurnContext): Required<ChildDialogue> {
  return { ...DEFAULT_CHILD_DIALOGUE, ...(ctx.persona.dialogue ?? {}) }
}

function factLine(
  fact: KeyFact,
  disclosing: boolean,
  D: Required<ChildDialogue>,
): string {
  // Per-fact override (scenarios with several distinct active conditions).
  const per = D.facts?.[fact.id]
  if (per) {
    return disclosing
      ? (per.open ?? per.guarded ?? "...")
      : (per.guarded ?? per.open ?? "...")
  }
  if (fact.category === "condition" && /\(active\)/.test(fact.fact)) {
    return disclosing ? D.chiefOpen : D.chiefGuarded
  }
  if (fact.category === "condition" && /\(resolved\)/.test(fact.fact)) {
    return D.priorEpisode
  }
  if (fact.category === "medication") return D.medication
  if (fact.category === "allergy") return D.allergyFact
  return "..."
}

function deterministicChild(
  utterance: string,
  ctx: TurnContext,
  comp: TurnComputation,
): { text: string; surfaced: string[] } {
  const s = analyzeUtterance(utterance, ctx.persona.child.name)
  const disclosing = comp.disclosing
  const D = dialogueFor(ctx)
  const surfaced: string[] = []

  if (comp.withdrawn) return { text: D.withdrawn, surfaced }
  if (s.usesJargon) return { text: D.jargonConfused, surfaced }

  // Greeting / rapport-building openers.
  const isOpener =
    (s.warmGreeting || s.introducesSelf || s.asksInterests) &&
    comp.intents.includes("none")
  if (isOpener) {
    if (s.asksInterests)
      return {
        text: disclosing ? D.interestsOpen : D.interestsGuarded,
        surfaced,
      }
    if (s.acknowledgesFeelings) return { text: D.feelingsAck, surfaced }
    return { text: disclosing ? D.greetingOpen : D.greetingGuarded, surfaced }
  }

  // Elicited facts (surface at most one per turn, chief complaint first).
  const eligible = comp.eligible
  if (eligible.length > 0) {
    const ordered = [...eligible].sort((a, b) => {
      const ra = isReadilyDisclosed(a) ? 0 : 1
      const rb = isReadilyDisclosed(b) ? 0 : 1
      return ra - rb
    })
    const chosen = ordered[0]
    surfaced.push(chosen.id)
    let line = factLine(chosen, disclosing, D)
    if (!disclosing && !isReadilyDisclosed(chosen)) {
      surfaced.pop() // sensitive fact, below threshold — withhold
      line = D.withhold
    }
    return { text: line, surfaced }
  }

  // Question type with no matching key fact.
  if (comp.intents.includes("allergy")) return { text: D.noAllergy, surfaced }
  if (comp.intents.includes("medication") && !disclosing)
    return { text: D.medicationUnknownGuarded, surfaced }
  if (comp.intents.includes("symptom"))
    return {
      text: disclosing ? D.genericSymptomOpen : D.genericSymptomGuarded,
      surfaced,
    }

  // Counseling / closing.
  if (
    s.honestAboutPlan ||
    /\b(you have|it'?s called|we'?ll give|you'?ll be)\b/.test(
      utterance.toLowerCase(),
    )
  )
    return {
      text: disclosing ? D.counselingOpen : D.counselingGuarded,
      surfaced,
    }

  return { text: disclosing ? D.fillerOpen : D.fillerGuarded, surfaced }
}

function deterministicParent(
  ctx: TurnContext,
  comp: TurnComputation,
  doctorUtterance: string,
): string | null {
  if (!ctx.persona.parent.present) return null
  const PD = { ...DEFAULT_PARENT_DIALOGUE, ...(ctx.persona.parent.dialogue ?? {}) }
  const pick = (line: string) => (line?.trim() ? line : null)

  const u = doctorUtterance.toLowerCase()
  const reassured =
    /\b(don'?t worry|not serious|mild|common|(he|she)'?ll be (fine|okay)|nothing to worry|reassur|it'?s okay|good news)\b/.test(
      u,
    )
  if (reassured) return pick(PD.reassured)
  if (comp.withdrawn) return pick(PD.withdrawn)
  if (comp.intents.includes("medication")) return pick(PD.medication)
  if (comp.intents.includes("symptom") || comp.intents.includes("prior_history"))
    return pick(PD.symptom)
  return null
}

export function runDeterministicTurn(
  utterance: string,
  ctx: TurnContext,
): TurnResult {
  const comp = computeTurn(utterance, ctx)
  const { text, surfaced } = deterministicChild(utterance, ctx, comp)
  const parentText = deterministicParent(ctx, comp, utterance)
  return {
    childText: text,
    parentText,
    rapportDelta: comp.rapportDelta,
    rapportAfter: comp.rapportAfter,
    appliedRules: comp.appliedRules,
    factsSurfaced: surfaced,
    disclosing: comp.disclosing,
    parentOnlyStreak: comp.parentOnlyStreak,
  }
}

// ── LLM prompt construction ───────────────────────────────────────────────

export function buildSystemPrompt(
  ctx: TurnContext,
  comp: TurnComputation,
): string {
  const p = ctx.persona
  const revealable = comp.eligible
    .filter((f) => isReadilyDisclosed(f) || comp.disclosing)
    .map((f) => `  - [${f.id}] ${f.fact}`)
  const chartFacts = ctx.answerKey.key_facts
    .map((f) => `  - [${f.id}] ${f.fact} (${f.category})`)
    .join("\n")

  return `You are role-playing a pediatric patient in a training simulation for doctors. Stay fully in character. This is synthetic; there is no real child.

CHILD:
  Name: ${p.child.name}
  Age: ${p.child.age}
  Temperament: ${p.child.temperament}
  Speaking style: ${p.child.speaking_style}
  Language level: ${p.child.language_level}

PARENT (${p.parent.present ? "present" : "absent"}):
  Style: ${p.parent.style}
  Behavior: ${p.parent.behavior ?? "n/a"}

CURRENT RAPPORT STATE:
  Rapport score: ${comp.rapportAfter} / 100 (disclosure threshold ${p.rapport.disclosure_threshold})
  Child is currently ${comp.disclosing ? "ABOVE threshold — open, willing to share detail" : "BELOW threshold — guarded, gives minimal answers, looks to parent"}

CLINICAL FACTS (the ground truth — invent nothing beyond these):
${chartFacts}

FACTS YOU MAY REVEAL THIS TURN (only if the doctor's question genuinely asks for them):
${revealable.length ? revealable.join("\n") : "  (none — do not reveal any key clinical facts this turn)"}

HARD RULES:
${p.hard_rules.map((r) => `  - ${r}`).join("\n")}
  - Reveal ONLY facts listed as revealable this turn. Never volunteer other facts.
  - Speak like a real ${p.child.age}-year-old. Short sentences. No medical words.
  - If below threshold, keep answers minimal and defer to the parent.

OUTPUT FORMAT (exactly two lines):
CHILD: <the child's spoken reply, in character>
PARENT: <the parent's reply if they would interject this turn, otherwise the single word NONE>`
}

export function buildMessages(
  ctx: TurnContext,
  utterance: string,
): { role: "user" | "assistant"; content: string }[] {
  const msgs: { role: "user" | "assistant"; content: string }[] = []
  for (const t of ctx.transcript) {
    if (t.speaker === "doctor") {
      msgs.push({ role: "user", content: `DOCTOR: ${t.text}` })
    } else if (t.speaker === "child" || t.speaker === "parent") {
      const label = t.speaker === "child" ? "CHILD" : "PARENT"
      const last = msgs[msgs.length - 1]
      if (last && last.role === "assistant") {
        last.content += `\n${label}: ${t.text}`
      } else {
        msgs.push({ role: "assistant", content: `${label}: ${t.text}` })
      }
    }
  }
  msgs.push({ role: "user", content: `DOCTOR: ${utterance}` })
  return msgs
}

export function parseLlmReply(raw: string): {
  child: string
  parent: string | null
} {
  const childMatch = raw.match(/CHILD:\s*([\s\S]*?)(?:\nPARENT:|$)/i)
  const parentMatch = raw.match(/PARENT:\s*([\s\S]*)$/i)
  const child = (childMatch?.[1] ?? raw).trim()
  let parent: string | null = parentMatch?.[1]?.trim() ?? null
  if (parent && /^none$/i.test(parent)) parent = null
  return { child, parent }
}

export { detectSurfacedFacts }
