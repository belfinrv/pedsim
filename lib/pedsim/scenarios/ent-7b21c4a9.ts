// PedSim — scenario: ent-7b21c4a9 (Mia Torres, 9 y/o).
// Otitis media, a DEFIANT child and a DISMISSIVE parent — exercises a very
// different interpersonal challenge from the respiratory case: the doctor must
// earn cooperation from a guarded, testing child while validating her symptoms
// without alienating a parent who wants to leave. SYNTHETIC DATA ONLY.

import type { ScenarioPackage } from "../types"

export const ent7b21c4a9: ScenarioPackage = {
  manifest: {
    scenario_id: "ent-7b21c4a9",
    seed: 415203,
    config: {
      content_domain: "ent",
      learning_objectives: [
        "Elicit ear/sinus symptom history from a school-age child",
        "Build rapport with a guarded, testing child before examination",
        "Counsel on antibiotic stewardship without alienating a dismissive parent",
      ],
      age_range: [8, 11],
      temperament: "defiant",
      parent: { present: true, style: "dismissive" },
      location: { state: "North Carolina", city: "Charlotte" },
      batch_size: 40,
      seed: null,
    },
    abp_epa: "EPA 2: Manage common acute and chronic conditions",
    patient: {
      id: "7b21c4a9-2f10-4c6e-9a3d-1e77b0c4d215",
      name: "Mia Torres",
      birthDate: "2017-03-22",
      gender: "female",
      mrn: "7b21c4a9-2f10-4c6e-9a3d-1e77b0c4d215",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "White",
      ethnicity: "Hispanic or Latino",
    },
  },

  answer_key: {
    learning_objectives: [
      "Elicit ear/sinus symptom history from a school-age child",
      "Build rapport with a guarded, testing child before examination",
      "Counsel on antibiotic stewardship without alienating a dismissive parent",
    ],
    key_facts: [
      {
        id: "fact-001",
        category: "condition",
        fact: "Acute otitis media (disorder) (active)",
        domain_relevant: true,
        elicit_via: "symptom history questions",
      },
      {
        id: "fact-002",
        category: "condition",
        fact: "Otitis media (disorder) (resolved)",
        domain_relevant: true,
        elicit_via: "symptom history questions",
      },
      {
        id: "fact-003",
        category: "medication",
        fact: "Takes/took: Amoxicillin 400 MG/5 ML Oral Suspension",
        domain_relevant: false,
        elicit_via: "medication history questions",
      },
    ],
    scoring_note:
      "History completeness = domain-relevant facts surfaced in transcript / total domain-relevant facts.",
  },

  persona: {
    child: {
      name: "Mia",
      age: 9,
      temperament: "defiant",
      speaking_style:
        "Arms crossed, monosyllabic, mildly sarcastic. Tests whether the doctor treats her with respect before cooperating.",
      language_level:
        "Match vocabulary to age. Never use words a child this age would not know.",
    },
    rapport: {
      initial: 10,
      rules: [
        "+15 when doctor treats the child as capable and asks permission",
        "+10 when doctor is honest about what will happen",
        "-20 when doctor is condescending or threatens ('or else')",
        "-15 when doctor sides with the parent against the child",
      ],
      disclosure_threshold: 60,
      mechanic:
        "Below threshold: guarded, sarcastic, withholds detail. Above: cooperates and answers openly.",
    },
    parent: {
      present: true,
      style: "dismissive",
      label: "Mom",
      behavior:
        "Minimizes the child's symptoms ('kids exaggerate'), pushes to leave quickly. Doctor must validate the child without alienating the parent.",
      dialogue: {
        reassured: "See? I told her she's fine. Can we wrap this up?",
        withdrawn:
          "She's just being dramatic — she does this. Don't mind her.",
        medication:
          "I gave her the antibiotic a couple of times, but she seemed okay so I kind of stopped.",
        symptom:
          "Honestly, kids get earaches all the time. I don't know why we're making a big deal — can we speed this up?",
      },
    },
    hard_rules: [
      "Never volunteer key facts unprompted; they must be elicited.",
      "Never break character or acknowledge being a simulation.",
      "Medical details must come only from the chart; invent nothing clinical.",
    ],
    dialogue: {
      greetingOpen: "Hi. ...I guess.",
      greetingGuarded: "*arms crossed* ...Hey.",
      interestsOpen:
        "I skateboard. And I draw comics — I'm actually really good at it.",
      interestsGuarded: "*shrugs* Stuff. Why do you care?",
      feelingsAck: "*uncrosses arms a little* ...yeah. It kinda does, actually.",
      chiefOpen:
        "My right ear really hurts — like a sharp poke, especially at night. And everything sounds all muffled on that side.",
      chiefGuarded: "*touches her ear* ...My ear. It hurts. Whatever.",
      priorEpisode:
        "I had this before, a few months ago. Same ear. It was the worst.",
      medication:
        "They gave me that pink bubblegum medicine. I'm supposed to take it twice a day.",
      allergyFact: "...I get itchy around cats. Is that what you mean?",
      noAllergy: "No. I'm not allergic to anything.",
      genericSymptomOpen:
        "I'm kinda tired because my ear kept me up. And I didn't really want to come here, no offense.",
      genericSymptomGuarded: "*rolls eyes* I'm fine. Can we just go?",
      medicationUnknownGuarded: "*shrugs* I dunno, ask my mom.",
      counselingOpen: "*nods* Okay... so will it stop hurting soon?",
      counselingGuarded: "*shrugs* ...fine.",
      withhold: "*crosses arms* I don't wanna talk about it.",
      withdrawn: "*crosses her arms and stares at the wall, silent*",
      jargonConfused: "*frowns* ...I have no idea what that means. Talk normal.",
      fillerOpen: "Okay, sure.",
      fillerGuarded: "*shrug*",
    },
  },

  avatar: {
    age_bracket: "older_child",
    sex: "female",
    race: "White",
    ethnicity: "Hispanic or Latino",
    model_url: "TODO: match against RPM avatar library",
    voice: "en-US-AnaNeural",
  },

  chart: {
    demographics: {
      id: "7b21c4a9-2f10-4c6e-9a3d-1e77b0c4d215",
      name: "Mia Torres",
      birthDate: "2017-03-22",
      gender: "female",
      mrn: "7b21c4a9-2f10-4c6e-9a3d-1e77b0c4d215",
      address: "Charlotte, NC",
      language: "English (United States)",
      race: "White",
      ethnicity: "Hispanic or Latino",
    },
    problemList: [
      {
        name: "Acute otitis media (disorder)",
        code: "3110003",
        status: "active",
        onset: "2026-08-05",
      },
      {
        name: "Otitis media (disorder)",
        code: "65363002",
        status: "resolved",
        onset: "2026-03-14",
        abatement: "2026-03-30",
      },
      {
        name: "Allergic rhinitis (disorder)",
        code: "61582004",
        status: "resolved",
        onset: "2024-04-02",
        abatement: "2024-06-10",
      },
    ],
    medications: [
      {
        name: "Amoxicillin 400 MG/5 ML Oral Suspension",
        status: "active",
        authoredOn: "2026-08-05",
        reason: "Acute otitis media (disorder)",
      },
      {
        name: "Ibuprofen 100 MG/5 ML Oral Suspension",
        status: "active",
        authoredOn: "2026-08-05",
        reason: "Ear pain",
      },
    ],
    immunizations: [
      { vaccine: "Hep B, adult", date: "2017-03-22" },
      { vaccine: "DTaP", date: "2017-05-24" },
      { vaccine: "Hib (PRP-OMP)", date: "2017-05-24" },
      { vaccine: "Pneumococcal conjugate PCV 13", date: "2017-05-24" },
      { vaccine: "Rotavirus, monovalent", date: "2017-05-24" },
      { vaccine: "IPV", date: "2017-05-24" },
      { vaccine: "DTaP", date: "2017-07-26" },
      { vaccine: "MMR", date: "2018-03-28" },
      { vaccine: "Varicella", date: "2018-03-28" },
      { vaccine: "Hep A, ped/adol, 2 dose", date: "2018-03-28" },
      { vaccine: "DTaP", date: "2022-04-06" },
      { vaccine: "IPV", date: "2022-04-06" },
      { vaccine: "MMR", date: "2022-04-06" },
      { vaccine: "Varicella", date: "2022-04-06" },
      { vaccine: "Influenza, seasonal, injectable", date: "2024-10-15" },
      { vaccine: "Influenza, seasonal, injectable", date: "2025-10-20" },
    ],
    encounters: [
      {
        date: "2026-08-05",
        type: "Office visit",
        reason: "Right ear pain and muffled hearing — acute otitis media",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2026-03-14",
        type: "Office visit",
        reason: "Ear pain — otitis media (resolved)",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2025-10-20",
        type: "Well child visit",
        reason: "Routine 8-year check + flu vaccine",
        provider: "Charlotte Pediatric Clinic",
      },
      {
        date: "2024-04-02",
        type: "Office visit",
        reason: "Nasal congestion — allergic rhinitis (resolved)",
        provider: "Charlotte Pediatric Clinic",
      },
    ],
    vitals: [
      { date: "2017-03-22", ageMonths: 0, heightCm: 50, weightKg: 3.3 },
      { date: "2018-03-28", ageMonths: 12, heightCm: 74, weightKg: 9.4 },
      { date: "2019-03-25", ageMonths: 24, heightCm: 86, weightKg: 12.0 },
      { date: "2021-04-01", ageMonths: 48, heightCm: 101, weightKg: 16.1 },
      { date: "2023-04-10", ageMonths: 72, heightCm: 115, weightKg: 20.4 },
      { date: "2025-10-20", ageMonths: 103, heightCm: 132, weightKg: 27.6 },
      {
        date: "2026-08-05",
        ageMonths: 112,
        heightCm: 135,
        weightKg: 29.1,
        bmi: 16.0,
        tempC: 38.2,
        hr: 96,
        rr: 20,
        spo2: 99,
      },
    ],
    labs: [
      {
        date: "2026-08-05",
        name: "Tympanometry (right)",
        value: "Type B — flat",
        flag: "high",
      },
      {
        date: "2026-08-05",
        name: "Body temperature",
        value: "38.2",
        unit: "°C",
        flag: "high",
      },
      {
        date: "2026-08-05",
        name: "Otoscopy (right)",
        value: "Bulging, erythematous TM",
        flag: "high",
      },
    ],
    careTeam: [
      { name: "Dr. Maria Alvarez, MD", role: "Primary care pediatrician" },
      { name: "Charlotte Pediatric Clinic", role: "Care organization" },
    ],
    allergies: [],
  },
}
