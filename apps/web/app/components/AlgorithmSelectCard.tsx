'use client';

import { useId, useRef, useState } from "react";
import { optimizationAlgorithms } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, FrontendOptimizer } from "../types";
import { CircleQuestionMarkIcon, LockIcon, XIcon } from "lucide-react";
import { LatexFormula } from "./LatexFormula";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "./NumberField";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[10px] font-medium tracking-wider text-foreground uppercase">
            {children}
        </span>
    )
}

/**
 * A parameter's label. When the key is just an ASCII spelling of its symbol
 * (`beta1` / `\beta_1`) the symbol alone is enough; otherwise the two are shown
 * together — `lr (α)` — so the control can be traced into the update rule.
 */
function paramLabel(param: string, symbol: string | undefined) {
    if (!symbol) return param
    const spelled = symbol.replace(/[\\_{}]/g, "")
    if (spelled === param.toLowerCase()) return <LatexFormula latex={symbol} />
    return (
        <span className="flex items-center gap-1">
            {param}
            <LatexFormula latex={`(${symbol})`} />
        </span>
    )
}

/**
 * The `?` panel showing an optimizer's update rule. Opens on hover, and a click pins
 * it open so the formula can be read without holding the pointer still — Radix's
 * tooltip closes on click by default, so `open` is controlled and the pinned state
 * overrides it. Escape or a click outside unpins.
 */
