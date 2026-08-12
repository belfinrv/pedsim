# Running PedSim on Windows

Step-by-step to clone and run PedSim locally on a Windows PC.

## 1. Prerequisites (install once)

- **Git** — https://git-scm.com/download/win
- **Node.js 18+ (LTS)** — https://nodejs.org

Verify in a new PowerShell window:

```powershell
git --version
node --version   # should be v18 or higher
```

## 2. Clone the repo

Open **PowerShell** and clone straight into your target folder (Git creates it):

```powershell
git clone https://github.com/belfinrv/pedsim.git "C:\Users\BRobinson\OneDrive - American Board of Pediatrics\Documents\Projects\PedSim"
cd "C:\Users\BRobinson\OneDrive - American Board of Pediatrics\Documents\Projects\PedSim"
```

> The path has spaces, so it **must** stay wrapped in quotes in every command.

## 3. Install dependencies

```powershell
npm install -g pnpm   # only needed the first time
pnpm install
```

## 4. Run it

```powershell
pnpm dev
```

Open **http://localhost:3000** — PedSim runs on the deterministic rule engine
with no API key required. Walk the flow: Scenario → Chart Review → Encounter →
Score Report.

## 5. (Optional) Add a model for LLM dialogue + grading

Create a file named **`.env.local`** in the project folder (copy
`.env.local.example`) and put your key in it:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PEDSIM_MODEL=claude-sonnet-5
```

Stop the dev server (Ctrl+C) and run `pnpm dev` again. Now Claude writes the
child/parent dialogue and grades the rubric — the encounter header switches from
**RULE ENGINE** to **LLM ENGINE**. Rapport math and fact-tracking stay
deterministic on the server either way.

`.env.local` is git-ignored, so your key is never committed.

## 6. Later: get updates

```powershell
git pull
pnpm install   # in case dependencies changed
pnpm dev
```

---

## Windows gotchas

**OneDrive + node_modules.** This folder lives inside OneDrive, which will try
to sync `node_modules` (tens of thousands of files) — slow, and it can cause
file-lock errors during `pnpm install` or `pnpm dev`. Options, best first:

1. Clone to a non-OneDrive path instead, e.g. `C:\Projects\PedSim`. Cleanest.
2. Or exclude `node_modules` from syncing: after `pnpm install`, right-click the
   `node_modules` folder → **Free up space** (and keep the project folder set to
   *Always keep on this device* so the source files stay local).

**"pnpm : cannot be loaded because running scripts is disabled".** PowerShell's
execution policy is blocking npm shims. Fix in the same window:

```powershell
Set-ExecutionPolicy -Scope Process -Bypass
```

Then re-run the `pnpm` command. (Scoped to the current window only; nothing
permanent.) Alternatively use `pnpm.cmd install` / `pnpm.cmd dev`.

**Port 3000 already in use.** Run on another port:

```powershell
pnpm dev -- -p 3001
```

**Prefer not to install pnpm?** You can use npm instead:

```powershell
npm install
npm run dev
```

## Build for production locally

```powershell
pnpm build
pnpm start        # serves the production build on http://localhost:3000
```

For deploying to Cloudflare Workers, see the **Deploying to Cloudflare Workers**
section in `README.md`.
