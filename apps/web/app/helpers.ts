import { norm } from "@gradientbattle/core/src/math_helper";
import { treshhold } from "./constants";
import { Point } from "@gradientbattle/core";

export function distanceSatisfiesTreshhold(distance: number) {
    return distance < treshhold ? true : false
}

export function pointStatisfiesTreshhold(point: Point) {
    return distanceSatisfiesTreshhold(norm(point))
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

