"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const STEPS = [
  { href: "/builder", label: "1 · Scenario" },
  { href: "/chart", label: "2 · Chart Review" },
  { href: "/encounter", label: "3 · Encounter" },
  { href: "/report", label: "4 · Score Report" },
]

export function PedSimNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              Ped
            </span>
            <span className="text-sm font-semibold tracking-tight">
              PedSim
            </span>
          </Link>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Simulation — Synthetic Data
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {STEPS.map((s) => {
            const active = pathname === s.href
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
