'use client'

import { Optimizer } from "@/app/types"

const MAX_RUNS = 40

export type StoredRun = {
    runID: string
    timestamp: string
    optimizers: Record<string, Optimizer>
    steps: number
    animationSpeed: number
    index: number
    funcName: string
}

export type SavedNotebook = {
    description: string
    timestamp: string
    optimizers: Record<string, Optimizer>
    steps: number
    animationSpeed: number
    index: number
    funcName: string
}

function derivePrefix(payload: Omit<SavedNotebook, "index"> | Omit<StoredRun, "index">) {
    return "runID" in payload ? "history:" : "saved:"
}
export function addRun(payload: SavedNotebook | StoredRun) {
    const prefix = derivePrefix(payload)
    const index = Number(localStorage.getItem(prefix + "INDEX")) || 0 // next free slot, 0 on first run

    localStorage.setItem(prefix + String(index), JSON.stringify(payload))
    localStorage.setItem(prefix + "INDEX", String(index + 1))

    // ring buffer: once past MAX_RUNS, drop the run MAX_RUNS slots back.
    if (index - MAX_RUNS >= 0) localStorage.removeItem(prefix + String(index - MAX_RUNS))
}

export function getRuns(prefix: "history:"): StoredRun[]
export function getRuns(prefix: "saved:"): SavedNotebook[]
export function getRuns(prefix: "history:" | "saved:"): (StoredRun | SavedNotebook)[] {
    if (typeof window === "undefined") return []

    const next = Number(localStorage.getItem(prefix + "INDEX")) || 0
    const runs: (StoredRun | SavedNotebook)[] = [];

    for (let i = next - 1; i >= 0 && i > next - 1 - MAX_RUNS; --i) {
        const raw = localStorage.getItem(prefix + String(i))
        if (!raw) continue
        try {
            if(prefix==="history:") {
                runs.push(JSON.parse(raw) as StoredRun)
            } else {
                runs.push(JSON.parse(raw) as SavedNotebook)
            }
            
        } catch {}
    }
    return runs
}
