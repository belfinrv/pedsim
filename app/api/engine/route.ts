// PedSim — scenario engine turn endpoint.
// Stateless: the client sends the full encounter state each turn, the server
// computes rapport + fact bookkeeping deterministically, and generates the
// child/parent reply via the LLM (if configured) or the rule-based fallback.

import { NextResponse } from "next/server"
import { getScenario } from "@/lib/pedsim/scenarios"
import {
  buildMessages,
  buildSystemPrompt,
  computeTurn,
  detectSurfacedFacts,
  parseLlmReply,
  runDeterministicTurn,
  type TurnContext,
} from "@/lib/pedsim/engine"
import { isReadilyDisclosed } from "@/lib/pedsim/facts"
import { callAnthropic, llmAvailable } from "@/lib/pedsim/llm"
import type { TranscriptTurn } from "@/lib/pedsim/types"

interface EngineRequest {
  scenarioId: string
  utterance: string
  transcript: TranscriptTurn[]
  rapport: number
  parentOnlyStreak: number
  alreadySurfaced: string[]
}

export async function POST(req: Request) {
  let body: EngineRequest
  try {
    body = (await req.json()) as EngineRequest
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const scenario = getScenario(body.scenarioId)
  if (!scenario) {
    return NextResponse.json({ error: "unknown scenario" }, { status: 404 })
  }
  if (!body.utterance?.trim()) {
    return NextResponse.json({ error: "empty utterance" }, { status: 400 })
  }

  const ctx: TurnContext = {
    persona: scenario.persona,
    answerKey: scenario.answer_key,
    chart: scenario.chart,
    transcript: body.transcript ?? [],
    rapport: body.rapport ?? scenario.persona.rapport.initial,
    parentOnlyStreak: body.parentOnlyStreak ?? 0,
    alreadySurfaced: body.alreadySurfaced ?? [],
  }

  // Try the LLM path; fall back to deterministic on any miss.
  if (llmAvailable()) {
    const comp = computeTurn(body.utterance, ctx)
    const system = buildSystemPrompt(ctx, comp)
    const messages = buildMessages(ctx, body.utterance)
    const raw = await callAnthropic({ system, messages, maxTokens: 350 })
    if (raw) {
      const { child, parent } = parseLlmReply(raw)
      const revealable = comp.eligible.filter(
        (f) => isReadilyDisclosed(f) || comp.disclosing,
      )
      // Verify against the answer key: only count facts the reply truly stated.
      const surfaced = detectSurfacedFacts(
        `${child} ${parent ?? ""}`,
        revealable,
      )
      return NextResponse.json({
        engine: "llm",
        childText: child,
        parentText: parent,
        rapportDelta: comp.rapportDelta,
        rapportAfter: comp.rapportAfter,
        appliedRules: comp.appliedRules,
        factsSurfaced: surfaced,
        disclosing: comp.disclosing,
        parentOnlyStreak: comp.parentOnlyStreak,
      })
    }
  }

  const result = runDeterministicTurn(body.utterance, ctx)
  return NextResponse.json({ engine: "heuristic", ...result })
}
