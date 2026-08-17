import { HistoryIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { prisma } from "@/lib/prisma"
import { MATCH_HISTORY_LENGTH } from "../constants"

const PLACEHOLDER_ROWS = 6

export function MatchHistoryCardSkeleton() {
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

export async function MatchHistoryCard({userId}: {userId: string}) {
    const match_history = await prisma.battle.findMany({
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
        }
    })

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
                <ul className="flex flex-col gap-3">
                    {match_history.length == 0 ? <p>No matches found</p> :
                        match_history.map((match,i) => {
                            const outcome = match.winnerId === null ? "Draw" : match.winnerId == userId ? "Win" : "Loose"
                            const isPlayer1 = match.player1Id == userId
                            const opponentName = isPlayer1 ? match.player2.name : match.player1.name
                            const eloDiff = isPlayer1 ? match.player1EloDelta : match.player2EloDelta

                            return (<li key={match.id} className="flex items-center gap-3">
                                
                                
                                <label className={outcome == "Win" ? "text-green-600 h-5 w-12 shrink-0 rounded-md" : outcome == "Loose" ? "text-red-600 h-5 w-12 shrink-0 rounded-md" : "h-5 w-12 shrink-0 rounded-md"}>{outcome}</label>

                                <label className={i % 2 === 0 ? "h-4 w-32" : "h-4 w-24"}>{opponentName}</label>
                                
                                <label className="ml-auto h-4 w-10 shrink-0">{eloDiff}</label>
                                
                                <label className="hidden h-4 w-16 shrink-0 sm:block">{match.startedAt.toLocaleString()}</label>
                            </li>)
                        })
                        
                    }

                </ul>
            </CardContent>
        </Card>
    )
}
