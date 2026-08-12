"use client"

// PedSim — user-tunable avatar & voice settings, persisted to localStorage so a
// tweak survives reloads. Read live by the encounter (avatar URL + child voice).

import { useCallback, useEffect, useState } from "react"

export interface AvatarSettings {
  avatarUrl: string // "" = built-in stylized head
  childPitch: number // 0.5 – 2   (browser voice only)
  childRate: number // 0.5 – 1.5  (browser voice only)
  childVoice: string // voice name, "" = auto-pick (browser voice only)
  hdVoice: boolean // use edge-tts (/api/tts) neural child voice
}

export const DEFAULT_SETTINGS: AvatarSettings = {
  avatarUrl: "",
  childPitch: 1.9,
  childRate: 0.9,
  childVoice: "",
  hdVoice: false,
}

const KEY = "pedsim.avatar.settings.v1"

export function loadSettings(): AvatarSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AvatarSettings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useAvatarSettings() {
  const [settings, setSettings] = useState<AvatarSettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings, hydrated])

  const update = useCallback((partial: Partial<AvatarSettings>) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  return { settings, update, reset, hydrated }
}
