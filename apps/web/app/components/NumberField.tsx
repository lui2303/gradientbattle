'use client'

import { useState } from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * A numeric field with grey chevron steppers.
 *
 * Deliberately `type="text"` rather than `type="number"`: Chrome renders a number
 * input's value in the *browser's* locale, so a German browser shows `0,05`. A text
 * input displays exactly the string we give it, and JS number formatting always uses
 * a dot. `inputMode="decimal"` keeps the numeric keypad on touch devices, and the
 * arrow-key stepping that `type="number"` provided is reimplemented below.
 */
export function NumberField({
    id,
    label,
    name,
    value,
    step = 1,
    min,
    max,
    disabled = false,
    adornment,
    onValueChange,
}: {
    id: string
    /** Rendered label — may be typeset math rather than plain text. */
    label: React.ReactNode
    /** Plain-text name for assistive tech, since `label` can be a MathJax node. */
    name: string
    value: number
    step?: number
    min?: number
    max?: number
    disabled?: boolean
    adornment?: React.ReactNode
    onValueChange: (value: number) => void
}) {
    // While the field is focused the raw keystrokes are shown, so intermediate states
    // like "0." or "-" survive instead of being rewritten mid-typing.
    const [draft, setDraft] = useState<string | null>(null)

    const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))

    // Stepping in floating point drifts (0.05 + 0.01 = 0.060000000000000005), so the
    // result is rounded back to the step's own precision.
    const decimals = (String(step).split(".")[1] ?? "").length
    const nudge = (direction: 1 | -1) => {
        const next = clamp(Number((value + direction * step).toFixed(decimals)))
        setDraft(null)
        onValueChange(next)
    }

    const shown = draft === null ? value : parseFloat(draft)
    const belowMin = !disabled && min !== undefined && shown < min
    const aboveMax = !disabled && max !== undefined && shown > max
    const hasRange = min !== undefined || max !== undefined
    const rangeId = `${id}-range`

    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {label}
                {adornment}
            </Label>
            <div className="relative">
                <Input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    value={draft ?? String(value)}
                    onChange={(event) => {
                        // A German keyboard's decimal key emits ","; accept it as a dot
                        // rather than rejecting the keystroke.
                        const raw = event.target.value.replace(",", ".")
                        setDraft(raw)
                        const next = parseFloat(raw)
                        if (isNaN(next)) return
                        onValueChange(clamp(next))
                    }}
                    onBlur={() => setDraft(null)}
                    onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                            event.preventDefault()
                            nudge(1)
                        } else if (event.key === "ArrowDown") {
                            event.preventDefault()
                            nudge(-1)
                        }
                    }}
                    aria-label={name}
                    aria-invalid={belowMin || aboveMax || undefined}
                    aria-describedby={hasRange ? rangeId : undefined}
                    className="pr-7 font-mono tabular-nums"
                />
                {!disabled && (
                    <div className="absolute inset-y-px right-px flex w-6 flex-col overflow-hidden rounded-r-[inherit] border-l border-border">
                        {([1, -1] as const).map((direction) => (
                            <button
                                key={direction}
                                type="button"
                                disabled={direction === 1 ? max !== undefined && value >= max : min !== undefined && value <= min}
                                // The field handles ArrowUp/ArrowDown itself, so these
                                // stay out of the tab order.
                                tabIndex={-1}
                                aria-label={`${direction === 1 ? "Increase" : "Decrease"} ${name}`}
                                onClick={() => nudge(direction)}
                                className={cn(
                                    "flex flex-1 items-center justify-center text-muted-foreground transition-colors",
                                    "hover:bg-muted hover:text-foreground",
                                    "disabled:pointer-events-none disabled:opacity-40",
                                )}
                            >
                                {direction === 1 ? (
                                    <ChevronUpIcon className="size-3" />
                                ) : (
                                    <ChevronDownIcon className="size-3" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {hasRange && (
                <div id={rangeId} className="-mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
                    <span className={cn(belowMin && "text-destructive")}>{min !== undefined && `min ${min}`}</span>
                    <span className={cn(aboveMax && "text-destructive")}>{max !== undefined && `max ${max}`}</span>
                </div>
            )}
        </div>
    )
}
