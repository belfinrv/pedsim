// PedSim — scenario: allergy-3c9f0d21 (Leo Nguyen, 8 y/o).
// Environmental + food allergy, a CHATTY child and a PUSHY parent (Dad) who
// demands specific treatment. Exercises redirecting a tangential child kindly
// and counseling under pressure without capitulating. SYNTHETIC DATA ONLY.

import type { ScenarioPackage } from "../types"

export const allergy3c9f0d21: ScenarioPackage = {
  manifest: {
    scenario_id: "allergy-3c9f0d21",
    seed: 662890,
    config: {
      content_domain: "allergy",
      learning_objectives: [
        "Elicit allergy and trigger history from a talkative child, redirecting kindly",
        "Build rapport while keeping the history on track",
        "Counsel on avoidance and an action plan under parental pressure",
      ],
      age_range: [6, 10],
      temperament: "chatty",
      parent: { present: true, style: "pushy" },
      location: { state: "North Carolina", city: "Charlotte" },
      batch_size: 40,
      seed: null,
    },
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    patient: {
      id: "3c9f0d21-8b47-4d1a-9f22-6a0c3e1b7d94",
      name: "Leo Nguyen",
      birthDate: "2018-06-11",
      gender: "male",
      mrn: "3c9f0d21-8b47-4d1a-9f22-6a0c3e1b7d94",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "Asian",
      ethnicity: "Not Hispanic or Latino",
    },
  },

  answer_key: {
    learning_objectives: [
      "Elicit allergy and trigger history from a talkative child, redirecting kindly",
      "Build rapport while keeping the history on track",
      "Counsel on avoidance and an action plan under parental pressure",
    ],
    key_facts: [
      {
        id: "fact-001",
        category: "condition",
        fact: "Allergic rhinitis (disorder) (active)",
        domain_relevant: true,
        elicit_via: "symptom history questions",
      },
      {
        id: "fact-002",
        category: "allergy",
        fact: "Allergy: Peanut (severe)",
        domain_relevant: true,
        elicit_via: "allergy history questions",
      },
      {
        id: "fact-003",
        category: "allergy",
        fact: "Allergy: Grass pollen",
        domain_relevant: true,
        elicit_via: "allergy history questions",
      },
      {
        id: "fact-004",
        category: "medication",
        fact: "Takes/took: Cetirizine 5 MG Chewable Tablet",
        domain_relevant: false,
        elicit_via: "medication history questions",
      },
    ],
    scoring_note:
      "History completeness = domain-relevant facts surfaced in transcript / total domain-relevant facts.",
  },

  persona: {
    child: {
      name: "Leo",
      age: 8,
      temperament: "chatty",
      speaking_style:
        "Talkative and tangential. Volunteers irrelevant stories. Needs gentle redirection without being shut down.",
      language_level:
        "Match vocabulary to age. Never use words a child this age would not know.",
    },
    rapport: {
      initial: 60,
      rules: [
        "+10 when doctor listens to a tangent briefly before redirecting kindly",
        "-15 when doctor cuts the child off abruptly",
        "-10 when doctor shows visible impatience",
      ],
      disclosure_threshold: 50,
      mechanic:
        "Below threshold: rambles, hard to pin down. Above: gives a usable, on-track history.",
    },
    parent: {
      present: true,
      style: "pushy",
      label: "Dad",
      behavior:
        "Demands a specific treatment (allergy shots / prescription meds) regardless of indication. Tests counseling under pressure.",
      dialogue: {
        reassured:
          "Okay, but shouldn't he be on something stronger? A steroid, or the allergy shots? I read about them.",
        withdrawn:
          "Leo, focus. Doctor, can we just get him tested for everything today?",
        medication:
          "The over-the-counter stuff isn't cutting it. I want him on prescription meds — and the shots. Can you write that up?",
        symptom:
          "Look, I just want him tested for every allergy and put on the strongest treatment. We don't have time to mess around.",
      },
    },
    hard_rules: [
      "Never volunteer key facts unprompted; they must be elicited.",
      "Never break character or acknowledge being a simulation.",
      "Medical details must come only from the chart; invent nothing clinical.",
    ],
    dialogue: {
      greetingOpen:
        "Hi! I'm Leo! Did you know I have a bearded dragon named Nacho? He's the best lizard ever.",
      greetingGuarded: "Hi! *waves* Are those real doctor tools? Can I hold one?",
      interestsOpen:
        "Oh I like SO many things — Pokémon, and Legos, and my dragon Nacho, and — wait, what did you ask again?",
      interestsGuarded: "Everything! Mostly Pokémon though. Do YOU like Pokémon?",
      feelingsAck: "Yeah, it's kinda scary — but you're nice, so it's okay!",
      chiefOpen:
        "My nose is ALL stuffy and I sneeze like a hundred times, especially at the park. And my eyes get super itchy!",
      chiefGuarded: "*sniffles* My nose is stuffy. Achoo! See? Told you.",
      priorEpisode:
        "Oh yeah, it happens every spring! Last year too. My mom says it's the flowers or the grass.",
      medication:
        "I take the little pink chewy tablet every morning! And I have an EpiPen in my backpack in case of peanuts.",
      allergyFact:
        "I'm SUPER allergic to peanuts — like, really really bad. And grass makes me all sneezy. One time at a party—",
      noAllergy: "Um, just peanuts and grass I think! Oh, and maybe cats a little.",
      genericSymptomOpen:
        "I sneeze a bunch and my nose runs, and sometimes I can't even smell my snacks, which is honestly the worst part.",
      genericSymptomGuarded: "I'm okay! Just sneezy. Achoo! Bless me.",
      medicationUnknownGuarded:
        "Ummm my dad knows all that — he keeps a chart on his phone!",
      counselingOpen:
        "Okay! So no peanuts and take my pink tablet? I can do that. Do I still get a sticker?",
      counselingGuarded: "Okay okay — are we almost done? I'm kinda hungry.",
      withhold: "Oh! *gets distracted* ...is that a skeleton poster? Cool.",
      withdrawn:
        "*keeps chattering to Dad about his dragon instead of answering*",
      jargonConfused: "Whoa, that's a big word! What's it mean? Is it bad??",
      fillerOpen: "Okay! *nods a whole lot*",
      fillerGuarded: "Mmhm! *swings legs*",
    },
  },

  avatar: {
    age_bracket: "young_child",
    sex: "male",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    model_url: "TODO: match against RPM avatar library",
    voice: "en-US-AnaNeural",
  },

  chart: {
    demographics: {
      id: "3c9f0d21-8b47-4d1a-9f22-6a0c3e1b7d94",
      name: "Leo Nguyen",
      birthDate: "2018-06-11",
      gender: "male",
      mrn: "3c9f0d21-8b47-4d1a-9f22-6a0c3e1b7d94",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "Asian",
      ethnicity: "Not Hispanic or Latino",
    },
    problemList: [
      {
        name: "Allergic rhinitis (disorder)",
        code: "61582004",
        status: "active",
        onset: "2024-04-18",
      },
      {
        name: "Peanut allergy (disorder)",
        code: "91935009",
        status: "active",
        onset: "2021-09-02",
      },
      {
        name: "Atopic dermatitis (disorder)",
        code: "24079001",
        status: "resolved",
        onset: "2020-01-10",
        abatement: "2022-05-04",
      },
    ],
    medications: [
      {
        name: "Cetirizine 5 MG Chewable Tablet",
        status: "active",
        authoredOn: "2025-04-01",
        reason: "Allergic rhinitis (disorder)",
      },
      {
        name: "Epinephrine 0.15 MG Auto-Injector",
        status: "active",
        authoredOn: "2021-09-10",
        reason: "Peanut allergy (disorder)",
      },
    ],
    immunizations: [
      { vaccine: "Hep B, adult", date: "2018-06-11" },
      { vaccine: "DTaP", date: "2018-08-13" },
      { vaccine: "Hib (PRP-OMP)", date: "2018-08-13" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2018-08-13" },
      { vaccine: "Rotavirus, monovalent", date: "2018-08-13" },
      { vaccine: "IPV", date: "2018-08-13" },
      { vaccine: "MMR", date: "2019-06-17" },
      { vaccine: "Varicella", date: "2019-06-17" },
      { vaccine: "Hep A, ped/adol, 2 dose", date: "2019-06-17" },
      { vaccine: "DTaP", date: "2023-06-19" },
      { vaccine: "IPV", date: "2023-06-19" },
      { vaccine: "MMR", date: "2023-06-19" },
      { vaccine: "Varicella", date: "2023-06-19" },
      { vaccine: "Influenza, seasonal, injectable", date: "2024-10-11" },
      { vaccine: "Influenza, seasonal, injectable", date: "2025-10-14" },
    ],
    encounters: [
      {
        date: "2026-08-08",
        type: "Office visit",
        reason: "Nasal congestion, sneezing, itchy eyes — allergic rhinitis",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2025-04-01",
        type: "Office visit",
        reason: "Seasonal allergy symptoms — cetirizine started",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2021-09-02",
        type: "Urgent care",
        reason: "Hives after peanut exposure — peanut allergy diagnosed",
        provider: "Charlotte Pediatric Clinic",
      },
    ],
    vitals: [
      { date: "2018-06-11", ageMonths: 0, heightCm: 51, weightKg: 3.5 },
      { date: "2019-06-17", ageMonths: 12, heightCm: 76, weightKg: 9.8 },
      { date: "2020-06-15", ageMonths: 24, heightCm: 88, weightKg: 12.4 },
      { date: "2022-06-20", ageMonths: 48, heightCm: 103, weightKg: 16.6 },
      { date: "2024-06-17", ageMonths: 72, heightCm: 117, weightKg: 21.0 },
      {
        date: "2026-08-08",
        ageMonths: 98,
        heightCm: 128,
        weightKg: 25.3,
        bmi: 15.4,
        tempC: 37.0,
        hr: 92,
        rr: 20,
        spo2: 99,
      },
    ],
    labs: [
      {
        date: "2026-08-08",
        name: "Peanut-specific IgE",
        value: "> 100",
        unit: "kU/L",
        flag: "high",
      },
      {
        date: "2026-08-08",
        name: "Grass pollen IgE",
        value: "18.4",
        unit: "kU/L",
        flag: "high",
      },
      {
        date: "2026-08-08",
        name: "Total eosinophils",
        value: "620",
        unit: "cells/µL",
        flag: "high",
      },
    ],
    careTeam: [
      { name: "Dr. Maria Alvarez, MD", role: "Primary care pediatrician" },
      { name: "Charlotte Pediatric Clinic", role: "Care organization" },
    ],
    allergies: ["Peanut (severe)", "Grass pollen"],
  },
}
