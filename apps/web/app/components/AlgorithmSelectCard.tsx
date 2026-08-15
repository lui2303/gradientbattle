'use client';

import { useId } from "react";
import { optimizationAlgorithms } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import { AlgorithmSelectCardProps, FrontendOptimizer } from "../types";
import { LockIcon, XIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

export default function AlgorithmSelectCard({allowedOptimizers, id, optimizers, setOptimizers}: AlgorithmSelectCardProps) {
    // `id` is a crypto.randomUUID() and differs between the server and client renders, so it
    // can't reach the DOM as a label/input id without breaking hydration. useId is SSR-stable.
    const fieldId = useId()
    // The game mode's allowedOptimizer config is the source of truth for which params are editable.
    const allowedOptimizer = allowedOptimizers.find((opt) => opt.name === optimizers[id]["name"])
    const startingPointFixed = allowedOptimizer?.startingPoint.fixed ?? false
    const color = optimizers[id].color

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
                        className="absolute inset-0 cursor-pointer opacity-0"
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

                <CardAction>
                    <Button
                        variant="ghost"
                        size="icon-sm"
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

            <CardContent className="grid grid-cols-2 gap-3">
                {Object.keys(optimizers[id]["params"]).map((param: string) => {
                    const enabled = allowedOptimizer?.params[param]?.enabled ?? true
                    return (
                        <div key={param} className="grid gap-1.5">
                            <Label htmlFor={`${fieldId}-${param}`} className="text-xs text-muted-foreground">
                                {param}
                                {!enabled && <PinnedLock label={param} />}
                            </Label>
                            <Input
                                id={`${fieldId}-${param}`}
                                disabled={!enabled}
                                className="font-mono tabular-nums"
                                min={0}
                                value={optimizers[id]["params"][param].value}
                                type="number"
                                step="0.01"
                                onChange={(option) => {
                                    const newValue = parseFloat(option.target.value)
                                    if (isNaN(newValue)) return
                                    setOptimizers(prev => ({...prev, [id]: {
                                        ...prev[id],
                                        params: { ...prev[id]["params"], [param]: {enabled: enabled, value: newValue}}
                                    }}))
                                }}
                            />
                        </div>
                    )
                })}

                {(["x", "y"] as const).map((axis) => (
                    <div key={axis} className="grid gap-1.5">
                        <Label htmlFor={`${fieldId}-${axis}`} className="text-xs text-muted-foreground">
                            start {axis}
                            {startingPointFixed && <PinnedLock label={`Starting ${axis}`} />}
                        </Label>
                        <Input
                            id={`${fieldId}-${axis}`}
                            disabled={startingPointFixed}
                            className="font-mono tabular-nums"
                            value={optimizers[id].startingPoint.value[axis]}
                            type="number"
                            onChange={(event) => {
                                const newValue = parseFloat(event.target.value)
                                if (isNaN(newValue)) return

                                setOptimizers(prev => ({...prev, [id]: {
                                    ...prev[id],
                                    startingPoint: { ...prev[id]["startingPoint"], value: { ...prev[id]["startingPoint"].value, [axis]: newValue } }
                                }}))
                            }}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
