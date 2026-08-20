import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, TrophyIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { FrontendOptimizer, rankedGame } from "@/app/types"

type Outcome = "win" | "loss" | "draw"

const OUTCOME: Record<Outcome, { label: string; className: string }> = {
    win: { label: "You won", className: "text-emerald-700 dark:text-emerald-400" },
    loss: { label: "You lost", className: "text-destructive" },
    draw: { label: "Draw", className: "text-muted-foreground" },
}

type BestRun = { optimizerID: string; iterations: number }

type SummaryRun = {
    id: string
    playerId: string
    optimizers: unknown
    bestRun: unknown
}

function formatParams(params: Record<string, { enabled: boolean; value: number }>) {
    return Object.entries(params)
        .map(([key, config]) => `${key} ${config.value}`)
        .join(" · ")
}

function RunList({ runs, winningRunId }: { runs: SummaryRun[]; winningRunId: string | null }) {
    if (runs.length === 0) {
        return <p className="py-4 text-sm text-muted-foreground">No runs submitted.</p>
    }

    return (
        <ul className="flex flex-col gap-3">
            {runs.map((run, index) => {
                const optimizers = run.optimizers as unknown as Record<string, FrontendOptimizer>
                const best = run.bestRun as BestRun | null
                const won = run.id === winningRunId

                return (
                    <li
                        key={run.id}
                        className={cn(
                            "rounded-md border p-3",
                            won && "border-emerald-600/40 bg-emerald-500/5",
                        )}
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">Run {index + 1}</span>
                            {won && (
                                <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                    <TrophyIcon className="size-3" />
                                    Winning run
                                </Badge>
                            )}
                            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                                {best ? `${best.iterations} iterations` : "did not converge"}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-col gap-1">
                            {Object.entries(optimizers).map(([key, optimizer]) => (
                                <div key={key} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                                    <span
                                        className={cn(
                                            "font-mono",
                                            best?.optimizerID === key && "text-emerald-700 dark:text-emerald-400",
                                        )}
                                    >
                                        {optimizer.name}
                                    </span>
                                    <span className="text-muted-foreground">{formatParams(optimizer.params)}</span>
                                    <span className="text-muted-foreground">
                                        from ({optimizer.startingPoint.value.x.toFixed(2)}, {optimizer.startingPoint.value.y.toFixed(2)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

export async function BattleSummary({ battleID, userID }: { battleID: string; userID: string }) {
    const battle = await prisma.battle.findUnique({
        where: { id: battleID },
        select: {
            startedAt: true,
            endsAt: true,
            winnerId: true,
            winningRunId: true,
            player1Id: true,
            player2Id: true,
            player1EloDelta: true,
            player2EloDelta: true,
            player1EloBefore: true,
            player2EloBefore: true,
            game: true,
            player1: { select: { name: true } },
            player2: { select: { name: true } },
            battleRuns: {
                select: { id: true, playerId: true, optimizers: true, bestRun: true },
                orderBy: { createdAt: "asc" },
            },
        },
    })

    if (!battle) notFound()
    if (battle.player1Id !== userID && battle.player2Id !== userID) notFound()

    const isPlayer1 = battle.player1Id === userID
    const opponentID = isPlayer1 ? battle.player2Id : battle.player1Id
    const opponentName = (isPlayer1 ? battle.player2.name : battle.player1.name) ?? "Anonymous"
    const eloDelta = isPlayer1 ? battle.player1EloDelta : battle.player2EloDelta
    const eloBefore = isPlayer1 ? battle.player1EloBefore : battle.player2EloBefore
    const outcome: Outcome = !battle.winnerId ? "draw" : battle.winnerId === userID ? "win" : "loss"

    const game = battle.game as unknown as rankedGame
    const durationSeconds = Math.round((battle.endsAt.getTime() - battle.startedAt.getTime()) / 1000)
    const playedAt = battle.startedAt.toISOString().slice(0, 16).replace("T", " ")

    const runsOf = (playerID: string) => battle.battleRuns.filter((run) => run.playerId === playerID)

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className={cn("font-mono text-2xl tracking-wide", OUTCOME[outcome].className)}>
                        {OUTCOME[outcome].label}
                    </CardTitle>
                    <CardDescription>
                        vs {opponentName} · {game.objective} · {durationSeconds}s
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">Elo</span>
                        {eloBefore != null && (
                            <>
                                <span className="font-mono tabular-nums text-muted-foreground">{eloBefore}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono text-lg tabular-nums">{eloBefore + eloDelta}</span>
                            </>
                        )}
                        <span
                            className={cn(
                                "font-mono tabular-nums",
                                eloBefore == null && "text-lg",
                                eloDelta > 0 && "text-emerald-700 dark:text-emerald-400",
                                eloDelta < 0 && "text-destructive",
                                eloDelta === 0 && "text-muted-foreground",
                            )}
                        >
                            {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                        </span>
                    </span>

                    <Separator orientation="vertical" className="hidden data-vertical:h-4 data-vertical:self-center sm:block" />

                    <time className="text-sm text-muted-foreground" dateTime={battle.startedAt.toISOString()}>
                        {playedAt} UTC
                    </time>

                    <Button asChild variant="outline" size="sm" className="ml-auto">
                        <Link href="/battle">
                            <ArrowLeftIcon />
                            Back to matchmaking
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Your runs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RunList runs={runsOf(userID)} winningRunId={battle.winningRunId} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">{opponentName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RunList runs={runsOf(opponentID)} winningRunId={battle.winningRunId} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
