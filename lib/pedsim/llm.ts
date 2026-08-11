// PedSim — thin Anthropic Messages API client (no SDK dependency).
// If ANTHROPIC_API_KEY is unset the callers fall back to the deterministic
// engine, so the whole prototype runs at $0 with zero configuration.

export const PEDSIM_MODEL = process.env.PEDSIM_MODEL || "claude-sonnet-5"

export function llmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

interface AnthropicMessage {
  role: "user" | "assistant"
  content: string
}

export async function callAnthropic(opts: {
  system: string
  messages: AnthropicMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: PEDSIM_MODEL,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.7,
        system: opts.system,
        messages: opts.messages,
      }),
    })
    if (!res.ok) {
      console.error("[pedsim] Anthropic API error", res.status, await res.text())
      return null
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[]
    }
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim()
    return text || null
  } catch (err) {
    console.error("[pedsim] Anthropic API call failed", err)
    return null
  }
}
