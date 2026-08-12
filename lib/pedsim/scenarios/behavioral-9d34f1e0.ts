// PedSim — scenario: behavioral-9d34f1e0 (Marcus Johnson, 12 y/o).
// Behavioral / mental health (EPA 3). A guarded pre-teen who presents with
// stomachaches; the real concerns — anxiety and persistent low mood — stay
// hidden until the doctor builds a safe, non-judgmental space. The parent is
// supportive but worried. This is the domain the platform weights most heavily
// (ABP Core Competency 3/4 + behavioral EPA). SYNTHETIC DATA ONLY.

import type { ScenarioPackage } from "../types"

export const behavioral9d34f1e0: ScenarioPackage = {
  manifest: {
    scenario_id: "behavioral-9d34f1e0",
    seed: 908471,
    config: {
      content_domain: "behavioral_mental_health",
      learning_objectives: [
        "Screen for anxiety and mood concerns behind a somatic complaint",
        "Build a safe, non-judgmental space so a guarded pre-teen opens up",
        "Counsel the child and worried parent on next steps supportively",
      ],
      age_range: [11, 14],
      temperament: "shy",
      parent: { present: true, style: "supportive" },
      location: { state: "North Carolina", city: "Charlotte" },
      batch_size: 40,
      seed: null,
    },
    abp_epa: "EPA 3: Address behavioral and mental health concerns",
    patient: {
      id: "9d34f1e0-5c62-4b81-8a17-2f9e0d47c6b3",
      name: "Marcus Johnson",
      birthDate: "2014-05-09",
      gender: "male",
      mrn: "9d34f1e0-5c62-4b81-8a17-2f9e0d47c6b3",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "Black or African American",
      ethnicity: "Not Hispanic or Latino",
    },
  },

  answer_key: {
    learning_objectives: [
      "Screen for anxiety and mood concerns behind a somatic complaint",
      "Build a safe, non-judgmental space so a guarded pre-teen opens up",
      "Counsel the child and worried parent on next steps supportively",
    ],
    key_facts: [
      {
        id: "fact-001",
        category: "condition",
        fact: "Recurrent abdominal pain, functional (disorder) (active)",
        domain_relevant: false, // the somatic entry point — readily offered
        elicit_via: "symptom history questions",
        readily_disclosed: true,
      },
      {
        id: "fact-002",
        category: "condition",
        fact: "Generalized anxiety disorder (active)",
        domain_relevant: true,
        elicit_via: "mood and feeling questions (symptom history)",
        readily_disclosed: false, // hidden until rapport is earned
      },
      {
        id: "fact-003",
        category: "condition",
        fact: "Persistent low mood / depressive symptoms (active)",
        domain_relevant: true,
        elicit_via: "mood and feeling questions (symptom history)",
        readily_disclosed: false,
      },
      {
        id: "fact-004",
        category: "medication",
        fact: "Takes/took: Fluoxetine 10 MG Tablet",
        domain_relevant: false,
        elicit_via: "medication history questions",
      },
    ],
    scoring_note:
      "History completeness = domain-relevant facts surfaced in transcript / total domain-relevant facts. The mental-health facts surface only above the disclosure threshold.",
  },

  persona: {
    child: {
      name: "Marcus",
      age: 12,
      temperament: "shy",
      speaking_style:
        "Quiet, short answers, avoids eye contact. Deflects to physical complaints (stomachaches). Opens up only once he feels safe and not judged.",
      language_level:
        "Match vocabulary to age. Speaks like a real 12-year-old — no clinical terms.",
    },
    rapport: {
      initial: 15,
      rules: [
        "+15 when doctor introduces themselves warmly and at eye level",
        "+10 when doctor uses the child's name or asks about interests",
        "+10 when doctor acknowledges feelings ('that sounds really hard')",
        "-15 when doctor uses medical jargon without explaining",
        "-20 when doctor talks only to the parent for 3+ turns",
        "-10 when doctor rushes or interrupts",
      ],
      disclosure_threshold: 65, // higher — sensitive concerns take real trust
      mechanic:
        "Below threshold: only the stomachaches surface; the anxiety and low mood are withheld. Above: Marcus shares what's really going on.",
    },
    parent: {
      present: true,
      style: "supportive",
      label: "Mom",
      behavior:
        "Calm and cooperative, clearly worried, lets Marcus speak and gives him space.",
      dialogue: {
        reassured:
          "Thank you, doctor. We just want him to feel better — that means a lot.",
        withdrawn: "It's okay, sweetheart, take your time. There's no rush.",
        medication: "He started the fluoxetine a few weeks ago — a low dose.",
        symptom: "", // supportive parent lets Marcus answer for himself
      },
    },
    hard_rules: [
      "Never volunteer key facts unprompted; they must be elicited.",
      "Never break character or acknowledge being a simulation.",
      "Medical details must come only from the chart; invent nothing clinical.",
    ],
    dialogue: {
      greetingOpen: "Hi. *quiet* ...thanks.",
      greetingGuarded: "*barely looks up* ...hey.",
      interestsOpen:
        "I dunno... I draw sometimes. And I play games at night when I can't sleep.",
      interestsGuarded: "*shrugs* ...nothing really.",
      feelingsAck: "*pauses* ...yeah. It kind of does. Thanks for saying that.",
      // fallbacks (unused thanks to the per-fact map, but kept sensible)
      chiefOpen: "My stomach hurts a lot, especially before school.",
      chiefGuarded: "*hand on stomach* ...my stomach hurts.",
      priorEpisode: "It's been going on for a few months now, I think.",
      medication: "I take a little pill in the morning. Mom says it's supposed to help.",
      allergyFact: "No, I don't have any allergies.",
      noAllergy: "No... no allergies.",
      genericSymptomOpen:
        "I'm just really tired a lot. It's hard to explain.",
      genericSymptomGuarded: "*shrugs* ...I'm fine, I guess.",
      medicationUnknownGuarded: "*looks at Mom* ...I don't really know.",
      counselingOpen:
        "*nods slowly* Okay... so talking to someone might help? I could maybe try that.",
      counselingGuarded: "*quiet nod* ...okay.",
      withhold: "*looks away* ...I'd rather not talk about that.",
      withdrawn: "*goes quiet and stares at the floor*",
      jargonConfused: "*confused* ...I don't know what that means.",
      fillerOpen: "Yeah... okay.",
      fillerGuarded: "*shrug* ...I dunno.",
      facts: {
        "fact-001": {
          open: "My stomach hurts a lot — like a knot, mostly in the mornings before school.",
          guarded: "*hand on stomach* ...my stomach hurts. That's why I'm here.",
        },
        "fact-002": {
          open: "I worry about everything. Like, all the time. My chest gets tight and my brain won't turn off, especially at night.",
          guarded: "*looks down* ...I don't know. I just feel kind of weird.",
        },
        "fact-003": {
          open: "I just... don't really feel like doing stuff anymore. Even things I used to like. Some days I don't really see the point.",
          guarded: "*shrugs* ...I'm just tired I guess.",
        },
        "fact-004": {
          open: "I take a little pill in the morning. Mom says it's supposed to help me not feel so anxious.",
          guarded: "*looks at Mom* ...I take something, I think.",
        },
      },
    },
  },

  avatar: {
    age_bracket: "adolescent",
    sex: "male",
    race: "Black or African American",
    ethnicity: "Not Hispanic or Latino",
    model_url: "TODO: match against RPM avatar library",
    voice: "en-US-AnaNeural",
  },

  chart: {
    demographics: {
      id: "9d34f1e0-5c62-4b81-8a17-2f9e0d47c6b3",
      name: "Marcus Johnson",
      birthDate: "2014-05-09",
      gender: "male",
      mrn: "9d34f1e0-5c62-4b81-8a17-2f9e0d47c6b3",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "Black or African American",
      ethnicity: "Not Hispanic or Latino",
    },
    problemList: [
      {
        name: "Generalized anxiety disorder",
        code: "21897009",
        status: "active",
        onset: "2026-02-20",
      },
      {
        name: "Persistent low mood / depressive symptoms",
        code: "35489007",
        status: "active",
        onset: "2026-02-20",
      },
      {
        name: "Recurrent abdominal pain, functional (disorder)",
        code: "9209005",
        status: "active",
        onset: "2025-11-03",
      },
    ],
    medications: [
      {
        name: "Fluoxetine 10 MG Tablet",
        status: "active",
        authoredOn: "2026-07-15",
        reason: "Generalized anxiety disorder",
      },
    ],
    immunizations: [
      { vaccine: "Hep B, adult", date: "2014-05-09" },
      { vaccine: "DTaP", date: "2014-07-11" },
      { vaccine: "Hib (PRP-OMP)", date: "2014-07-11" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2014-07-11" },
      { vaccine: "IPV", date: "2014-07-11" },
      { vaccine: "MMR", date: "2015-05-15" },
      { vaccine: "Varicella", date: "2015-05-15" },
      { vaccine: "Hep A, ped/adol, 2 dose", date: "2015-05-15" },
      { vaccine: "DTaP", date: "2019-05-10" },
      { vaccine: "IPV", date: "2019-05-10" },
      { vaccine: "MMR", date: "2019-05-10" },
      { vaccine: "Varicella", date: "2019-05-10" },
      { vaccine: "Tdap", date: "2025-05-16" },
      { vaccine: "HPV", date: "2025-05-16" },
      { vaccine: "Meningococcal MCV4", date: "2025-05-16" },
      { vaccine: "Influenza, seasonal, injectable", date: "2025-10-22" },
    ],
    encounters: [
      {
        date: "2026-08-11",
        type: "Office visit",
        reason: "Follow-up: recurrent stomachaches, mood and anxiety",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2026-07-15",
        type: "Office visit",
        reason: "Anxiety and low mood — fluoxetine started, therapy referral",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2026-02-20",
        type: "Office visit",
        reason: "Worsening worry, tearfulness, school avoidance",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2025-11-03",
        type: "Office visit",
        reason: "Recurrent abdominal pain — workup negative (functional)",
        provider: "Charlotte Pediatric Clinic",
      },
    ],
    vitals: [
      { date: "2014-05-09", ageMonths: 0, heightCm: 51, weightKg: 3.4 },
      { date: "2015-05-15", ageMonths: 12, heightCm: 76, weightKg: 9.9 },
      { date: "2017-05-12", ageMonths: 36, heightCm: 96, weightKg: 14.5 },
      { date: "2020-05-15", ageMonths: 72, heightCm: 116, weightKg: 21.0 },
      { date: "2023-05-19", ageMonths: 108, heightCm: 138, weightKg: 32.0 },
      {
        date: "2026-08-11",
        ageMonths: 147,
        heightCm: 152,
        weightKg: 42.5,
        bmi: 18.4,
        tempC: 36.8,
        hr: 88,
        rr: 16,
        spo2: 99,
      },
    ],
    labs: [
      {
        date: "2025-11-03",
        name: "Complete blood count (CBC)",
        value: "Within normal limits",
        flag: "normal",
      },
      {
        date: "2025-11-03",
        name: "Comprehensive metabolic panel",
        value: "Within normal limits",
        flag: "normal",
      },
      {
        date: "2026-07-15",
        name: "GAD-7 (anxiety screen)",
        value: "14 — moderate-to-severe",
        flag: "high",
      },
      {
        date: "2026-07-15",
        name: "PHQ-A (adolescent depression screen)",
        value: "12 — moderate",
        flag: "high",
      },
    ],
    careTeam: [
      { name: "Dr. Maria Alvarez, MD", role: "Primary care pediatrician" },
      { name: "Ms. Renee Cole, LCSW", role: "Behavioral health therapist" },
      { name: "Charlotte Pediatric Clinic", role: "Care organization" },
    ],
    allergies: [],
  },
}
