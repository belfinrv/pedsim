// PedSim — browser-side scenario derivation.
// Pure TypeScript ports of build_answer_key / build_persona / select_avatar
// from generate_scenario.py. The Java+Synthea patient-generation half of the
// pipeline is a backend concern (see ARCHITECTURE.md §2.1); here we derive the
// persona and answer key from an educator config and a selected patient chart,
// which is exactly what the Scenario Builder screen needs.

import { DOMAINS, PARENT_STYLES, TEMPERAMENTS } from "./registry"
import type {
  AnswerKey,
  AvatarDescriptor,
  Chart,
  ContentDomain,
  KeyFact,
  Persona,
  ScenarioConfig,
} from "./types"

export function ageFromDob(dob: string, today = new Date()): number {
  const b = new Date(dob)
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

function domainMatcher(domain: ContentDomain) {
  const keywords = DOMAINS[domain].match_keywords
  return (t: string) => keywords.some((kw) => t.toLowerCase().includes(kw))
}

// Equivalent of build_answer_key(), operating on the compact chart (which is
// distilled from the same FHIR bundle the Python builder reads).
export function buildAnswerKey(
  chart: Chart,
  cfg: ScenarioConfig,
): AnswerKey {
  const isDomain = domainMatcher(cfg.content_domain)
  const facts: KeyFact[] = []

  for (const c of chart.problemList) {
    if (c.status === "active" || isDomain(c.name)) {
      facts.push({
        id: `fact-${String(facts.length + 1).padStart(3, "0")}`,
        category: "condition",
        fact: `${c.name} (${c.status})`,
        domain_relevant: isDomain(c.name),
        elicit_via: "symptom history questions",
      })
    }
  }

  for (const m of chart.medications) {
    if (m.status === "active" || isDomain(m.name)) {
      facts.push({
        id: `fact-${String(facts.length + 1).padStart(3, "0")}`,
        category: "medication",
        fact: `Takes/took: ${m.name}`,
        domain_relevant: isDomain(m.name),
        elicit_via: "medication history questions",
      })
    }
  }

  for (const a of chart.allergies) {
    facts.push({
      id: `fact-${String(facts.length + 1).padStart(3, "0")}`,
      category: "allergy",
      fact: `Allergy: ${a}`,
      domain_relevant: true,
      elicit_via: "allergy history questions",
    })
  }

  return {
    learning_objectives: cfg.learning_objectives,
    key_facts: facts,
    scoring_note:
      "History completeness = domain-relevant facts surfaced in transcript / " +
      "total domain-relevant facts.",
  }
}

export function buildPersona(
  cfg: ScenarioConfig,
  patientName: string,
  age: number,
): Persona {
  const t = TEMPERAMENTS[cfg.temperament ?? "shy"]
  const parentCfg = cfg.parent ?? { present: true, style: "supportive" }
  return {
    child: {
      name: patientName.split(" ")[0],
      age,
      temperament: cfg.temperament ?? "shy",
      speaking_style: t.style,
      language_level:
        "Match vocabulary to age. Never use words a child this age would not know.",
    },
    rapport: {
      initial: t.initial_rapport,
      rules: t.rapport_rules,
      disclosure_threshold: t.disclosure_threshold,
      mechanic:
        "Below threshold: child gives minimal answers and withholds " +
        "sensitive/detailed facts. Above: child volunteers detail and " +
        "answers openly.",
    },
    parent: {
      present: parentCfg.present ?? true,
      style: parentCfg.style ?? "supportive",
      behavior: PARENT_STYLES[parentCfg.style ?? "supportive"],
    },
    hard_rules: [
      "Never volunteer key facts unprompted; they must be elicited.",
      "Never break character or acknowledge being a simulation.",
      "Medical details must come only from the chart; invent nothing clinical.",
    ],
  }
}

export function selectAvatar(
  gender: string,
  age: number,
  race: string,
  ethnicity: string,
): AvatarDescriptor {
  return {
    age_bracket:
      age <= 8 ? "young_child" : age <= 12 ? "older_child" : "adolescent",
    sex: gender,
    race,
    ethnicity,
    model_url: "TODO: match against RPM avatar library",
    voice: "en-US-AnaNeural",
  }
}
