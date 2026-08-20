import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, LockIcon, TrophyIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { FrontendOptimizer, rankedGame } from "@/app/types"
import { displayDistance, formatMetric, timeAgo } from "@/app/helpers"
import { LatexFormula } from "@/app/components/LatexFormula"
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory"
import { norm } from "@gradientbattle/core/src/math_helper"
import { Point } from "@gradientbattle/core"
import { DistanceSeries, SubmissionDistancePlot } from "./SubmissionDistancePlot"

type Outcome = "win" | "loss" | "draw"

const OUTCOME: Record<Outcome, { label: string; className: string }> = {
    win: { label: "You won", className: "text-emerald-700 dark:text-emerald-400" },
    loss: { label: "You lost", className: "text-destructive" },
    draw: { label: "Draw", className: "text-muted-foreground" },
}

type BestRun = { optimizerID: string; iterations: number }

type SubmissionOptimizer = {
    id: string
    name: string
    params: string[]
}

type SubmissionRow = {
    id: string
    index: number
    optimizers: SubmissionOptimizer[]
    iterations: number | null
    bestDistance: number | null
    won: boolean
}

function describeOptimizer(optimizer: FrontendOptimizer): string[] {
    return [
        ...Object.entries(optimizer.params).map(([key, param]) => `${key} ${param.value}`),
        `x\u2080 (${optimizer.startingPoint.value.x.toFixed(2)}, ${optimizer.startingPoint.value.y.toFixed(2)})`,
    ]
}

function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
    if (rows.length === 0) {
        return <p className="py-4 text-sm text-muted-foreground">No runs submitted.</p>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Optimizers</TableHead>
                    <TableHead className="text-right">Iterations</TableHead>
                    <TableHead className="text-right">
                        <span className="flex justify-end"><LatexFormula latex="\|x\|_2" /></span>
                    </TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {rows.map((row) => (
                    <TableRow key={row.id} className={cn(row.won && "bg-emerald-500/5")}>
                        <TableCell className="align-top font-mono text-xs tabular-nums text-muted-foreground">
                            <span className="flex items-center gap-1">
                                {row.index}
                                {row.won && <TrophyIcon className="size-3 shrink-0 text-emerald-700 dark:text-emerald-400" />}
                            </span>
                        </TableCell>
                        <TableCell className="align-top text-xs">
                            <div className="flex flex-col gap-1.5">
                                {row.optimizers.map((optimizer) => (
                                    <div key={optimizer.id} className="flex flex-col gap-1">
                                        <span>{optimizer.name}</span>
                                        <span className="flex flex-wrap gap-1">
                                            {optimizer.params.map((param) => (
                                                <Badge key={param} variant="secondary" className="font-mono font-normal">
                                                    {param}
                                                </Badge>
                                            ))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="align-top text-right font-mono text-xs tabular-nums">
                            {row.iterations ?? "—"}
                        </TableCell>
                        <TableCell className="align-top text-right font-mono text-xs tabular-nums">
                            {row.bestDistance == null ? "—" : formatMetric(row.bestDistance)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export async function BattleSummary({ battleID, userID }: { battleID: string; userID: string }) {
    const battle = await prisma.battle.findUnique({
        where: { id: battleID },
        select: {
            startedAt: true,
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
                select: { id: true, playerId: true, optimizers: true, bestRun: true, lastIterate: true, createdAt: true },
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
    const objective = functionFactory(game.objective)

    const runsOf = (playerID: string) => battle.battleRuns.filter((run) => run.playerId === playerID)

    const rowsFor = (playerID: string): SubmissionRow[] =>
        runsOf(playerID).map((run, index) => {
            const optimizers = run.optimizers as unknown as Record<string, FrontendOptimizer>
            const best = run.bestRun as BestRun | null
            const distances = (run.lastIterate as unknown as Point[]).map(norm)
            return {
                id: run.id,
                index: index + 1,
                optimizers: Object.entries(optimizers).map(([id, optimizer]) => ({
                    id,
                    name: optimizer.name,
                    params: describeOptimizer(optimizer),
                })),
                iterations: best ? best.iterations : null,
                bestDistance: distances.length ? displayDistance(Math.min(...distances)) : null,
                won: run.id === battle.winningRunId,
            }
        })

    const seriesFor = (playerID: string, label: string): DistanceSeries => ({
        label,
        distances: runsOf(playerID)
            .map((run) => (run.lastIterate as unknown as Point[]).map(norm))
            .filter((distances) => distances.length > 0)
            .map((distances) => displayDistance(Math.min(...distances))),
    })

    const series = [seriesFor(userID, "You"), seriesFor(opponentID, opponentName)]

    const paramKeys: string[] = []
    for (const optimizer of game.optimizers) {
        for (const key of Object.keys(optimizer.params)) {
            if (!paramKeys.includes(key)) paramKeys.push(key)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className={cn("font-mono text-2xl tracking-wide", OUTCOME[outcome].className)}>
                        {OUTCOME[outcome].label}
                    </CardTitle>
                    <CardDescription className="text-base">
                        vs <span className="font-mono font-medium text-foreground">{opponentName}</span>
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

                    <Badge variant="outline" asChild>
                        <time dateTime={battle.startedAt.toISOString()} title={battle.startedAt.toISOString()}>
                            {timeAgo(battle.startedAt)}
                        </time>
                    </Badge>

                    <Button asChild variant="outline" size="sm" className="ml-auto">
                        <Link href="/battle">
                            <ArrowLeftIcon />
                            Back to matchmaking
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Objective function</CardTitle>
                        <CardDescription>{objective.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <LatexFormula latex={objective.latex} className="text-center text-foreground" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Allowed optimizers</CardTitle>
                        <CardDescription>Locked values were not tunable, the rest were free to choose.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Optimizer</TableHead>
                                    {paramKeys.map((key) => (
                                        <TableHead key={key} className="text-right">{key}</TableHead>
                                    ))}
                                    <TableHead className="text-right">x₀</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {game.optimizers.map((optimizer) => (
                                    <TableRow key={optimizer.name}>
                                        <TableCell className="text-xs">{optimizer.name}</TableCell>

                                        {paramKeys.map((key) => {
                                            const param = optimizer.params[key]
                                            return (
                                                <TableCell key={key} className="text-right font-mono text-xs tabular-nums">
                                                    {param ? (
                                                        <span className="flex items-center justify-end gap-1">
                                                            {param.value}
                                                            {!param.enabled && <LockIcon className="size-3 shrink-0 text-muted-foreground" />}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">{"\u2014"}</span>
                                                    )}
                                                </TableCell>
                                            )
                                        })}

                                        <TableCell className="text-right font-mono text-xs tabular-nums">
                                            <span className="flex items-center justify-end gap-1">
                                                ({optimizer.startingPoint.value.x.toFixed(2)}, {optimizer.startingPoint.value.y.toFixed(2)})
                                                {optimizer.startingPoint.fixed && <LockIcon className="size-3 shrink-0 text-muted-foreground" />}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Distance to optimum per submission</CardTitle>
                    <CardDescription>Best distance reached by each submission</CardDescription>
                </CardHeader>
                <CardContent>
                    <SubmissionDistancePlot series={series} />
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Your submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SubmissionsTable rows={rowsFor(userID)} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-mono text-sm font-medium">{opponentName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SubmissionsTable rows={rowsFor(opponentID)} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
