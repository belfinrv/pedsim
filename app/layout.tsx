import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { PedSimProvider } from "@/components/provider"
import { PedSimNav } from "@/components/nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PedSim — Pediatric Avatar Assessment",
  description:
    "Simulated child-patient encounters for assessing pediatricians' communication, history-taking, and counseling skills. Synthetic data only.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans antialiased`}>
        <PedSimProvider>
          <div className="min-h-screen bg-background text-foreground">
            <PedSimNav />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground">
              PedSim prototype · Scores ABP Core Competencies 3 &amp; 4 · No PHI,
              no real children&apos;s faces or voices — synthetic simulation
              only.
            </footer>
          </div>
        </PedSimProvider>
      </body>
    </html>
  )
}
