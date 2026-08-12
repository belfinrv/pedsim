"use client"

import { useEffect, useState } from "react"
import { RotateCcw, Volume2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { listVoices, speak, cancelSpeech } from "@/lib/pedsim/speech"
import type { AvatarSettings } from "@/lib/pedsim/avatar-settings"

export function AvatarSettingsPanel({
  settings,
  onUpdate,
  onReset,
  onClose,
  childName,
}: {
  settings: AvatarSettings
  onUpdate: (p: Partial<AvatarSettings>) => void
  onReset: () => void
  onClose: () => void
  childName: string
}) {
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([])
  const [urlDraft, setUrlDraft] = useState(settings.avatarUrl)

  useEffect(() => {
    listVoices().then(setVoices)
  }, [])
  useEffect(() => setUrlDraft(settings.avatarUrl), [settings.avatarUrl])

  const testVoice = () => {
    cancelSpeech()
    speak(`Hi! I'm ${childName}. Is this how I sound?`, "child", {
      enabled: true,
      pitch: settings.childPitch,
      rate: settings.childRate,
      voiceName: settings.childVoice,
    })
  }

  return (
    <div className="absolute right-3 top-12 z-20 w-[300px] rounded-xl border border-border bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Avatar &amp; voice</p>
        <button
          onClick={onClose}
          className="grid size-6 place-items-center rounded hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Avatar URL */}
        <div className="space-y-1.5">
          <Label className="text-xs">Ready Player Me avatar URL</Label>
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://models.readyplayer.me/<id>.glb"
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => onUpdate({ avatarUrl: urlDraft.trim() })}
            >
              Apply avatar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setUrlDraft("")
                onUpdate({ avatarUrl: "" })
              }}
            >
              Built-in
            </Button>
          </div>
          <p className="text-[10px] leading-tight text-muted-foreground">
            Create one at readyplayer.me, then append{" "}
            <code>?morphTargets=ARKit,Oculus%20Visemes</code> for lip-sync.
            Falls back to the stylized head if it can&apos;t load.
          </p>
        </div>

        {/* Voice picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Child voice</Label>
          <select
            value={settings.childVoice}
            onChange={(e) => onUpdate({ childVoice: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Auto</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Pitch */}
        <Slider
          label="Pitch (higher = younger)"
          min={0.5}
          max={2}
          step={0.1}
          value={settings.childPitch}
          onChange={(v) => onUpdate({ childPitch: v })}
        />
        {/* Rate */}
        <Slider
          label="Rate (lower = slower)"
          min={0.5}
          max={1.5}
          step={0.05}
          value={settings.childRate}
          onChange={(v) => onUpdate({ childRate: v })}
        />

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-8 flex-1 text-xs" onClick={testVoice}>
            <Volume2 className="size-3.5" /> Test voice
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={onReset}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}
