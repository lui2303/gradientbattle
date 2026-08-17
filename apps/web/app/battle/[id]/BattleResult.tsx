'use client'
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type Outcome = "win" | "loss" | "draw"

const OUTCOME: Record<Outcome, { label: string; className: string }> = {
    win: { label: "You won", className: "text-emerald-700 dark:text-emerald-400" },
    loss: { label: "You lost", className: "text-destructive" },
    draw: { label: "Draw", className: "text-muted-foreground" },
}

export function outcomeFor(winnerId: string | null | undefined, userID: string): Outcome {
    if (!winnerId) return "draw"
    return winnerId === userID ? "win" : "loss"
}

export function BattleResult({
    winnerId,
    userID,
    elo,
    eloDelta,
}: {
    winnerId: string | null | undefined
    userID: string
    elo: number
    eloDelta: number
}) {
    const outcome = outcomeFor(winnerId, userID)

    return (
        <Card>
            <CardHeader>
                <CardTitle className={cn("font-mono text-2xl tracking-wide", OUTCOME[outcome].className)}>
                    {OUTCOME[outcome].label}
                </CardTitle>
                <CardDescription>Ranked battle complete.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Elo</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{elo}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-lg tabular-nums">{elo + eloDelta}</span>
                    {eloDelta !== 0 && (
                        <span
                            className={cn(
                                "font-mono text-sm tabular-nums",
                                eloDelta > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
                            )}
                        >
                            {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                        </span>
                    )}
                </div>

                {/* Match statistics go here. */}

                <div>
                    <Button asChild variant="outline">
                        <Link href="/battle">
                            <ArrowLeftIcon />
                            Back to matchmaking
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
