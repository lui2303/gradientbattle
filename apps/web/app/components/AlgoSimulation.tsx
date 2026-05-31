'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useEffect, useMemo, useRef, useState } from "react"
import { Optimizer } from "../types"
import ContourPlot from "./ContourPlot"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic_function"
import { FunctionSelector } from "./FunctionSelector"
import { objectiveFunction } from "@gradientbattle/core"
import { norm } from "@gradientbattle/core/src/math_helper"
import { Point } from "@gradientbattle/core/src/types"
import { DistancePlot } from "./DistancePlot"
import { ObjectiveValuePlot } from "./ObjectiveValuePlot"
import type { Config, Data, Layout, PlotHoverEvent, PlotlyHTMLElement } from "plotly.js"
import { Leaderboard } from "./Leaderboard"

const loadPlotly = () => import('plotly.js-cartesian-dist-min').then((m) => m.default);

// Stable, non-reactive figure config/layouts. The contour layout depends on `func` so it is
// built inside the rebuild effect; these two never change.
const config: Partial<Config> = { displayModeBar: false, typesetMath: true, responsive: true }

const distanceLayout: Partial<Layout> = {
    xaxis: { title: { text: 'steps' }, color: 'white', autorange: true },
    yaxis: { title: { text: 'Norm(x)' }, color: 'white', autorange: true },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    showlegend: false,
    legend: { itemclick: false, itemdoubleclick: false },
}

const objectiveLayout: Partial<Layout> = {
    xaxis: { title: { text: 'steps' }, color: 'white', autorange: true },
    yaxis: { title: { text: 'f(x)' }, color: 'white', autorange: true },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    showlegend: false,
    legend: { itemclick: false, itemdoubleclick: false },
}

