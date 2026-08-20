'use client'

import { useEffect, useRef, useState } from "react"
import type { Config, Data, Layout } from "plotly.js"
import { getPlotTheme, metricLayout, SERIES_COLORS } from "@/lib/plotTheme"

const loadPlotly = () => import('plotly.js-cartesian-dist-min').then((m) => m.default)

const config: Partial<Config> = { staticPlot: true, displayModeBar: false, typesetMath: true, responsive: true }

export type DistanceSeries = {
    label: string
    distances: number[]
}

export function SubmissionDistancePlot({ series }: { series: DistanceSeries[] }) {
    const divRef = useRef<HTMLDivElement | null>(null)
    const plotlyRef = useRef<typeof import('plotly.js') | null>(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false
        const div = divRef.current
        loadPlotly().then((Plotly) => {
            if (cancelled || !div) return
            plotlyRef.current = Plotly
            Plotly.newPlot(div, [], {}, config).then(() => { if (!cancelled) setReady(true) })
        })
        return () => {
            cancelled = true
            const Plotly = plotlyRef.current
            if (Plotly && div) Plotly.purge(div)
        }
    }, [])

    useEffect(() => {
        const Plotly = plotlyRef.current
        const div = divRef.current
        if (!ready || !Plotly || !div) return

        const theme = getPlotTheme()
        const base = metricLayout(theme, '$\\|x\\|_2$')
        const submissions = Math.max(1, ...series.map((s) => s.distances.length))
        const values = series.flatMap((s) => s.distances)
        const highest = values.length ? Math.max(...values) : 0
        const top = highest > 0 ? highest * 1.12 : 1
        const span: [number, number] = [-top * 0.07, top]

        const data: Data[] = series.map((s, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            return {
                type: 'scatter' as const,
                mode: 'lines+markers' as const,
                name: s.label,
                x: s.distances.map((_, k) => k + 1),
                y: s.distances,
                line: { color, width: 2 },
                marker: { size: 9, color },
            }
        })

        const layout: Partial<Layout> = {
            ...base,
            xaxis: {
                ...base.xaxis,
                title: { text: "submission", font: { color: theme.muted, size: 15 } },
                tickmode: 'linear' as const,
                tick0: 1,
                dtick: 1,
                range: [0.65, submissions + 0.35],
            },
            yaxis: { ...base.yaxis, range: span, autorange: false, zeroline: true, zerolinecolor: theme.muted },
            margin: { ...base.margin, t: 34, b: 48 },
            showlegend: true,
            legend: { font: { color: theme.muted, size: 11 }, orientation: 'h' as const, y: 1.18 },
        }

        Plotly.react(div, data, layout, config)
    }, [ready, series])

    useEffect(() => {
        const Plotly = plotlyRef.current
        const div = divRef.current
        if (!ready || !Plotly || !div) return
        const observer = new ResizeObserver(() => {
            if (div.isConnected && div.offsetParent !== null) Plotly.Plots.resize(div)
        })
        observer.observe(div)
        return () => observer.disconnect()
    }, [ready])

    return <div ref={divRef} className="mx-auto aspect-[3/2] w-full max-w-xl" />
}
