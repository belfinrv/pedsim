"use client"

// PedSim — client-side exam state, shared across the four screens and
// persisted to sessionStorage so a candidate can move Builder -> Chart ->
// Encounter -> Report without a backend session store. Everything logged here
// (tab dwell, every turn, rapport at each step) is the replayable audit trail
// described in ARCHITECTURE.md §4.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DEFAULT_SCENARIO_ID, getScenario } from "@/lib/pedsim/scenarios"
import type {
  RapportPoint,
  ReviewLogEntry,
  ScenarioPackage,
  ScoreReport,
  TranscriptTurn,
} from "@/lib/pedsim/types"

interface PedSimState {
  scenarioId: string
  reviewLog: ReviewLogEntry[]
  transcript: TranscriptTurn[]
  rapport: number
  rapportTrace: RapportPoint[]
  factsSurfaced: string[]
  parentOnlyStreak: number
  startedAt: number | null
  endedAt: number | null
  report: ScoreReport | null
}

interface PedSimContextValue extends PedSimState {
  scenario: ScenarioPackage
  selectScenario: (id: string) => void
  logTab: (tab: string, dwellMs: number) => void
  beginEncounter: () => void
  appendTurns: (turns: TranscriptTurn[]) => void
  applyTurnResult: (r: {
    rapportAfter: number
    factsSurfaced: string[]
    parentOnlyStreak: number
  }) => void
  endEncounter: () => void
  setReport: (r: ScoreReport | null) => void
  resetEncounter: () => void
  resetAll: () => void
}

const STORAGE_KEY = "pedsim.state.v1"

function initialState(scenarioId: string): PedSimState {
  const scenario = getScenario(scenarioId)!
  return {
    scenarioId,
    reviewLog: [],
    transcript: [],
    rapport: scenario.persona.rapport.initial,
    rapportTrace: [{ turn: 0, score: scenario.persona.rapport.initial }],
    factsSurfaced: [],
    parentOnlyStreak: 0,
    startedAt: null,
    endedAt: null,
    report: null,
  }
}

const PedSimContext = createContext<PedSimContextValue | null>(null)

export function PedSimProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PedSimState>(() =>
    initialState(DEFAULT_SCENARIO_ID),
  )
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PedSimState
        if (getScenario(parsed.scenarioId)) setState(parsed)
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state, hydrated])

  const scenario = getScenario(state.scenarioId)!

  const selectScenario = useCallback((id: string) => {
    if (!getScenario(id)) return
    setState(initialState(id))
  }, [])

  const logTab = useCallback((tab: string, dwellMs: number) => {
    if (dwellMs < 200) return // ignore incidental flicks
    setState((s) => ({
      ...s,
      reviewLog: [...s.reviewLog, { tab, openedAt: Date.now(), dwellMs }],
    }))
  }, [])

  const beginEncounter = useCallback(() => {
    setState((s) => ({
      ...s,
      startedAt: s.startedAt ?? Date.now(),
    }))
  }, [])

  const appendTurns = useCallback((turns: TranscriptTurn[]) => {
    setState((s) => {
      const transcript = [...s.transcript, ...turns]
      // Recompute rapport trace from doctor turns that carry rapportAfter.
      const trace: RapportPoint[] = [
        { turn: 0, score: scenarioInitial(s.scenarioId) },
      ]
      let turnNo = 0
      for (const t of transcript) {
        if (t.speaker === "doctor" && typeof t.rapportAfter === "number") {
          turnNo++
          trace.push({ turn: turnNo, score: t.rapportAfter })
        }
      }
      return { ...s, transcript, rapportTrace: trace }
    })
  }, [])

  const applyTurnResult = useCallback(
    (r: {
      rapportAfter: number
      factsSurfaced: string[]
      parentOnlyStreak: number
    }) => {
      setState((s) => {
        const factsSurfaced = Array.from(
          new Set([...s.factsSurfaced, ...r.factsSurfaced]),
        )
        return {
          ...s,
          rapport: r.rapportAfter,
          factsSurfaced,
          parentOnlyStreak: r.parentOnlyStreak,
        }
      })
    },
    [],
  )

  const endEncounter = useCallback(() => {
    setState((s) => ({ ...s, endedAt: Date.now() }))
  }, [])

  const setReport = useCallback((report: ScoreReport | null) => {
    setState((s) => ({ ...s, report }))
  }, [])

  const resetEncounter = useCallback(() => {
    setState((s) => {
      const init = initialState(s.scenarioId)
      return { ...init, reviewLog: s.reviewLog }
    })
  }, [])

  const resetAll = useCallback(() => {
    setState((s) => initialState(s.scenarioId))
  }, [])

  const value = useMemo<PedSimContextValue>(
    () => ({
      ...state,
      scenario,
      selectScenario,
      logTab,
      beginEncounter,
      appendTurns,
      applyTurnResult,
      endEncounter,
      setReport,
      resetEncounter,
      resetAll,
    }),
    [
      state,
      scenario,
      selectScenario,
      logTab,
      beginEncounter,
      appendTurns,
      applyTurnResult,
      endEncounter,
      setReport,
      resetEncounter,
      resetAll,
    ],
  )

  return (
    <PedSimContext.Provider value={value}>{children}</PedSimContext.Provider>
  )
}

function scenarioInitial(id: string): number {
  return getScenario(id)?.persona.rapport.initial ?? 20
}

export function usePedSim(): PedSimContextValue {
  const ctx = useContext(PedSimContext)
  if (!ctx) throw new Error("usePedSim must be used within PedSimProvider")
  return ctx
}
