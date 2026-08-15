'use client'

import type { Dash, Layout } from "plotly.js"

// Plotly draws to SVG/canvas and can't read Tailwind classes, so the theme has to be
// handed to it explicitly. The tokens live in globals.css as plain hex (Plotly's color
// parser doesn't understand oklch()) and are read once here.

export type PlotTheme = {
    fg: string
    muted: string
    grid: string
    surfaceLo: string
    surfaceHi: string
    series: string[]
}

/**
 * Mirrors --chart-1..5 in globals.css. Exported so modules evaluated before the
 * stylesheet resolves (simulation modes, battle config) can still name a slot.
 */
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"]

// Fallbacks match globals.css; they only apply if the stylesheet hasn't resolved yet.
const FALLBACK: PlotTheme = {
    fg: "#d4d4d4",
    muted: "#8a8a8a",
    grid: "#2a2a2a",
    surfaceLo: "#0d0d0d",
    surfaceHi: "#2e2e2e",
    series: SERIES_COLORS,
}

// The palette is fixed for the document's lifetime (dark-only app), so read it once.
let cached: PlotTheme | null = null

export function getPlotTheme(): PlotTheme {
    if (cached) return cached
    if (typeof document === "undefined") return FALLBACK

    const styles = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback

    cached = {
        fg: read("--plot-fg", FALLBACK.fg),
        muted: read("--plot-muted", FALLBACK.muted),
        grid: read("--plot-grid", FALLBACK.grid),
        surfaceLo: read("--plot-surface-lo", FALLBACK.surfaceLo),
        surfaceHi: read("--plot-surface-hi", FALLBACK.surfaceHi),
        series: FALLBACK.series.map((fallback, i) => read(`--chart-${i + 1}`, fallback)),
    }
    return cached
}

/**
 * Series colours alone can't carry identity here: only the first three palette slots
 * clear the all-pairs colour-blindness gate, and converging trajectories can end up
 * beside each other in any combination. Each slot therefore also gets a dash pattern,
 * which is the secondary encoding that makes slots 4 and 5 legal.
 */
const SERIES_DASHES: Dash[] = ["solid", "dash", "dot", "dashdot", "longdash"]

/** Dash follows the colour, so it follows the optimizer entity rather than its position. */
export function dashForColor(color: string): Dash {
    const slot = getPlotTheme().series.findIndex((c) => c.toLowerCase() === color.toLowerCase())
    return slot === -1 ? "solid" : SERIES_DASHES[slot % SERIES_DASHES.length]
}

/** Line style for one optimizer trace. */
export function traceLine(color: string) {
    return { color, dash: dashForColor(color), width: 2 }
}

/**
 * Picks the first palette slot not already on screen. Colour has to follow the
 * optimizer entity rather than its index — deriving it from position would repaint
 * the survivors whenever one is removed.
 */
export function nextFreeSeriesColor(used: string[]): string {
    const palette = getPlotTheme().series
    const taken = new Set(used.map((color) => color.toLowerCase()))
    return palette.find((color) => !taken.has(color.toLowerCase())) ?? palette[0]
}

function axis(theme: PlotTheme, title: string, fixedRange?: [number, number]) {
    return {
        title: { text: title, font: { color: theme.muted, size: 11 } },
        color: theme.fg,
        tickfont: { color: theme.muted, size: 10 },
        gridcolor: theme.grid,
        zerolinecolor: theme.grid,
        linecolor: theme.grid,
        ...(fixedRange ? { range: fixedRange, autorange: false } : { autorange: true as const }),
    }
}

/** Shared chrome for every figure: transparent paper so the Card background shows through. */
export function baseLayout(theme: PlotTheme): Partial<Layout> {
    return {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: theme.fg },
        autosize: true,
        showlegend: false, // the leaderboard table is the legend
        margin: { l: 48, r: 16, t: 28, b: 40 },
    }
}

export function metricLayout(theme: PlotTheme, yTitle: string): Partial<Layout> {
    return {
        ...baseLayout(theme),
        xaxis: axis(theme, "steps"),
        yaxis: axis(theme, yTitle),
    }
}

export function contourLayout(theme: PlotTheme, latex: string): Partial<Layout> {
    return {
        ...baseLayout(theme),
        title: { text: `$${latex}$`, font: { color: theme.fg, size: 12 } },
        xaxis: axis(theme, "x", [-10, 10]),
        yaxis: axis(theme, "y", [-10, 10]),
        margin: { l: 48, r: 16, t: 44, b: 40 },
    }
}

/**
 * A neutral sequential ramp for the loss surface. Plotly's default colorscale is
 * multi-hue, which would compete with the categorical traces drawn on top of it; a
 * grey ramp capped at --plot-surface-hi keeps every trace above 3:1 contrast.
 */
export function contourStyle(theme: PlotTheme) {
    return {
        colorscale: [
            [0, theme.surfaceLo],
            [0.5, "#1d1d1d"],
            [1, theme.surfaceHi],
        ] as Array<[number, string]>,
        colorbar: {
            tickfont: { color: theme.muted, size: 10 },
            outlinewidth: 0,
            thickness: 10,
        },
    }
}
