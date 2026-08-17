import { HistoryIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { MATCH_HISTORY_LENGTH } from "../constants"

const PLACEHOLDER_ROWS = 6

type Outcome = "win" | "loss" | "draw"

const OUTCOME: Record<Outcome, { label: string; className: string }> = {
    win: { label: "Win", className: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    loss: { label: "Loss", className: "bg-destructive/10 text-destructive" },
    draw: { label: "Draw", className: "bg-muted text-muted-foreground" },
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

function timeAgo(date: Date) {
    let duration = (date.getTime() - Date.now()) / 1000
    for (const { amount, unit } of DIVISIONS) {
        if (Math.abs(duration) < amount) return RELATIVE.format(Math.round(duration), unit)
        duration /= amount
    }
}

function CardShell({ children }: { children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <HistoryIcon className="size-4 text-muted-foreground" />
                    Match history
                </CardTitle>
                <CardDescription>Your recent ranked battles.</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function HistoryHead() {
    return (
        <TableHeader>
            <TableRow>
                <TableHead className="w-20">Result</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead className="text-right">Elo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">When</TableHead>
            </TableRow>
        </TableHeader>
    )
}

export function MatchHistoryCardSkeleton() {
    return (
        <CardShell>
            <Table aria-busy="true" aria-label="Match history loading">
                <HistoryHead />
                <TableBody>
                    {Array.from({ length: PLACEHOLDER_ROWS }, (_, row) => (
                        <TableRow key={row}>
                            <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                            {/* varied widths so the column doesn't read as a solid block */}
                            <TableCell><Skeleton className={row % 2 === 0 ? "h-4 w-32" : "h-4 w-24"} /></TableCell>
                            <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-8" /></TableCell>
                            <TableCell className="hidden text-right sm:table-cell"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardShell>
    )
}

export async function MatchHistoryCard({ userId }: { userId: string }) {
    const battles = await prisma.battle.findMany({
        where: {
            OR: [{ player1Id: userId }, { player2Id: userId }],
            status: "evaluated",
        },
        orderBy: { startedAt: "desc" },
        take: MATCH_HISTORY_LENGTH,
        select: {
            id: true,
            startedAt: true,
            winnerId: true,
            player1Id: true,
            player1EloDelta: true,
            player2EloDelta: true,
            player1: { select: { name: true } },
            player2: { select: { name: true } },
        },
    })

    if (battles.length === 0) {
        return (
            <CardShell>
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No ranked battles yet — find an opponent to start climbing.
                </p>
            </CardShell>
        )
    }

    // Collapse each row to the viewer's perspective: the schema stores player1/player2,
    // but every column here is "me vs them".
    const rows = battles.map((battle) => {
        const isPlayer1 = battle.player1Id === userId
        return {
            id: battle.id,
            startedAt: battle.startedAt,
            opponent: (isPlayer1 ? battle.player2.name : battle.player1.name) ?? "Anonymous",
            eloDelta: isPlayer1 ? battle.player1EloDelta : battle.player2EloDelta,
            outcome: (battle.winnerId === null ? "draw" : battle.winnerId === userId ? "win" : "loss") as Outcome,
        }
    })

    return (
        <CardShell>
            <Table>
                <HistoryHead />
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>
                                <Badge variant="secondary" className={OUTCOME[row.outcome].className}>
                                    {OUTCOME[row.outcome].label}
                                </Badge>
                            </TableCell>

                            <TableCell className="truncate">{row.opponent}</TableCell>

                            <TableCell
                                className={cn(
                                    "text-right font-mono tabular-nums",
                                    row.eloDelta > 0 && "text-emerald-700 dark:text-emerald-400",
                                    row.eloDelta < 0 && "text-destructive",
                                    row.eloDelta === 0 && "text-muted-foreground",
                                )}
                            >
                                {row.eloDelta > 0 ? `+${row.eloDelta}` : row.eloDelta}
                            </TableCell>

                            <TableCell className="hidden text-right text-xs text-muted-foreground sm:table-cell">
                                <time dateTime={row.startedAt.toISOString()} title={row.startedAt.toISOString()}>
                                    {timeAgo(row.startedAt)}
                                </time>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardShell>
    )
}