export function AlgoSimulation() {

    // The three plots are mounted as bare <div>s; Plotly draws into them imperatively.
    const contourDiv = useRef<HTMLDivElement | null>(null)
    const distanceDiv = useRef<HTMLDivElement | null>(null)
    const objectiveDiv = useRef<HTMLDivElement | null>(null)

    const plotlyRef = useRef<typeof import('plotly.js') | null>(null)
    const [ready, setReady] = useState(false)

    const defaultOptimizer = {
        "name": optimizationAlgorithmsList[0],
        "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"],
        "startingPoint": { x: 5, y: 5 },
        "color": "#0bf565"
    }

    const [func, setFunc] = useState<objectiveFunction>(new quadraticFunction([[1, 0], [0, 1]], { x: 0, y: 0 }, 0))

    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({ [crypto.randomUUID()]: defaultOptimizer })

    const [currentIterate, setcurrentIterate] = useState<Record<string, number[]>>({})
    const [iterateSeed, setIterateSeed] = useState<{ optimizers: typeof optimizers; func: typeof func } | null>(null)

    if (iterateSeed?.optimizers !== optimizers || iterateSeed?.func !== func) {
        setIterateSeed({ optimizers, func })
        const seed: Record<string, number[]> = {}
        for (const [id, opt] of Object.entries(optimizers)) {
            seed[id] = [norm(opt.startingPoint), func.objective(opt.startingPoint)]
        }
        setcurrentIterate(seed)
    }

    const [running, setRunning] = useState(false);
    const runningRef = useRef(false);

    const [animationSpeed, setAnimationSpeed] = useState(50)

    // The loss surface is expensive (101x101 objective evaluations); recompute only when func changes.
    const surfaceTrace = useMemo<Data>(() => {
        const x = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)
        const y = Array.from({ length: 101 }, (_, i) => i * 0.2 - 10)
        const z = y.map((yv) => x.map((xv) => func.objective({ x: xv, y: yv })))
        return {
            type: 'contour' as const,
            x, y, z,
            name: 'Loss surface',
            colorbar: { tickfont: { color: 'white' } },
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

        // Contour plots position (x, y); the other two plot a metric against the step index, so
        // their seeds start at step 0 with the metric of the starting point.
        const entries = Object.entries(optimizers)
        const contourSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [opt.startingPoint.x],
            y: [opt.startingPoint.y],
            type: 'scatter' as const,
            mode: 'lines+markers' as const,
            name: id,
            line: { color: opt.color },
        }))
        const distanceSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [0],
            y: [norm(opt.startingPoint)],
            type: 'scatter' as const,
            mode: 'lines+markers' as const,
            name: id,
            line: { color: opt.color },
        }))
        
        const objectiveSeeds: Data[] = entries.map(([id, opt]) => ({
            x: [0],
            y: [func.objective(opt.startingPoint)],
            type: 'scatter' as const,
            mode: 'lines+markers' as const,
            name: id,
            line: { color: opt.color },
        }))

        const contourLayout: Partial<Layout> = {
            title: { text: `$${func.latex}$`, font: { color: 'white' } },
            xaxis: { title: { text: 'x' }, color: 'white', range: [-10, 10], autorange: false },
            yaxis: { title: { text: 'y' }, color: 'white', range: [-10, 10], autorange: false },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            autosize: true,
            showlegend: false,
            legend: { itemclick: false, itemdoubleclick: false },
        }

        Plotly.react(c, [surfaceTrace, ...contourSeeds], contourLayout, config)
        Plotly.react(d, distanceSeeds, distanceLayout, config)
        Plotly.react(o, objectiveSeeds, objectiveLayout, config)
    }, [func, optimizers, ready, surfaceTrace])

    // Plotly no longer auto-resizes (we dropped react-plotly's useResizeHandler); do it ourselves.
    useEffect(() => {
        const Plotly = plotlyRef.current
        if (!ready || !Plotly) return
        const divs = [contourDiv.current, distanceDiv.current, objectiveDiv.current]
            .filter((el): el is HTMLDivElement => el !== null)
        const ro = new ResizeObserver(() => divs.forEach((el) => Plotly.Plots.resize(el)))
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
                gd.removeAllListeners('plotly_hover')
                gd.removeAllListeners('plotly_unhover')
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

        const res = await fetch("/api/run_optimizers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                optimizers,
                steps: 100,
                challengeId: 1,
            }),
        });
        const { traces }: { traces: Point[][] } = await res.json();

        // Reset every trace back to its starting point so replays don't append onto the last run.
        const starts = ids.map((id) => optimizers[id].startingPoint)
        Plotly.restyle(c, { x: starts.map((p) => [p.x]), y: starts.map((p) => [p.y]) }, contourIdx)
        Plotly.restyle(d, { x: stepIdx.map(() => [0]), y: starts.map((p) => [norm(p)]) }, stepIdx)
        Plotly.restyle(o, { x: stepIdx.map(() => [0]), y: starts.map((p) => [func.objective(p)]) }, stepIdx)

        // Append one simulation step per frame. Each `step` is one Point per optimizer, in id order.
        for (let s = 0; s < traces.length; s++) {
            
            if (runningRef.current !== true) return
            const step = traces[s]
            const stepNumber = s + 1
            Plotly.extendTraces(c, { x: step.map((p) => [p.x]), y: step.map((p) => [p.y]) }, contourIdx)
            Plotly.extendTraces(d, { x: stepIdx.map(() => [stepNumber]), y: step.map((p) => [norm(p)]) }, stepIdx)
            Plotly.extendTraces(o, { x: stepIdx.map(() => [stepNumber]), y: step.map((p) => [func.objective(p)]) }, stepIdx)
            setcurrentIterate(prev => {
                const next = { ...prev };
                Object.entries(next).forEach(([id, _], i) => {
                    next[id] = [norm(step[i]), func.objective(step[i])]
                })
                return next
            })
            
            await new Promise((r) => setTimeout(r, animationSpeed));
        }

        runningRef.current = false;
        setRunning(false);
    };

    return (
        <div>
            <div className="flex flex-col gap-4 p-4">

                <div className="grid grid-cols-3 gap-4">
                    <ContourPlot divRef={contourDiv}></ContourPlot>

                    <DistancePlot divRef={distanceDiv}></DistancePlot>

                    <ObjectiveValuePlot divRef={objectiveDiv}></ObjectiveValuePlot>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <Leaderboard optimizers={optimizers} currentIterates={currentIterate}></Leaderboard>

                    <button className="bg-cyan-800" onClick={playSimulation}>{running ? "Stop" : "Start"}</button>
                    <br />
                    <label>Animation Speed: {animationSpeed} ms</label>
                    <input
                        type="range"
                        min="50"
                        max="2000"
                        value={animationSpeed}
                        onChange={(e) => setAnimationSpeed(Number(e.target.value))}

                    />
                </div>
                <FunctionSelector func={func} setFuncCallback={(func) => { setFunc(func) }}></FunctionSelector>

                <AlgorithmSelectContainer func={func} optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer}>
                </AlgorithmSelectContainer>
            </div>
        </div>

    )
}
