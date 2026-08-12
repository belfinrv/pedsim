// PedSim — HD voice via edge-tts (ARCHITECTURE.md §2.6: edge-tts en-US-AnaNeural
// child voice, free). Shells out to the maintained Python `edge-tts` CLI and
// returns MP3. If edge-tts isn't installed the client falls back to the
// browser Web Speech voice, so this is a pure upgrade with no hard dependency.
//
// Local (next dev / next start) only — subprocess isn't available on Cloudflare
// Workers; there the client keeps using the browser voice.

import { spawn } from "node:child_process"
import { readFile, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Neural voices: a child voice for the patient, a warm adult for the parent.
const VOICES = {
  child: "en-US-AnaNeural",
  parent: "en-US-AriaNeural",
} as const

const CMD = process.env.PEDSIM_EDGE_TTS_CMD || "edge-tts"

function synth(text: string, voice: string, out: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(CMD, ["--voice", voice, "--text", text, "--write-media", out], {
      windowsHide: true,
    })
    let err = ""
    p.stderr.on("data", (d) => (err += d.toString()))
    p.on("error", reject) // e.g. edge-tts not installed
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(err || `edge-tts exited ${code}`)),
    )
  })
}

export async function POST(req: Request) {
  let body: { text?: string; role?: "child" | "parent"; voice?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 })
  }
  const text = (body.text || "").trim()
  if (!text) return Response.json({ error: "empty text" }, { status: 400 })

  const voice = body.voice || VOICES[body.role === "parent" ? "parent" : "child"]
  const out = join(tmpdir(), `pedsim-tts-${randomUUID()}.mp3`)

  try {
    await synth(text, voice, out)
    const audio = await readFile(out)
    return new Response(new Uint8Array(audio), {
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    })
  } catch (e) {
    // Most common: `edge-tts` not on PATH. Signal so the client falls back.
    return Response.json(
      {
        error: "edge-tts unavailable",
        detail: e instanceof Error ? e.message : String(e),
        hint: "pip install edge-tts (and run the dev server from that environment)",
      },
      { status: 503 },
    )
  } finally {
    unlink(out).catch(() => {})
  }
}
