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

export function addRun(optimizers: Record<string, Optimizer>,timestamp: string,steps: number,animationSpeed: number,runID: string, funcName: string) {
    const index = Number(localStorage.getItem("INDEX")) || 0 // next free slot, 0 on first run

    const run: StoredRun = { runID, timestamp, optimizers, steps, animationSpeed, index, funcName }
    localStorage.setItem(String(index), JSON.stringify(run))
    localStorage.setItem("INDEX", String(index + 1))

    // ring buffer: once past MAX_RUNS, drop the run MAX_RUNS slots back.
    if (index - MAX_RUNS >= 0) localStorage.removeItem(String(index - MAX_RUNS))
}

export function getRuns(): StoredRun[] {
    if (typeof window === "undefined") return []

    const next = Number(localStorage.getItem("INDEX")) || 0
    const runs: StoredRun[] = []

    for (let i = next - 1; i >= 0 && i > next - 1 - MAX_RUNS; --i) {
        const raw = localStorage.getItem(String(i))
        if (!raw) continue
        try {
            runs.push(JSON.parse(raw) as StoredRun)
        } catch {}
    }
    return runs
}