function DefinitionTooltip({ name, latex }: { name: string; latex: string }) {
    const [hovering, setHovering] = useState(false)
    const [pinned, setPinned] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)

    return (
        <Tooltip open={hovering || pinned} onOpenChange={setHovering}>
            <TooltipTrigger asChild>
                <Button
                    ref={triggerRef}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Show the update rule for ${name}`}
                    aria-expanded={hovering || pinned}
                    onClick={() => setPinned((previous) => !previous)}
                >
                    <CircleQuestionMarkIcon />
                </Button>
            </TooltipTrigger>
            <TooltipContent
                // Above the card: opening downward covered the parameter fields, which
                // are exactly what you want to read against the formula.
                side="top"
                sideOffset={6}
                align="end"
                // forceMount + `invisible` (not `hidden`): MathJax needs real layout to
                // typeset, and mounting on first hover meant the panel opened at
                // raw-text size and then jumped once the equation rendered. Mounted at
                // page load it is already measured, so opening is stable.
                forceMount
                onEscapeKeyDown={() => setPinned(false)}
                // The trigger is "outside" the content, so a click on it fires this too
                // — which unpinned a beat before onClick toggled, making the pin
                // impossible to switch off. Ignore pointer-downs on the trigger and let
                // its own handler own the toggle.
                onPointerDownOutside={(event) => {
                    const target = event.detail.originalEvent.target as Node | null
                    if (target && triggerRef.current?.contains(target)) return
                    setPinned(false)
                }}
                className="block max-w-md px-3 py-2 data-[state=closed]:pointer-events-none data-[state=closed]:invisible"
            >
                <p className="mb-1 text-xs font-medium">{name}</p>
                <LatexFormula latex={latex} display className="text-xs" />
            </TooltipContent>
        </Tooltip>
    )
}

// Marks a field the server pinned for this battle. The lock icon carries the state so
// it isn't communicated by colour alone.
function PinnedLock({ label }: { label: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center text-muted-foreground">
                    <LockIcon className="size-3" />
                    <span className="sr-only">{label} is pinned by the server</span>
                </span>
            </TooltipTrigger>
            <TooltipContent>Pinned by the server for this battle</TooltipContent>
        </Tooltip>
    )
}

export default function AlgorithmSelectCard({allowedOptimizers, id, optimizers, setOptimizers, locked = false}: AlgorithmSelectCardProps) {
    // `id` is a crypto.randomUUID() and differs between the server and client renders, so it
    // can't reach the DOM as a label/input id without breaking hydration. useId is SSR-stable.
    const fieldId = useId()
    // The game mode's allowedOptimizer config is the source of truth for which params are editable.
    const allowedOptimizer = allowedOptimizers.find((opt) => opt.name === optimizers[id]["name"])
    const startingPointFixed = allowedOptimizer?.startingPoint.fixed ?? false
    const color = optimizers[id].color
    // Parameter symbols and the update rule live in the core registry, beside the
    // parameter values they describe.
    const definition = optimizationAlgorithms[optimizers[id]["name"]]

    return (
        <Card size="sm">
            <CardHeader className="flex items-center gap-2">
                {/* The swatch doubles as the colour picker — it's the only saturated chrome
                    on the card, and it maps this card to its trace in the plots. */}
                <label
                    className="relative size-5 shrink-0 rounded-[4px] ring-1 ring-foreground/20"
                    style={{ backgroundColor: color }}
                >
                    <input
                        type="color"
                        value={color}
                        disabled={locked}
                        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        onChange={(e) => {
                            setOptimizers(prev => ({
                                ...prev, [id] : {
                                    ...prev[id],
                                    "color": e.target.value
                            }
                        }))}}
                    />
                    <span className="sr-only">Trace colour for {optimizers[id]["name"]}</span>
                </label>

                <Select
                    disabled={locked}
                    value={optimizers[id]["name"]}
                    onValueChange={(value) => {
                        const selected = allowedOptimizers.find((opt) => opt.name === value)
                        setOptimizers(prev => ({...prev, [id]: {
                            name: value,
                            params: Object.fromEntries(Object.entries(optimizationAlgorithms[value]["params"]).map(([key, paramValue]) => {return [key, { enabled: selected?.params[key]?.enabled ?? true, value: paramValue }]})),
                            startingPoint: selected ? {fixed: selected.startingPoint.fixed, value: {...selected.startingPoint.value}} : prev[id].startingPoint,
                            color: prev[id].color}}))
                    }}
                >
                    <SelectTrigger size="sm" className="min-w-0 flex-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {allowedOptimizers.map((algo) => <SelectItem key={algo.name} value={algo.name}>{algo.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <CardAction className="flex items-center gap-0.5">
                    {definition && (
                        <DefinitionTooltip name={optimizers[id]["name"]} latex={definition.latex} />
                    )}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={locked}
                        aria-label={`Remove ${optimizers[id]["name"]}`}
                        onClick={() => setOptimizers(prev => {
                            const copy = { ...prev } as Record<string, FrontendOptimizer>;
                            delete copy[id];
                            return copy
                        })}
                    >
                        <XIcon />
                    </Button>
                </CardAction>
            </CardHeader>

            {/* Params and the starting point are separate grids so the two coordinates
                always share a row instead of wrapping around an odd param count. */}
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <SectionHeader>Parameters</SectionHeader>
                    <div className="grid grid-cols-2 gap-3">
                    {Object.keys(optimizers[id]["params"]).map((param: string) => {
                        const enabled = allowedOptimizer?.params[param]?.enabled ?? true
                        const symbol = definition?.paramLatex[param]
                        return (
                            <NumberField
                                key={param}
                                id={`${fieldId}-${param}`}
                                label={paramLabel(param, symbol)}
                                name={param}
                                adornment={!enabled ? <PinnedLock label={param} /> : undefined}
                                disabled={!enabled || locked}
                                min={0}
                                step={0.01}
                                value={optimizers[id]["params"][param].value}
                                onValueChange={(newValue) => {
                                    setOptimizers(prev => ({...prev, [id]: {
                                        ...prev[id],
                                        params: { ...prev[id]["params"], [param]: {enabled: enabled, value: newValue}}
                                    }}))
                                }}
                            />
                        )
                    })}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <SectionHeader>Starting point</SectionHeader>
                    <div className="grid grid-cols-2 gap-3">
                    {(["x", "y"] as const).map((axis) => (
                        <NumberField
                            key={axis}
                            id={`${fieldId}-${axis}`}
                            label={<LatexFormula latex={axis} />}
                            name={`starting ${axis}`}
                            adornment={startingPointFixed ? <PinnedLock label={`Starting ${axis}`} /> : undefined}
                            disabled={startingPointFixed || locked}
                            step={1}
                            value={optimizers[id].startingPoint.value[axis]}
                            onValueChange={(newValue) => {
                                setOptimizers(prev => ({...prev, [id]: {
                                    ...prev[id],
                                    startingPoint: { ...prev[id]["startingPoint"], value: { ...prev[id]["startingPoint"].value, [axis]: newValue } }
                                }}))
                            }}
                        />
                    ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
