// PedSim — speech-to-text via Whisper (ARCHITECTURE.md §2.6: faster-whisper,
// local). Accepts recorded audio and returns a transcript by shelling out to
// scripts/whisper_stt.py. Used by browsers without the Web Speech API
// (Firefox/Safari) and as a higher-accuracy option everywhere. If Whisper
// isn't installed the client keeps using the browser recognizer / typing.
//
// Local (next dev / next start) only — subprocess isn't available on Cloudflare
// Workers.

import { spawn } from "node:child_process"
import { unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CMD = process.env.PEDSIM_WHISPER_CMD || "python"

function transcribe(file: string): Promise<string> {
  const script = join(process.cwd(), "scripts", "whisper_stt.py")
  return new Promise((resolve, reject) => {
    const p = spawn(CMD, [script, file], { windowsHide: true })
    let out = ""
    let err = ""
    p.stdout.on("data", (d) => (out += d.toString()))
    p.stderr.on("data", (d) => (err += d.toString()))
    p.on("error", reject) // e.g. python not found
    p.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err || `whisper exited ${code}`)),
    )
  })
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || ""
  const buf = Buffer.from(await req.arrayBuffer())
  if (!buf.length) return Response.json({ error: "empty audio" }, { status: 400 })

  const ext = ct.includes("ogg") ? "ogg" : ct.includes("wav") ? "wav" : "webm"
  const file = join(tmpdir(), `pedsim-stt-${randomUUID()}.${ext}`)

  try {
    await writeFile(file, buf)
    const text = await transcribe(file)
    return Response.json({ text })
  } catch (e) {
    return Response.json(
      {
        error: "whisper unavailable",
        detail: e instanceof Error ? e.message : String(e),
        hint: "pip install faster-whisper (and run the dev server from that environment)",
      },
      { status: 503 },
    )
  } finally {
    unlink(file).catch(() => {})
  }
}
