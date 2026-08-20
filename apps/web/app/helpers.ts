import { norm } from "@gradientbattle/core/src/math_helper";
import { treshhold } from "./constants";
import { Point } from "@gradientbattle/core";

export function distanceSatisfiesTreshhold(distance: number) {
    return distance < treshhold ? true : false
}

export function pointStatisfiesTreshhold(point: Point) {
    return distanceSatisfiesTreshhold(norm(point))
}

export function displayDistance(distance: number) {
    return distanceSatisfiesTreshhold(distance) ? 0 : distance
}

// Iterate metrics span roughly 10 down to 1e-8 over a run, so a fixed decimal count is
// either all zeros at the converged end or unreadably long at the start.
export function formatMetric(value: number): string {
    if (!Number.isFinite(value)) return "—"
    if (value === 0) return "0"
    const magnitude = Math.abs(value)
    if (magnitude < 1e-3 || magnitude >= 1e5) return value.toExponential(2)
    return value.toFixed(4)
}


const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const DIVISIONS = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Infinity, unit: "year" },
] as const

export function timeAgo(date: Date) {
    let duration = (date.getTime() - Date.now()) / 1000
    for (const { amount, unit } of DIVISIONS) {
        if (Math.abs(duration) < amount) return RELATIVE.format(Math.round(duration), unit)
        duration /= amount
    }
}
