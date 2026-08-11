// PedSim — seed scenario: respiratory-0406b500 (Ed Rempel, 7 y/o).
//
// manifest / persona / answer_key are the exact artifacts emitted by
// generate_scenario.py for seed 779909 (as supplied). The chart below is a
// hand-authored, age-coherent stand-in for the compact chart.json that
// extract_chart.py would distill from the full FHIR bundle — every entry is
// consistent with the manifest demographics and the answer-key problem list.
// SYNTHETIC DATA ONLY — no real patient, ever (ARCHITECTURE.md §4).

import type { ScenarioPackage } from "../types"

export const respiratory0406b500: ScenarioPackage = {
  manifest: {
    scenario_id: "respiratory-0406b500",
    seed: 779909,
    config: {
      content_domain: "respiratory",
      learning_objectives: [
        "Elicit complete asthma/respiratory symptom history from a school-age child",
        "Build rapport with a shy child before asking sensitive questions",
        "Counsel child and parent on findings in age-appropriate language",
      ],
      age_range: [6, 10],
      temperament: "shy",
      parent: { present: true, style: "anxious" },
      location: { state: "North Carolina", city: "Charlotte" },
      batch_size: 40,
      seed: null,
    },
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    patient: {
      id: "546cbf58-9dfe-9dfa-823b-3b34024075df",
      name: "Ed Rempel",
      birthDate: "2019-01-02",
      gender: "male",
      mrn: "546cbf58-9dfe-9dfa-823b-3b34024075df",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "White",
      ethnicity: "Not Hispanic or Latino",
    },
  },

  answer_key: {
    learning_objectives: [
      "Elicit complete asthma/respiratory symptom history from a school-age child",
      "Build rapport with a shy child before asking sensitive questions",
      "Counsel child and parent on findings in age-appropriate language",
    ],
    key_facts: [
      {
        id: "fact-001",
        category: "condition",
        fact: "Acute bronchitis (disorder) (resolved)",
        domain_relevant: true,
        elicit_via: "symptom history questions",
      },
      {
        id: "fact-002",
        category: "condition",
        fact: "Acute bronchitis (disorder) (active)",
        domain_relevant: true,
        elicit_via: "symptom history questions",
      },
      {
        id: "fact-003",
        category: "medication",
        fact: "Takes/took: Acetaminophen 21.7 MG/ML / Dextromethorphan Hydrobromide 1 MG/ML / doxylamine succinate 0.417 MG/ML Oral Solution",
        domain_relevant: false,
        elicit_via: "medication history questions",
      },
    ],
    scoring_note:
      "History completeness = domain-relevant facts surfaced in transcript / total domain-relevant facts.",
  },

  persona: {
    child: {
      name: "Ed",
      age: 7,
      temperament: "shy",
      speaking_style:
        "Gives short, quiet answers. Warms up only after rapport is built. Looks to parent when unsure.",
      language_level:
        "Match vocabulary to age. Never use words a child this age would not know.",
    },
    rapport: {
      initial: 20,
      rules: [
        "+15 when doctor introduces themselves warmly and at eye level",
        "+10 when doctor uses the child's name or asks about interests",
        "+10 when doctor acknowledges feelings ('that sounds scary')",
        "-15 when doctor uses medical jargon without explaining",
        "-20 when doctor talks only to the parent for 3+ turns",
        "-10 when doctor rushes or interrupts",
      ],
      disclosure_threshold: 55,
      mechanic:
        "Below threshold: child gives minimal answers and withholds sensitive/detailed facts. Above: child volunteers detail and answers openly.",
    },
    parent: {
      present: true,
      style: "anxious",
      behavior:
        "Interrupts with worried questions, catastrophizes mild findings, needs calm reassurance without dismissal.",
    },
    hard_rules: [
      "Never volunteer key facts unprompted; they must be elicited.",
      "Never break character or acknowledge being a simulation.",
      "Medical details must come only from the chart; invent nothing clinical.",
    ],
  },

  avatar: {
    age_bracket: "young_child",
    sex: "male",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    model_url: "TODO: match against RPM avatar library",
    voice: "en-US-AnaNeural",
  },

  chart: {
    demographics: {
      id: "546cbf58-9dfe-9dfa-823b-3b34024075df",
      name: "Ed Rempel",
      birthDate: "2019-01-02",
      gender: "male",
      mrn: "546cbf58-9dfe-9dfa-823b-3b34024075df",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "White",
      ethnicity: "Not Hispanic or Latino",
    },
    problemList: [
      {
        name: "Acute bronchitis (disorder)",
        code: "10509002",
        status: "active",
        onset: "2026-07-28",
      },
      {
        name: "Acute bronchitis (disorder)",
        code: "10509002",
        status: "resolved",
        onset: "2025-02-11",
        abatement: "2025-03-02",
      },
      {
        name: "Otitis media (disorder)",
        code: "65363002",
        status: "resolved",
        onset: "2022-11-03",
        abatement: "2022-11-20",
      },
    ],
    medications: [
      {
        name: "Acetaminophen 21.7 MG/ML / Dextromethorphan Hydrobromide 1 MG/ML / doxylamine succinate 0.417 MG/ML Oral Solution",
        status: "active",
        authoredOn: "2026-07-28",
        reason: "Acute bronchitis (disorder)",
      },
      {
        name: "Acetaminophen 160 MG Chewable Tablet",
        status: "completed",
        authoredOn: "2025-02-11",
        reason: "Fever",
      },
    ],
    immunizations: [
      { vaccine: "Hep B, adult", date: "2019-01-02" },
      { vaccine: "DTaP", date: "2019-03-06" },
      { vaccine: "Hib (PRP-OMP)", date: "2019-03-06" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2019-03-06" },
      { vaccine: "Rotavirus, monovalent", date: "2019-03-06" },
      { vaccine: "IPV", date: "2019-03-06" },
      { vaccine: "DTaP", date: "2019-05-08" },
      { vaccine: "Hib (PRP-OMP)", date: "2019-05-08" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2019-05-08" },
      { vaccine: "IPV", date: "2019-05-08" },
      { vaccine: "DTaP", date: "2019-07-10" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2019-07-10" },
      { vaccine: "Hep B, adult", date: "2019-07-10" },
      { vaccine: "MMR", date: "2020-01-08" },
      { vaccine: "Varicella", date: "2020-01-08" },
      { vaccine: "Hib (PRP-OMP)", date: "2020-01-08" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2020-01-08" },
      { vaccine: "Hep A, ped/adol, 2 dose", date: "2020-01-08" },
      { vaccine: "DTaP", date: "2020-04-15" },
      { vaccine: "Hep A, ped/adol, 2 dose", date: "2020-07-15" },
      { vaccine: "Influenza, seasonal, injectable", date: "2023-10-04" },
      { vaccine: "Influenza, seasonal, injectable", date: "2024-10-09" },
      { vaccine: "DTaP", date: "2024-02-14" },
      { vaccine: "IPV", date: "2024-02-14" },
      { vaccine: "MMR", date: "2024-02-14" },
      { vaccine: "Varicella", date: "2024-02-14" },
      { vaccine: "Influenza, seasonal, injectable", date: "2025-10-08" },
    ],
    encounters: [
      {
        date: "2026-07-28",
        type: "Urgent care",
        reason: "Cough and low-grade fever — acute bronchitis",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2025-10-08",
        type: "Well child visit",
        reason: "Routine 6-year check + flu vaccine",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2025-02-11",
        type: "Office visit",
        reason: "Cough and fever — acute bronchitis (resolved)",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2024-02-14",
        type: "Well child visit",
        reason: "Routine 5-year check + kindergarten boosters",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2022-11-03",
        type: "Office visit",
        reason: "Ear pain — otitis media (resolved)",
        provider: "Charlotte Pediatric Clinic",
      },
    ],
    vitals: [
      { date: "2019-01-02", ageMonths: 0, heightCm: 50, weightKg: 3.4 },
      { date: "2019-03-06", ageMonths: 2, heightCm: 58, weightKg: 5.6 },
      { date: "2019-07-10", ageMonths: 6, heightCm: 67, weightKg: 7.8 },
      { date: "2020-01-08", ageMonths: 12, heightCm: 76, weightKg: 9.7 },
      { date: "2021-01-06", ageMonths: 24, heightCm: 87, weightKg: 12.2 },
      { date: "2022-01-05", ageMonths: 36, heightCm: 95, weightKg: 14.3 },
      { date: "2023-01-04", ageMonths: 48, heightCm: 102, weightKg: 16.3 },
      { date: "2024-02-14", ageMonths: 61, heightCm: 110, weightKg: 18.6 },
      { date: "2025-10-08", ageMonths: 81, heightCm: 121, weightKg: 22.4 },
      {
        date: "2026-07-28",
        ageMonths: 90,
        heightCm: 124,
        weightKg: 23.6,
        bmi: 15.3,
        tempC: 37.9,
        hr: 104,
        rr: 24,
        spo2: 97,
      },
    ],
    labs: [
      {
        date: "2026-07-28",
        name: "Respiratory rate",
        value: "24",
        unit: "/min",
        flag: "normal",
      },
      {
        date: "2026-07-28",
        name: "Oxygen saturation (SpO2)",
        value: "97",
        unit: "%",
        flag: "normal",
      },
      {
        date: "2026-07-28",
        name: "Body temperature",
        value: "37.9",
        unit: "°C",
        flag: "high",
      },
      {
        date: "2025-10-08",
        name: "Peak expiratory flow",
        value: "180",
        unit: "L/min",
        flag: "normal",
      },
    ],
    careTeam: [
      { name: "Dr. Maria Alvarez, MD", role: "Primary care pediatrician" },
      { name: "Charlotte Pediatric Clinic", role: "Care organization" },
    ],
    allergies: [],
  },
}
