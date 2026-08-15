'use client'

import { useEffect, useRef } from "react"

// MathJax 2 is loaded beforeInteractive in layout.tsx and auto-typesets the initial
// document. React-rendered content that changes later has to be queued explicitly.
declare global {
    interface Window {
        MathJax?: { Hub: { Queue: (args: unknown[]) => void } }
    }
}

/**
 * A page can hold dozens of these (one per optimizer parameter, per card), and one
 * MathJax pass per instance is slow enough that later nodes visibly render as raw
 * `\(x\)` before catching up. Elements mounting in the same tick are collected and
 * typeset in a single pass instead.
 */
const pending = new Set<HTMLElement>()
let flushScheduled = false

function scheduleTypeset(element: HTMLElement) {
    pending.add(element)
    if (flushScheduled) return
    flushScheduled = true
    queueMicrotask(() => {
        const batch = [...pending]
        pending.clear()
        flushScheduled = false
        // MathJax 2's Typeset accepts an array of elements.
        window.MathJax?.Hub.Queue(["Typeset", window.MathJax.Hub, batch])
    })
}

export function LatexFormula({
    latex,
    display = false,
    className,
}: {
    latex: string
    /** Block equation (centred, own line) rather than inline. */
    display?: boolean
    className?: string
}) {
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        // \( \) and \[ \] are MathJax 2's default delimiters; $...$ is off by default.
        el.textContent = display ? `\\[${latex}\\]` : `\\(${latex}\\)`
        scheduleTypeset(el)
        return () => {
            pending.delete(el)
        }
    }, [latex, display])

    return <div ref={ref} className={className} />
}
