# PedSim — Architecture

Pediatric avatar assessment prototype: simulated child patients for evaluating
pediatricians' interpersonal & communication skills, history-taking, counseling,
behavioral/mental-health handling, and professionalism.

Primary scoring domains map to ABP Core Competencies 3 (Interpersonal &
Communication Skills) and 4 (Professionalism), and to the behavioral/mental
health EPA. Clinical reasoning is captured but carries near-zero score weight.

---

## 1. System overview

```
                          ┌─────────────────────────────────────────────┐
                          │              SCENARIO BUILDER                │
                          │  educator config: content domain, learning   │
                          │  objectives, age range, temperament, parent, │
                          │  location, (optional) sex, seed              │
                          └──────────────────┬──────────────────────────┘
                                             │ generate_scenario.py
                                             ▼
       ┌──────────────┐   FHIR R4    ┌──────────────────┐
       │   SYNTHEA    │─ bundles ───▶│  DOMAIN MATCHER   │  rank patients by
       │  (generator) │              │  + EXTRACTORS     │  domain fit, keep best
       └──────────────┘              └────────┬─────────┘
        census-based demographics             │
        age-coherent history                  ▼
                                ┌───────────────────────────┐
                                │     SCENARIO PACKAGE       │
                                │  bundle.fhir.json          │
                                │  chart.json                │
                                │  answer_key.json           │
                                │  persona.json              │
                                │  avatar.json               │
                                │  manifest.json (seed!)     │
                                └──────┬──────────┬─────────┘
                                       │          │
                 ┌─────────────────────┘          └──────────────────┐
                 ▼                                                   ▼
   ┌───────────────────────────┐                     ┌───────────────────────────┐
   │  PHASE A: CHART REVIEW     │                     │  PHASE B: ENCOUNTER        │
   │  chart-viewer.html         │                     │  Scenario Engine [PLANNED] │
   │  (Epic-style, tab logging) │                     │  LLM + persona + chart +   │
   └────────────┬──────────────┘                     │  rapport state machine     │
                │  review log                         └──────┬──────────┬────────┘
                │                                            │          │
                │                          doctor input ─────┘          │ child reply
                │                    (text now; Whisper STT later)      ▼
                │                                        ┌───────────────────────────┐
                │                                        │  AVATAR LAYER [PLANNED]    │
                │                                        │  edge-tts (voice)          │
                │                                        │  TalkingHead + RPM GLB     │
                │                                        │  (Three.js lip-sync)       │
                │                                        └──────────┬────────────────┘
                │                                                   │ transcript +
                ▼                                                   ▼ rapport trace
              ┌──────────────────────────────────────────────────────────┐
              │            PHASE C: SCORING MODULE [PLANNED]              │
              │  mechanical: facts surfaced / answer-key facts            │
              │  rubric LLM: age-adapted language, rapport technique,     │
              │  counseling clarity, professionalism (with evidence       │
              │  excerpts from transcript)                                │
              └────────────────────────────┬─────────────────────────────┘
                                           ▼
                              ┌─────────────────────────┐
                              │   SCORE REPORT           │
                              │   per-domain scores +    │
                              │   annotated moments +    │
                              │   missed facts           │
                              └─────────────────────────┘
```

Status: **BUILT** = Synthea pipeline, domain matcher, extractors, scenario
package generator, chart viewer. **PLANNED** = scenario engine, avatar layer,
scoring module, report UI.

---

## 2. Components

### 2.1 Synthea (patient generation) — BUILT
- `synthea-with-dependencies.jar` (Apache 2.0, free). No API; a CLI generator.
- Contains disease modules, US Census demographic data, clinical reference
  data. Contains **no patient records** — patients are simulated per run.
- Demographics (race, ethnicity, names, language) are sampled from real Census
  distributions for the configured location; ages are bounded by config and
  the entire history (immunizations, growth, encounters) is age-coherent.
- `-s <seed>` makes generation fully reproducible: same seed = same patients.
  Random by default (seed recorded in manifest), pinned for the exam bank.
- `-m <module>` targets content domains (asthma, ear_infections, ADHD, ...).
  Modules are probabilistic, hence generate-a-batch-and-filter (see 2.2).

### 2.2 generate_scenario.py (scenario builder) — BUILT
Input: educator config JSON (domain, learning objectives, age range,
temperament, parent style, location, sex, seed, batch size).
1. Runs Synthea with domain-targeted flags.
2. **Ranks** every generated patient by domain fit (active domain condition
   = 10 pts, resolved = 3, domain medication = 5); keeps the best.
3. Emits the scenario package (section 3).

Domain registry maps ABP-style content domains → Synthea modules → match
keywords → the EPA each domain exercises. Extend by adding entries; gaps in
Synthea's stock modules are filled later with custom Generic Module Framework
modules (phase 2).

### 2.3 extract_chart.py — BUILT
Distills a raw bundle (300–600 FHIR resources, ~1.2 MB) into ~15 KB
chart.json: demographics, problem list, meds, immunizations, encounters,
vitals timeline, labs, care team, allergies.

### 2.4 chart-viewer.html — BUILT
Single-file, zero-dependency Epic-Hyperspace-style viewer: patient storyboard,
tabs (SnapShot / Chart Review / Problem List / Results / Medications /
Immunizations / Growth Chart), SVG growth curves. Loads raw Synthea bundles
client-side. "SIMULATION — SYNTHETIC DATA" badge always visible.
Prototype addition needed: tab-open + dwell-time logging → review log.

