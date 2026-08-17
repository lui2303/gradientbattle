'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BattleUser } from '@/server'
import { ClientMessageTypes, ServerMessageTypes, ServerResponse } from "@/app/types";
import { useBattleSocket } from "./BattleSocketProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SwordsIcon } from "lucide-react";
import type { ReactNode } from "react";

type MatchPhase = "IDLE" | "QUEUED" | "FOUND" | "READY" | "ABORTED"

const PHASE_LABEL: Record<MatchPhase, string> = {
    IDLE: "Idle",
    QUEUED: "In queue",
    FOUND: "Opponent found",
    READY: "Ready",
    ABORTED: "Aborted",
}

export default function BattleScreen({ username, historyCard }: { username: string, historyCard: ReactNode }) {
    const { subscribe, unsubscribe, send } = useBattleSocket()!

    const [phase, setPhase] = useState<MatchPhase>("IDLE")
    const [status, setStatus] = useState("idle")
    const [opponent, setOpponent] = useState<(BattleUser & { elo: number }) | null>(null)

    const router = useRouter()

    useEffect(() => {
        const handler = (message: ServerResponse) => {
            switch (message.type) {
                case ServerMessageTypes.ENQUEUED:
                    setStatus("Waiting in queue...")
                    setPhase("QUEUED")
                    break

                case ServerMessageTypes.FOUND_OPPONENT:
                    setStatus("Found opponent")
                    setOpponent(message.payload)
                    setPhase("FOUND")
                    break

                case ServerMessageTypes.ABORT:
                    setStatus(message.payload)
                    setOpponent(null)
                    setPhase("ABORTED")
                    break

                // both players readied -> the battle now exists; hand off to /battle/[id]
                case ServerMessageTypes.RUNNING:
                    router.push(`/battle/${message.payload.battleID}`)
                    break
            }
        }

        subscribe(handler)
        return () => unsubscribe(handler)
    }, [subscribe, unsubscribe, router])

    const canFind = phase === "IDLE" || phase === "ABORTED"

    return (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SwordsIcon className="size-4 text-muted-foreground" />
                        Ranked battle
                    </CardTitle>
                    <CardDescription>
                        Signed in as <span className="font-mono text-foreground">{username}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Badge variant={phase === "ABORTED" ? "destructive" : "outline"}>
                            {PHASE_LABEL[phase]}
                        </Badge>
                        {/* The initial status string just repeats the badge; only show server detail. */}
                        {phase !== "IDLE" && <span className="text-sm text-muted-foreground">{status}</span>}
                    </div>

                    {phase === "QUEUED" && (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    )}

                    {opponent && (
                        <>
                            <Separator />
                            <div className="flex items-baseline justify-between">
                                <span className="text-sm">{opponent.name}</span>
                                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                    {opponent.elo} elo
                                </span>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2">
                        {canFind && (
                            <Button onClick={() => send({ type: ClientMessageTypes.FIND_OPPONENT })}>
                                Find opponent
                            </Button>
                        )}

                        {phase === "QUEUED" && (
                            <Button variant="outline" onClick={() => send({ type: ClientMessageTypes.ABORT })}>
                                Abort
                            </Button>
                        )}

                        {(phase === "FOUND" || phase === "READY") && (
                            <Button
                                disabled={phase === "READY"}
                                onClick={() => {
                                    setPhase("READY")
                                    send({ type: ClientMessageTypes.READY })
                                }}
                            >
                                {phase === "READY" ? "Waiting for opponent…" : "Ready"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {historyCard}
        </div>
    );
}
