'use client'

import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useEffect, useMemo, useRef, useState } from "react"
import { Iterate, FrontendOptimizer } from "../types"
import ContourPlot from "./ContourPlot"
import { FunctionSelector } from "./FunctionSelector"
import { objectiveFunction } from "@gradientbattle/core"
import { norm } from "@gradientbattle/core/src/math_helper"
import { Point } from "@gradientbattle/core/src/types"
import { DistancePlot } from "./DistancePlot"
import { ObjectiveValuePlot } from "./ObjectiveValuePlot"
import type { Config, Data, PlotHoverEvent, PlotlyHTMLElement } from "plotly.js"
import { Leaderboard } from "./Leaderboard"
import { SimulationMode } from "@/lib/simulationMode"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic_function"
import { PlayIcon, SquareIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { contourLayout, contourStyle, getPlotTheme, metricLayout, SERIES_COLORS, traceLine } from "@/lib/plotTheme"

const loadPlotly = () => import('plotly.js-cartesian-dist-min').then((m) => m.default);

// Stable, non-reactive figure config/layouts.
const config: Partial<Config> = { displayModeBar: false, typesetMath: true, responsive: true }

const MARKER_SIZE = 4

export function Simulation({ mode }: { mode: SimulationMode }) {
    const contourDiv = useRef<HTMLDivElement | null>(null)
    const distanceDiv = useRef<HTMLDivElement | null>(null)
    const objectiveDiv = useRef<HTMLDivElement | null>(null)

    const plotlyRef = useRef<typeof import('plotly.js') | null>(null)
    const [ready, setReady] = useState(false)

    const [func, setFunc] = useState<objectiveFunction>(new quadraticFunction([[1,0],[0,1]], {x: 0, y: 0}, 0))
    const [optimizers, setOptimizers] = useState<Record<string, FrontendOptimizer>>(() => ({
        [crypto.randomUUID()]: { ...mode.allowedOptimizer[0], color: SERIES_COLORS[0] },
    }))

    const [currentIterate, setcurrentIterate] = useState<Record<string, Iterate>>({})
    const [iterateSeed, setIterateSeed] = useState<{ optimizers: typeof optimizers; func: typeof func } | null>(null)

    const [running, setRunning] = useState(false);
    const runningRef = useRef(false);

    const [animationSpeed, setAnimationSpeed] = useState(50)

    if (iterateSeed?.optimizers !== optimizers || iterateSeed?.func !== func) {
        setIterateSeed({ optimizers, func })
        const seed: Record<string, Iterate> = {}
        for (const [id, opt] of Object.entries(optimizers)) {
            seed[id] = [norm(opt.startingPoint.value), func.objective(opt.startingPoint.value)]
        }
        setcurrentIterate(seed)
    }

    // The loss surface is expensive (101x101 objective evaluations); recompute only when func changes.
    const surfaceTrace = useMemo<Data>(() => {
        const x = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)
        const y = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)
        const z = y.map((yv) => x.map((xv) => func.objective({ x: xv, y: yv })))
        return {
            type: 'contour' as const,
            x, y, z,
            name: 'Loss surface',
            ...contourStyle(getPlotTheme()),
        }
    }, [func])

    // Create the three plots once Plotly has loaded, then flip `ready`. Purge on unmount.
    useEffect(() => {
        let cancelled = false
        const divs: HTMLDivElement[] = []
        loadPlotly().then((Plotly) => {
            if (cancelled) return
            plotlyRef.current = Plotly
            const c = contourDiv.current, d = distanceDiv.current, o = objectiveDiv.current
            if (!c || !d || !o) return
            divs.push(c, d, o)
            Promise.all([
                Plotly.newPlot(c, [], {}, config),
                Plotly.newPlot(d, [], {}, config),
                Plotly.newPlot(o, [], {}, config),
            ]).then(() => { if (!cancelled) setReady(true) })
        })
        return () => {
            cancelled = true
            const Plotly = plotlyRef.current
            if (Plotly) divs.forEach((div) => Plotly.purge(div))
        }
    }, [])

    useEffect(() => {
        const Plotly = plotlyRef.current
        if (!ready || !Plotly) return
        const c = contourDiv.current, d = distanceDiv.current, o = objectiveDiv.current
        if (!c || !d || !o) return

        const theme = getPlotTheme()

        // Contour plots position (x, y); the other two plot a metric against the step index, so
        // their seeds start at step 0 with the metric of the starting point.
        const entries = Object.entries(optimizers)
        const seedStyle = (opt: FrontendOptimizer) => ({
            type: 'scatter' as const,
            mode: 'lines+markers' as const,
            line: traceLine(opt.color),
            marker: { size: MARKER_SIZE, color: opt.color },
        })

        const contourSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [opt.startingPoint.value.x],
            y: [opt.startingPoint.value.y],
            name: id,
            ...seedStyle(opt),
        }))
        const distanceSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [0],
            y: [norm(opt.startingPoint.value)],
            name: id,
            ...seedStyle(opt),
        }))

        const objectiveSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [0],
            y: [func.objective(opt.startingPoint.value)],
            name: id,
            ...seedStyle(opt),
        }))

        Plotly.react(c, [surfaceTrace, ...contourSeeds], contourLayout(theme, func.latex), config)
        Plotly.react(d, distanceSeeds, metricLayout(theme, 'Norm(x)'), config)
        Plotly.react(o, objectiveSeeds, metricLayout(theme, 'f(x)'), config)
    }, [func, optimizers, ready, surfaceTrace])

    // Resizer
    useEffect(() => {
        const Plotly = plotlyRef.current
        if (!ready || !Plotly) return
        const divs = [contourDiv.current, distanceDiv.current, objectiveDiv.current]
            .filter((el): el is HTMLDivElement => el !== null)
        const ro = new ResizeObserver(() => divs.forEach((el) => {
            if (el.isConnected && el.offsetParent !== null) Plotly.Plots.resize(el)
        }))
        divs.forEach((el) => ro.observe(el))
        return () => ro.disconnect()
    }, [ready])


    useEffect(() => {
        const Plotly = plotlyRef.current
        if (!ready || !Plotly) return
        const divs = [contourDiv.current, distanceDiv.current, objectiveDiv.current]
            .filter((el): el is HTMLDivElement => el !== null)
            .map((el) => el as unknown as PlotlyHTMLElement)

        const highlight = (hoveredId: string | null) => {
            for (const gd of divs) {
                const indices: number[] = []
                const opacities: number[] = []
                gd.data.forEach((trace, i) => {
                    if (trace.type === 'contour') return
                    indices.push(i)
                    opacities.push(hoveredId === null || trace.name === hoveredId ? 1 : 0.4)
                })
                // Plotly accepts a per-trace array here, but @types/plotly.js types opacity as a scalar.
                if (indices.length) Plotly.restyle(gd, { opacity: opacities } as unknown as Data, indices)
            }
        }

        const onHover = (e: PlotHoverEvent) => {
            const name = e.points?.[0]?.data?.name
            highlight(typeof name === 'string' ? name : null)
        }
        const onUnhover = () => highlight(null)

        divs.forEach((gd) => {
            gd.on('plotly_hover', onHover)
            gd.on('plotly_unhover', onUnhover)
        })
        return () => {
            divs.forEach((gd) => {
                gd.removeAllListeners?.('plotly_hover')
                gd.removeAllListeners?.('plotly_unhover')
            })
        }
    }, [ready])

    const playSimulation = async () => {
        const Plotly = plotlyRef.current
        // A second click while running acts as Stop.
        if (runningRef.current) {
            runningRef.current = false;
            setRunning(false);
            return
        }

        if (!ready || !Plotly) return
        const c = contourDiv.current, d = distanceDiv.current, o = objectiveDiv.current
        if (!c || !d || !o) return

        const ids = Object.keys(optimizers)
        if (ids.length === 0) return

        // Trace-index mapping: the contour plot has the loss surface at index 0, so its optimizer
        // traces are offset by one; the metric plots have optimizers at 0..n-1.
        const contourIdx = ids.map((_, i) => i + 1)
        const stepIdx = ids.map((_, i) => i)

        runningRef.current = true;
        setRunning(true);


        const { traces }: { traces: Point[][]| null } = await mode.run(optimizers, func.name, 100)

        if(!traces) {
            runningRef.current = false
            setRunning(false)
            return
        }

        // Reset every trace back to its starting point so replays don't append onto the last run.
        const starts = ids.map((id) => optimizers[id].startingPoint)
        Plotly.restyle(c, { x: starts.map((p) => [p.value.x]), y: starts.map((p) => [p.value.y]) }, contourIdx)
        Plotly.restyle(d, { x: stepIdx.map(() => [0]), y: starts.map((p) => [norm(p.value)]) }, stepIdx)
        Plotly.restyle(o, { x: stepIdx.map(() => [0]), y: starts.map((p) => [func.objective(p.value)]) }, stepIdx)


        // Append one simulation step per frame. Each `step` is one Point per optimizer, in id order.
        for (let s = 0; s < traces.length; s++) {

            if (runningRef.current !== true) return
            const step = traces[s]
            const stepNumber = s + 1
            Plotly.extendTraces(c, { x: step.map((p) => [p.x]), y: step.map((p) => [p.y]) }, contourIdx)
            Plotly.extendTraces(d, { x: stepIdx.map(() => [stepNumber]), y: step.map((p) => [norm(p)]) }, stepIdx)
            Plotly.extendTraces(o, { x: stepIdx.map(() => [stepNumber]), y: step.map((p) => [func.objective(p)]) }, stepIdx)
            setcurrentIterate(prev => {
                const next: Record<string, Iterate> = { ...prev };
                ids.forEach((id, i) => {
                    next[id] = [norm(step[i]), func.objective(step[i])]
                })
                return next
            })

            await new Promise((r) => setTimeout(r, animationSpeed));
        }

        mode.onRunComplete?.()


        runningRef.current = false;
        setRunning(false);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-normal text-muted-foreground">Trajectory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ContourPlot divRef={contourDiv}></ContourPlot>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-normal text-muted-foreground">Distance to optimum</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DistancePlot divRef={distanceDiv}></DistancePlot>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-normal text-muted-foreground">Objective value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ObjectiveValuePlot divRef={objectiveDiv}></ObjectiveValuePlot>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <Button onClick={playSimulation} variant={running ? "destructive" : "default"}>
                        {running ? <SquareIcon /> : <PlayIcon />}
                        {running ? "Stop" : "Start"}
                    </Button>

                    <Separator orientation="vertical" className="hidden data-vertical:h-6 data-vertical:self-center sm:block" />

                    <div className="flex items-center gap-3">
                        <Label htmlFor="animation-speed" className="text-muted-foreground">Speed</Label>
                        <Slider
                            id="animation-speed"
                            className="w-32 sm:w-40"
                            min={50}
                            max={2000}
                            step={50}
                            value={[animationSpeed]}
                            onValueChange={([value]) => setAnimationSpeed(value)}
                        />
                        <span className="w-16 font-mono text-xs tabular-nums text-muted-foreground">
                            {animationSpeed} ms
                        </span>
                    </div>

                    <div className="ml-auto">
                        <FunctionSelector
                            allowedFunctions={mode.allowedFunctions}
                            func={func}
                            setFuncCallback={(func) => { setFunc(func) }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Leaderboard optimizers={optimizers} currentIterates={currentIterate}></Leaderboard>

            <AlgorithmSelectContainer allowedOptimizers={mode.allowedOptimizer} defaultOptimizer={mode.allowedOptimizer[0]} optimizers={optimizers} setOptimizers={setOptimizers}>
            </AlgorithmSelectContainer>
        </div>
    )
}
