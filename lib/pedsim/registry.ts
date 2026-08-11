// PedSim — content-domain, temperament and parent-style registry.
// Ported from generate_scenario.py so the browser-side Scenario Builder can
// derive a persona + answer-key shape from an educator config without needing
// the Java/Synthea backend running.

import type { ContentDomain, ParentStyle, Temperament } from "./types"

export interface DomainDef {
  label: string
  modules: string[]
  match_keywords: string[]
  abp_epa: string
  default_objectives: string[]
}

export const DOMAINS: Record<ContentDomain, DomainDef> = {
  respiratory: {
    label: "Respiratory (asthma / bronchitis)",
    modules: ["asthma", "bronchitis"],
    match_keywords: ["asthma", "bronchitis", "wheez", "respiratory"],
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    default_objectives: [
      "Elicit complete asthma/respiratory symptom history from a school-age child",
      "Build rapport with a shy child before asking sensitive questions",
      "Counsel child and parent on findings in age-appropriate language",
    ],
  },
  ent: {
    label: "ENT (otitis / sinusitis)",
    modules: ["ear_infections", "sinusitis"],
    match_keywords: ["otitis", "sinusitis", "ear"],
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    default_objectives: [
      "Elicit ear/sinus symptom history from a school-age child",
      "Build rapport before otoscopic examination",
      "Counsel on antibiotic stewardship in age-appropriate language",
    ],
  },
  behavioral_mental_health: {
    label: "Behavioral & mental health (ADHD / anxiety)",
    modules: ["attention_deficit_disorder"],
    match_keywords: ["attention", "adhd", "anxiety", "depress"],
    abp_epa: "EPA 3: Address behavioral and mental health concerns",
    default_objectives: [
      "Screen for attention and mood concerns in a school-age child",
      "Build a safe, non-judgmental space for a guarded child",
      "Counsel child and parent on next steps supportively",
    ],
  },
  allergy: {
    label: "Allergy (environmental / food)",
    modules: ["allergies", "food_allergies"],
    match_keywords: ["allerg"],
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    default_objectives: [
      "Elicit allergy and trigger history from a school-age child",
      "Build rapport with an anxious child",
      "Counsel on avoidance and action plans in age-appropriate language",
    ],
  },
}

export interface TemperamentDef {
  label: string
  style: string
  initial_rapport: number
  rapport_rules: string[]
  disclosure_threshold: number
}

export const TEMPERAMENTS: Record<Temperament, TemperamentDef> = {
  shy: {
    label: "Shy",
    style:
      "Gives short, quiet answers. Warms up only after rapport is built. " +
      "Looks to parent when unsure.",
    initial_rapport: 20,
    rapport_rules: [
      "+15 when doctor introduces themselves warmly and at eye level",
      "+10 when doctor uses the child's name or asks about interests",
      "+10 when doctor acknowledges feelings ('that sounds scary')",
      "-15 when doctor uses medical jargon without explaining",
      "-20 when doctor talks only to the parent for 3+ turns",
      "-10 when doctor rushes or interrupts",
    ],
    disclosure_threshold: 55,
  },
  chatty: {
    label: "Chatty",
    style:
      "Talkative and tangential. Volunteers irrelevant stories. " +
      "Needs gentle redirection without being shut down.",
    initial_rapport: 60,
    rapport_rules: [
      "+10 when doctor listens to a tangent briefly before redirecting kindly",
      "-15 when doctor cuts the child off abruptly",
      "-10 when doctor shows visible impatience",
    ],
    disclosure_threshold: 50,
  },
  defiant: {
    label: "Defiant",
    style:
      "Arms crossed, monosyllabic, mildly sarcastic. Tests whether the " +
      "doctor treats them with respect before cooperating.",
    initial_rapport: 10,
    rapport_rules: [
      "+15 when doctor treats the child as capable and asks permission",
      "+10 when doctor is honest about what will happen",
      "-20 when doctor is condescending or threatens ('or else')",
      "-15 when doctor sides with the parent against the child",
    ],
    disclosure_threshold: 60,
  },
}

export const PARENT_STYLES: Record<ParentStyle, string | null> = {
  anxious:
    "Interrupts with worried questions, catastrophizes mild findings, " +
    "needs calm reassurance without dismissal.",
  dismissive:
    "Minimizes the child's symptoms ('kids exaggerate'), pushes to leave " +
    "quickly. Doctor must validate the child without alienating the parent.",
  pushy:
    "Demands a specific treatment (e.g. antibiotics) regardless of " +
    "indication. Tests counseling under pressure.",
  supportive: "Calm, cooperative, lets the child speak.",
  absent: null,
}

export const PARENT_STYLE_LABELS: Record<ParentStyle, string> = {
  anxious: "Anxious",
  dismissive: "Dismissive",
  pushy: "Pushy",
  supportive: "Supportive",
  absent: "Absent",
}
