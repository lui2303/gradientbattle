'use client'

import type { Dash, Layout } from "plotly.js"

// Plotly draws to SVG/canvas and can't read Tailwind classes, so the theme has to be
// handed to it explicitly. The tokens live in globals.css as plain hex (Plotly's color
// parser doesn't understand oklch()) and are read once here.

export type PlotTheme = {
    fg: string
    muted: string
    grid: string
    ramp: string[]
    series: string[]
}

/**
 * Mirrors --chart-1..5 in globals.css. Exported so modules evaluated before the
 * stylesheet resolves (simulation modes, battle config) can still name a slot.
 */
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"]

/** Loss-surface ramp, mirrors --plot-ramp-0..6 in globals.css. */
const RAMP = ["#0f0a26", "#2d1149", "#571550", "#a3305c", "#cf5748", "#ec8a4a", "#f7bd72"]

/**
 * Where each ramp stop sits on the 0..1 colour axis. Deliberately non-uniform: the
 * first three stops cover the bottom quarter of the value range, which is the band
 * trajectories actually travel through (f <= 50 of 200 for the quadratic), keeping
 * them on dark ground. The bright half is spent on the distant regions of the
 * surface, where contrast buys level separation and no trace ever goes.
 */
const RAMP_STOPS = [0, 0.1, 0.25, 0.45, 0.65, 0.82, 1]

// Fallbacks match globals.css; they only apply if the stylesheet hasn't resolved yet.
const FALLBACK: PlotTheme = {
    fg: "#ffffff",
    muted: "#ffffff",
    grid: "#2a2a2a",
    ramp: RAMP,
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
        ramp: RAMP.map((fallback, i) => read(`--plot-ramp-${i}`, fallback)),
        series: SERIES_COLORS.map((fallback, i) => read(`--chart-${i + 1}`, fallback)),
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

function axis(theme: PlotTheme, title: string | null, fixedRange?: [number, number]) {
    return {
        ...(title ? { title: { text: title, font: { color: theme.muted, size: 11 } } } : { title: { text: "" } }),
        color: theme.fg,
        tickfont: { color: theme.muted, size: 10 },
        gridcolor: theme.grid,
        zerolinecolor: theme.grid,
        linecolor: theme.grid,
        ...(fixedRange ? { range: fixedRange, autorange: false } : { autorange: true as const }),
    }
}

/**
 * Plotly rotates a y-axis title to run vertically with no option to keep it upright,
 * so the label is emitted as a paper-anchored annotation instead: still beside the
 * axis on the left and vertically centred, but reading left-to-right. The xshift
 * clears the tick labels, and metricLayout/contourLayout widen the left margin to
 * make room for it.
 */
const Y_LABEL_SHIFT = -30

function horizontalYLabel(theme: PlotTheme, text: string): Partial<Layout>["annotations"] {
    return [
        {
            text,
            xref: "paper",
            yref: "paper",
            x: 0,
            y: 0.5,
            xanchor: "right",
            yanchor: "middle",
            xshift: Y_LABEL_SHIFT,
            showarrow: false,
            font: { color: theme.muted, size: 11 },
        },
    ]
}

/** Shared chrome for every figure: transparent paper so the Card background shows through. */
export function baseLayout(theme: PlotTheme): Partial<Layout> {
    return {
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: theme.fg },
        autosize: true,
        showlegend: false, // the leaderboard table is the legend
        margin: { l: 58, r: 8, t: 8, b: 36 },
    }
}

export function metricLayout(theme: PlotTheme, yTitle: string): Partial<Layout> {
    return {
        ...baseLayout(theme),
        xaxis: axis(theme, "steps"),
        yaxis: axis(theme, null),
        annotations: horizontalYLabel(theme, yTitle),
        margin: { l: 58, r: 8, t: 8, b: 36 },
    }
}

// The objective's formula is rendered in its own card above the plots, so the figure
// carries no title of its own.
export function contourLayout(theme: PlotTheme): Partial<Layout> {
    return {
        ...baseLayout(theme),
        // Pin one unit of y to one unit of x so the level sets of a symmetric quadratic
        // render as circles rather than inheriting whatever shape the margins leave.
        // `constrain: "domain"` is what makes that safe: without it Plotly satisfies the
        // ratio by widening the *range*, which pushes gridlines out past the data box
        // while the ticks still stop at ±10. With it, the drawing area shrinks instead.
        xaxis: { ...axis(theme, "x", [-10, 10]), constrain: "domain" },
        yaxis: {
            ...axis(theme, null, [-10, 10]),
            scaleanchor: "x",
            scaleratio: 1,
            constrain: "domain",
        },
        annotations: horizontalYLabel(theme, "y"),
        margin: { l: 58, r: 8, t: 8, b: 36 },
    }
}

/**
 * Warm sequential ramp for the loss surface, replacing Plotly's default colorscale,
 * which is multi-hue and rules itself out for encoding magnitude.
 */
export function contourStyle(theme: PlotTheme) {
    return {
        colorscale: theme.ramp.map((color, i) => [RAMP_STOPS[i], color]) as Array<[number, string]>,
        // Plotly's default band separators are heavy black strokes that read as harsh
        // against a dark ramp. The fill already separates levels; these just tidy the
        // boundaries, so they're hairline and barely-there.
        contours: { showlines: true },
        line: { width: 0.5, color: "rgba(255,255,255,0.18)" },
        // Slim, so the colorbar takes as little width as possible from the square
        // data area — the contour is width-bound inside its card.
        colorbar: {
            tickfont: { color: theme.muted, size: 10 },
            outlinewidth: 0,
            thickness: 8,
            len: 0.92,
        },
    }
}
