/**
 * The mark: a loss valley with gradient-descent steps converging on the minimum.
 * Step spacing shrinks toward the bottom — the same convergence the app animates.
 * Dot centres are points on the Bézier at t = 0.15, 0.32 and 0.5 (the minimum).
 * Each dot carries a background-coloured stroke so it punches out of the curve
 * instead of merging with it at small sizes.
 */
export function Logo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
            <path
                d="M4.5 6.5 C 9 25, 23 25, 27.5 6.5"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                opacity="0.4"
            />
            <circle cx="7.10" cy="13.58" r="2.1" fill="var(--chart-1)" stroke="var(--background)" strokeWidth="0.9" />
            <circle cx="11.12" cy="18.58" r="2.4" fill="#7d6ff0" stroke="var(--background)" strokeWidth="0.9" />
            <circle cx="16" cy="20.38" r="3.4" fill="currentColor" stroke="var(--background)" strokeWidth="0.9" />
        </svg>
    )
}
