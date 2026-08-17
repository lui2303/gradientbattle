import { HistoryIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const PLACEHOLDER_ROWS = 6

/**
 * Placeholder for the player's recent battles — not wired to data yet.
 *
 * The skeleton deliberately mirrors the shape the real row should take, so filling
 * it in is a matter of swapping each Skeleton for its value: outcome, opponent,
 * elo delta, and when it happened. The rows come from Battle joined to User, where
 * `winnerId` gives the outcome and a null winner is a draw; elo isn't stored per
 * battle today, so showing a delta needs either a new column on Battle or deriving
 * it from BattleRun history.
 */
export function MatchHistoryCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <HistoryIcon className="size-4 text-muted-foreground" />
                    Match history
                </CardTitle>
                <CardDescription>Your recent ranked battles.</CardDescription>
            </CardHeader>

            <CardContent>
                <ul className="flex flex-col gap-3" aria-busy="true" aria-label="Match history loading">
                    {Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
                        <li key={row} className="flex items-center gap-3">
                            {/* outcome */}
                            <Skeleton className="h-5 w-12 shrink-0 rounded-md" />
                            {/* opponent — varied widths so the block doesn't read as a grid */}
                            <Skeleton className={row % 2 === 0 ? "h-4 w-32" : "h-4 w-24"} />
                            {/* elo delta */}
                            <Skeleton className="ml-auto h-4 w-10 shrink-0" />
                            {/* when */}
                            <Skeleton className="hidden h-4 w-16 shrink-0 sm:block" />
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
