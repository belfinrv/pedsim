// PedSim — scoring endpoint. Runs the mechanical scorer always, and the rubric
// via the LLM when configured (falling back to the heuristic rubric).

import { NextResponse } from "next/server"
import { getScenario } from "@/lib/pedsim/scenarios"
import {
  assembleReport,
  buildRubricPrompt,
  parseRubricJson,
  scoreRubricHeuristic,
  type ScoreInput,
} from "@/lib/pedsim/scoring"
import { callAnthropic, llmAvailable } from "@/lib/pedsim/llm"
import type { RapportPoint, ReviewLogEntry, TranscriptTurn } from "@/lib/pedsim/types"

interface ScoreRequest {
  scenarioId: string
  transcript: TranscriptTurn[]
  reviewLog: ReviewLogEntry[]
  rapportTrace: RapportPoint[]
  factsSurfaced: string[]
}

export async function POST(req: Request) {
  let body: ScoreRequest
  try {
    body = (await req.json()) as ScoreRequest
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const scenario = getScenario(body.scenarioId)
  if (!scenario) {
    return NextResponse.json({ error: "unknown scenario" }, { status: 404 })
  }

  const input: ScoreInput = {
    scenarioId: body.scenarioId,
    persona: scenario.persona,
    answerKey: scenario.answer_key,
    transcript: body.transcript ?? [],
    reviewLog: body.reviewLog ?? [],
    rapportTrace: body.rapportTrace ?? [],
    factsSurfaced: body.factsSurfaced ?? [],
    // Timestamp is provided by the client to keep the route deterministic.
    now: Date.now(),
  }

  let rubric = scoreRubricHeuristic(input)
  let engine: "llm" | "heuristic" = "heuristic"

  if (llmAvailable()) {
    const { system, user } = buildRubricPrompt(input)
    const raw = await callAnthropic({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 900,
      temperature: 0.2,
    })
    const parsed = raw ? parseRubricJson(raw) : null
    if (parsed && parsed.length >= 4) {
      rubric = parsed
      engine = "llm"
    }
  }

  const report = assembleReport(input, rubric, engine)
  return NextResponse.json(report)
}