### 2.5 Scenario engine — PLANNED (next build)
The brain. Per turn:
```
doctor utterance
  → update rapport score (persona.json rules)
  → build LLM prompt: persona + chart facts + rapport state + history
  → LLM generates child (and parent) reply, in character
  → track which answer-key facts the reply surfaced
```
Hard rules enforced in the prompt: never volunteer key facts unprompted;
clinical details come only from the chart; never break character.
Rapport mechanic: below the disclosure threshold the child is guarded and
withholds detail; above it, the child opens up — good communication
*mechanically* yields a better history, mirroring reality.

### 2.6 Avatar layer — PLANNED
- Voice: edge-tts (`en-US-AnaNeural`, free) → Inworld TTS when moving to
  streaming (sub-200ms, inline emotion tags like `[speak nervously]`).
- Face: Ready Player Me GLB (must export with ARKit + Oculus viseme
  blendshapes) rendered by the TalkingHead library (Three.js) — real-time
  lip-sync, expressions, idle motion. Avatar model selected to match the
  generated patient's age/sex/ethnicity (avatar.json).
- STT (later): faster-whisper, local. Prototype uses typed input.

### 2.7 Scoring module — PLANNED
Two layers, deliberately separated for defensibility:
1. **Mechanical** (no AI judgment): history completeness = domain-relevant
   answer-key facts surfaced ÷ total. Chart-review coverage from the review
   log. Rapport trajectory from the state machine.
2. **Rubric LLM**: grades transcript against behavioral anchors per domain
   (age-adapted language, rapport technique, counseling clarity,
   professionalism), citing verbatim transcript excerpts as evidence.
Weights come from the scenario's learning objectives.

---

## 3. Scenario package format

```
scenarios/<domain>-<id>/
  manifest.json      scenario id, SEED (reproducibility), config, patient
                     demographics, mapped ABP EPA
  bundle.fhir.json   full Synthea FHIR R4 bundle (ground truth)
  chart.json         compact chart for the viewer
  answer_key.json    learning objectives + key facts (id, category, fact,
                     domain_relevant, elicit_via) + scoring rule
  persona.json       child (name/age/temperament/speaking style), rapport
                     (initial score, rules, disclosure threshold), parent
                     (presence + style), hard rules
  avatar.json        age bracket, sex, race/ethnicity, model URL, voice
```

The **seed in manifest.json** is the standardization mechanism: re-running
Synthea with it regenerates the identical patient, so every candidate can face
the exact same case, or the bank can be balanced across demographics by design.

---

## 4. Design principles

1. **Objectives drive everything.** Learning objectives select the patient,
   derive the answer key, weight the rubric, and structure the report —
   traceable end to end.
2. **Score only what is observable.** Primary domains are behavioral and
   visible in the transcript; no inference about the candidate's thoughts.
   Clinical reasoning is reported as feedback, not consequentially scored.
3. **Demographics vary the patient, never the persona logic.** Race/ethnicity
   change face, name, and chart context. Behavior comes only from the
   temperament config. No demographic-behavior coupling, ever.
4. **Synthetic only.** No real patient data (PHI), no real children's faces,
   no cloned children's voices — at any stage, for any reason.
5. **Everything logged and replayable.** Every turn, tab click, and rapport
   change is recorded; any encounter can be human-reviewed. Audit trail =
   appeals process.
6. **Reuse before build.** Synthea, FHIR, HAPI, TalkingHead, RPM, edge-tts,
   Whisper — commodity components; the proprietary value is the scenario
   engine + scoring.

---

## 5. Exam flow (prototype scope)

```
Screen 0  Scenario Builder   educator picks domain/objectives → Generate
Screen 1  Chart Review       Epic-style viewer, tab logging, Begin Encounter
Screen 2  Encounter          typed doctor input ⇄ avatar child reply (voice),
                             anxious parent per scenario; End Encounter
Screen 3  Score Report       domain scores, annotated moments, missed facts
```
Cut from prototype (production-only): login/identity, orientation/mic-check,
proctoring, timed phases, structured note entry, human review sampling.

---

## 6. Cost profile (current stack: $0)

| Layer            | Prototype (free)        | Production upgrade            |
|------------------|-------------------------|-------------------------------|
| Patient data     | Synthea                 | + custom disease modules      |
| Chart API        | JSON files              | HAPI FHIR server (also free)  |
| STT              | typed input             | faster-whisper / Inworld STT  |
| Engine LLM       | any API free tier/local | production LLM API            |
| TTS              | edge-tts (child voice)  | Inworld TTS (~$0.05/encounter)|
| Avatar           | RPM GLB + TalkingHead   | Avaturn / CC4 realistic model |
| Video (alt path) | —                       | D-ID Streams (2D talking head)|

---

## 7. Roadmap

1. **Scenario engine** (next): LLM turn loop + rapport state machine + fact
   tracking, runnable against scenarios/ packages via text chat.
2. **Scoring module**: mechanical scorer + rubric LLM + report JSON.
3. **Encounter UI**: chat interface, then TalkingHead avatar bolt-on.
4. **Custom Synthea modules** for gaps (e.g., somatic-presentation
   depression for the guarded-teen scenario).
5. **Streaming tier**: Whisper mic input + Inworld TTS + persistent avatar.
6. **Psychometrics**: pilot data, inter-rubric reliability, human-rater
   agreement studies — the evidence base for any summative use.
