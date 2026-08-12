# PedSim — Pediatric Avatar Assessment (prototype)

A standalone Next.js app implementing the **PLANNED** half of the PedSim
architecture: the scenario engine, rapport state machine, fact tracking,
scoring module, and the four-screen exam UI. It is a self-contained project
(its own `package.json` and dependencies) and runs with **zero configuration
and $0 cost** — no API key required.

> Simulated child patients for evaluating pediatricians' interpersonal &
> communication skills, history-taking, counseling, and professionalism.
> Scores map to ABP Core Competencies 3 (Communication) & 4 (Professionalism)
> and the behavioral/mental-health EPA. **Synthetic data only** — no PHI, no
> real children's faces or voices, ever.

## What was built here

`ARCHITECTURE.md` (shipped in the design bundle) marks the Synthea pipeline,
domain matcher, extractors, and chart viewer as **BUILT**, and everything
downstream as **PLANNED**. This project implements the planned components:

| Component (ARCHITECTURE.md) | Status before | Built here |
|-----------------------------|---------------|------------|
| §2.5 Scenario engine (turn loop, rapport, fact tracking) | PLANNED | ✅ `lib/pedsim/engine.ts`, `rapport.ts`, `facts.ts` + `app/api/engine` |
| §2.7 Scoring module (mechanical + rubric) | PLANNED | ✅ `lib/pedsim/scoring.ts` + `app/api/score` |
| §5 Screen 0 Scenario Builder | PLANNED | ✅ `app/builder` |
| §2.4 / Screen 1 Chart Review (Epic-style, tab logging) | BUILT (standalone HTML) | ✅ re-implemented as `app/chart` with dwell logging + SVG growth curves |
| §5 Screen 2 Encounter UI | PLANNED | ✅ `app/encounter` (chat, rapport meter, live fact tracker) |
| §5 Screen 3 Score Report | PLANNED | ✅ `app/report` |
| §2.1 Synthea patient generation | BUILT (Java CLI) | Unchanged — runs offline; a seed scenario is bundled |
| §2.6 Avatar layer (voice + GLB) | PLANNED | Descriptor only (`avatar.json`); rendering out of prototype scope |

The design principles from §4 are honored: **rapport and fact-tracking are
computed deterministically** (never delegated to the model), so every score is
defensible; **every turn, tab click, and rapport change is logged** for replay;
demographics vary the patient, never the persona logic; synthetic only.

## The exam flow

```
Screen 0  /builder    Configure domain/objectives/temperament → derive
                      persona + answer key → commit scenario
Screen 1  /chart      Epic-style chart; tab-open + dwell time logged
Screen 2  /encounter  Chat with the child; rapport gates disclosure;
                      anxious parent interjects; facts tracked live
Screen 3  /report     Mechanical scores + rubric (4 domains) + evidence
```

## The rapport mechanic

The child starts guarded (initial rapport 20, discloses at 55 for the shipped
shy persona). Each doctor turn is scored against the persona's rapport rules:

- `+15` warm self-introduction · `+10` uses the child's name / asks interests ·
  `+10` acknowledges feelings
- `-15` unexplained medical jargon · `-20` talks only to the parent for 3+
  turns · `-10` rushes or interrupts

Below the disclosure threshold the child gives minimal answers and withholds
sensitive/historical facts (prior episodes, medications). Above it, they open
up and those facts become elicitable — good communication *mechanically* yields
a better history. The active chief complaint is always minimally disclosed when
asked; historical facts require an explicit "has this happened before?" probe.

## Scoring

Two deliberately-separated layers (`lib/pedsim/scoring.ts`):

1. **Mechanical** (no AI judgment): history completeness = domain-relevant
   answer-key facts surfaced ÷ total; chart coverage from the tab dwell log;
   rapport trajectory from the state machine.
2. **Rubric** (0–4 behavioral anchors, with verbatim transcript evidence):
   age-adapted language, rapport technique, counseling clarity,
   professionalism. LLM-graded when an API key is present, heuristic otherwise —
   identical output shape either way.

The composite is a weighted 0–100 (history 30%, rapport 25%, language 15%,
counseling 15%, professionalism 15%) banded Emerging / Developing / Proficient /
Exemplary.

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

