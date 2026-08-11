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
  KeyFact,
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

// ── Deterministic child voice ─────────────────────────────────────────────

function factLine(fact: KeyFact, disclosing: boolean): string {
  if (fact.category === "condition" && /\(active\)/.test(fact.fact)) {
    return disclosing
      ? "Yeah... I've been coughing a lot, especially at night. My chest feels kinda tight and it hurts a little when I cough."
      : "*small cough* My chest feels yucky."
  }
  if (fact.category === "condition" && /\(resolved\)/.test(fact.fact)) {
    return "Um... I got sick like this last year too. I had a really bad cough and the doctor said it was in my chest."
  }
  if (fact.category === "medication") {
    return "Mommy gives me the purple medicine before bed. It tastes yucky but it helps me stop coughing so I can sleep."
  }
  if (fact.category === "allergy") {
    return "I can't have some stuff... it makes me itchy."
  }
  return "..."
}

function deterministicChild(
  utterance: string,
  ctx: TurnContext,
  comp: TurnComputation,
): { text: string; surfaced: string[] } {
  const s = analyzeUtterance(utterance, ctx.persona.child.name)
  const disclosing = comp.disclosing
  const surfaced: string[] = []

  if (comp.withdrawn) {
    return { text: "*stays quiet, looking down at the floor*", surfaced }
  }

  if (s.usesJargon) {
    return {
      text: "*glances at Mom, looking confused* ...I don't know what that word means.",
      surfaced,
    }
  }

  // Greeting / rapport-building openers.
  const isOpener =
    (s.warmGreeting || s.introducesSelf || s.asksInterests) &&
    comp.intents.includes("none")
  if (isOpener) {
    if (s.asksInterests) {
      return {
        text: disclosing
          ? "*small smile* I like dinosaurs... and Minecraft. I built a whole castle."
          : "*quietly* ...I like dinosaurs, I guess.",
        surfaced,
      }
    }
    if (s.acknowledgesFeelings) {
      return { text: "*nods a little* ...okay. Thank you.", surfaced }
    }
    return {
      text: disclosing ? "Hi. *small smile*" : "*quietly* ...hi. *looks at Mom*",
      surfaced,
    }
  }

  // Elicited facts.
  const eligible = comp.eligible
  if (eligible.length > 0) {
    // Surface at most one fact per turn, most-relevant first, to keep the
    // history-taking gradual and realistic.
    const ordered = [...eligible].sort((a, b) => {
      const ra = isReadilyDisclosed(a) ? 0 : 1
      const rb = isReadilyDisclosed(b) ? 0 : 1
      return ra - rb
    })
    const chosen = ordered[0]
    surfaced.push(chosen.id)
    let line = factLine(chosen, disclosing)
    if (!disclosing && !isReadilyDisclosed(chosen)) {
      // Sensitive fact but below threshold — withhold.
      surfaced.pop()
      line = "*shrugs* ...I don't really wanna talk about it."
    }
    return { text: line, surfaced }
  }

  // Doctor asked a question type with no matching key fact.
  if (comp.intents.includes("allergy")) {
    return { text: "No... I don't think I'm allergic to anything.", surfaced }
  }
  if (comp.intents.includes("medication") && !disclosing) {
    return { text: "*looks at Mom* ...um, I don't know.", surfaced }
  }
  if (comp.intents.includes("symptom")) {
    return {
      text: disclosing
        ? "I feel kind of tired, and coughing makes my throat sore."
        : "*quietly* ...I dunno. A little bad, I guess.",
      surfaced,
    }
  }

  // Counseling / closing.
  if (s.honestAboutPlan || /\b(you have|it'?s called|we'?ll give|you'?ll be)\b/.test(utterance.toLowerCase())) {
    return {
      text: disclosing
        ? "*nods* Okay. Will the medicine make my cough go away?"
        : "*nods slowly* ...okay.",
      surfaced,
    }
  }

  return {
    text: disclosing ? "Okay. *nods*" : "*looks down* ...um.",
    surfaced,
  }
}

function deterministicParent(
  ctx: TurnContext,
  comp: TurnComputation,
  doctorUtterance: string,
): string | null {
  if (!ctx.persona.parent.present) return null
  if (ctx.persona.parent.style !== "anxious") {
    // Minimal handling for other styles in the prototype.
    if (ctx.persona.parent.style === "pushy" && comp.intents.includes("symptom"))
      return "Mom: Shouldn't he just be on antibiotics, doctor? I don't want to wait around."
    if (ctx.persona.parent.style === "dismissive" && comp.intents.includes("symptom"))
      return "Mom: Honestly, I think he's fine — kids cough all the time. Can we make this quick?"
    return null
  }

  const u = doctorUtterance.toLowerCase()
  const reassured =
    /\b(don'?t worry|not serious|mild|common|he'?ll be (fine|okay)|nothing to worry|reassur|it'?s okay|good news)\b/.test(
      u,
    )
  if (reassured) {
    return "Mom: Oh... okay. Thank you, doctor. That makes me feel a little better."
  }
  if (comp.withdrawn) {
    return "Mom: He gets shy with new people — should I just answer for him?"
  }
  if (comp.intents.includes("medication")) {
    return "Mom: I've been giving him that cough syrup every night — that's okay, right? I read online it can be dangerous for little kids..."
  }
  if (comp.intents.includes("symptom") || comp.intents.includes("prior_history")) {
    return "Mom: Doctor, is it his lungs? My nephew ended up in the hospital with pneumonia. Should we be worried?"
  }
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
