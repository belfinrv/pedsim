// PedSim — scenario library. New scenario packages (from generate_scenario.py)
// register here; the Scenario Builder picks the best-fitting one for a config.

import type { ContentDomain, ScenarioPackage } from "../types"
import { respiratory0406b500 } from "./respiratory-0406b500"

export const SCENARIOS: ScenarioPackage[] = [respiratory0406b500]

export function getScenario(id: string): ScenarioPackage | undefined {
  return SCENARIOS.find((s) => s.manifest.scenario_id === id)
}

export function scenariosForDomain(domain: ContentDomain): ScenarioPackage[] {
  return SCENARIOS.filter((s) => s.manifest.config.content_domain === domain)
}

export const DEFAULT_SCENARIO_ID = respiratory0406b500.manifest.scenario_id