On Windows, see **[SETUP-WINDOWS.md](./SETUP-WINDOWS.md)** for a step-by-step
clone-and-run guide (including OneDrive and PowerShell gotchas).

Everything runs on the deterministic rule engine out of the box. To use a real
LLM for the child's replies and the grading rubric, set:

```bash
ANTHROPIC_API_KEY=sk-ant-...      # enables the LLM path
PEDSIM_MODEL=claude-sonnet-5      # optional; this is the default
```

With the key set, the LLM writes the child/parent dialogue and grades the
rubric, while rapport math and fact bookkeeping stay deterministic on the
server. Without it, the rule-based engine handles both.

## Deploying to Cloudflare Workers

PedSim ships ready for **Cloudflare Workers** via the OpenNext adapter
(`@opennextjs/cloudflare`) — the full app runs server-side (SSR pages +
dynamic `/api/engine` and `/api/score` routes) on `workerd` with
`nodejs_compat`. Config lives in `wrangler.jsonc` + `open-next.config.ts`.

**Option A — deploy from your machine (fastest):**

```bash
pnpm install
pnpm exec wrangler login      # authenticate once with your Cloudflare account
pnpm run deploy               # opennextjs-cloudflare build && ... deploy
```

`pnpm run deploy` builds the Worker bundle to `.open-next/worker.js` and
publishes it. To set the optional LLM key as a Worker secret:

```bash
pnpm exec wrangler secret put ANTHROPIC_API_KEY
# optional model override (defaults to claude-sonnet-5):
pnpm exec wrangler secret put PEDSIM_MODEL
```

**Option B — connect the repo (CI/CD):** in the Cloudflare dashboard →
Workers & Pages → Create → connect this GitHub repo (root is the project),
build command `pnpm run deploy`. Add `ANTHROPIC_API_KEY` under *Build variables
and secrets* if you want the LLM path.

**Local preview in the Cloudflare runtime** (workerd, not `next dev`):

```bash
cp .dev.vars.example .dev.vars   # optional: add your key for local LLM testing
pnpm run preview                 # builds + serves via wrangler dev
```

Notes:
- Pinned to **Next.js 15**, the version officially supported by the Cloudflare
  OpenNext adapter (Next 16 is not yet supported there).
- `compatibility_date` is `2025-04-01` with the `nodejs_compat` flag — required
  for the `process.env` / `fetch` used by the API routes.
- Cloudflare vars/secrets are surfaced to the app through `process.env`, so no
  code changes are needed between local and Workers.

## Code map

```
app/
  layout.tsx          root layout: fonts, provider, step nav
  page.tsx            landing
  builder|chart|encounter|report/page.tsx   the four screens
  api/engine/route.ts turn engine (LLM or deterministic)
  api/score/route.ts  scoring (LLM rubric or heuristic)
  globals.css         Tailwind v4 + theme tokens
components/
  provider.tsx        sessionStorage-backed exam state (the audit trail)
  nav.tsx             step nav + simulation badge
  ui/                 button, card, badge, label, textarea, select
lib/
  utils.ts            cn()
  pedsim/
    types.ts              scenario-package + runtime + scoring types
    registry.ts           DOMAINS / TEMPERAMENTS / PARENT_STYLES (ported from generate_scenario.py)
    scenario-builder.ts   buildAnswerKey / buildPersona / selectAvatar (pure TS ports)
    rapport.ts            utterance analysis + rapport state machine
    facts.ts              question-intent classification + fact elicitation/detection
    engine.ts             turn orchestration, deterministic child voice, LLM prompt builders
    scoring.ts            mechanical + heuristic rubric + composite + annotations + LLM prompt
    llm.ts                minimal Anthropic Messages client (no SDK)
    scenarios/            scenario library (seed: respiratory-0406b500 / Ed Rempel)
pedsim-design/        original design bundle (ARCHITECTURE.md, generate_scenario.py, sample package)
```

## Extending the scenario bank

`generate_scenario.py` (in the design bundle) runs Synthea offline and emits a
scenario package. To add it here, drop a `ScenarioPackage` module in
`lib/pedsim/scenarios/` and register it in `scenarios/index.ts`. The Scenario
Builder will pick it up automatically for its content domain.
