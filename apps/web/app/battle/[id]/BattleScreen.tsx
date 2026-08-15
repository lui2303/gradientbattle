'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ClientMessageTypes, FrontendOptimizer, GameStatus, rankedGame,
    redisBattleRaw, ServerMessageTypes, ServerResponse,
} from "@/app/types";
import { Simulation } from "@/app/components/Simulation";
import { Countdown } from "@/app/components/Countdown";
import { SimulationMode } from "@/lib/simulationMode";
import { Point } from "@gradientbattle/core";
import { useBattleSocket } from "../BattleSocketProvider";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SERIES_COLORS } from "@/lib/plotTheme";
import { TimerIcon } from "lucide-react";

type Phase = GameStatus | "ABORTED" | "LOADING"

const resultTextFor = (winnerId: string | null | undefined, userID: string) =>
    (!winnerId ? "DRAW" : winnerId === userID ? "YOU WON" : "YOU LOST")

export default function BattleScreen({ username, userID, battleID }: { username: string, userID: string, battleID: string }) {
    const { subscribe, unsubscribe, send } = useBattleSocket()!
    const router = useRouter()

    const [phase, setPhase] = useState<Phase>("LOADING")
    const [game, setGame] = useState<rankedGame | null>(null)
    const [submissions, setSubmissions] = useState(0)
    const [gameSeconds, setGameSeconds] = useState<number | null>(null) // snapshot for the Countdown
    const [resultText, setResultText] = useState("")
    const [elo, setElo] = useState(0)
    const [eloDelta, setEloDelta] = useState(0)

    useEffect(() => {
        const hydrate = (battle: redisBattleRaw, submissions: number) => {
            setPhase(battle.state as GameStatus)
            if (battle.game) setGame(JSON.parse(battle.game) as rankedGame)
            if (battle.gameEndsAt) {
                setGameSeconds(Math.max(0, Math.round((Number(battle.gameEndsAt) - Date.now()) / 1000)))
            }

            if(userID == battle.player1) {
                setElo(Number(battle.player1Elo))
            } else {
                setElo(Number(battle.player2Elo))
            }

            if (battle.state === "BATTLE_ENDED") {setResultText(resultTextFor(battle.winnerId, userID));return}
            setSubmissions(submissions)
        }

        const handler = (message: ServerResponse) => {
            switch (message.type) {
                case ServerMessageTypes.SYNC: {
                    if (!message.payload) {
                        // no active battle for this user -> back to matchmaking
                        router.replace("/battle")
                        return
                    }
                    hydrate(message.payload, message.payload.submissions)
                    break
                }
                case ServerMessageTypes.BATTLE_RESULT:
                    setPhase("BATTLE_ENDED")
                    setEloDelta(message.payload.eloDeltas[userID] ? message.payload.eloDeltas[userID] : 0)
                    setResultText(resultTextFor(message.payload.winnerId, userID))
                    break
                case ServerMessageTypes.ABORT:
                    setPhase("ABORTED")
                    setGame(null)
                    break
            }
        }

        subscribe(handler)
        send({ type: ClientMessageTypes.SYNC }) // hydrate state for this battle on (re)mount
        return () => unsubscribe(handler)
    }, [subscribe, unsubscribe, send, router, userID, elo])

    function buildMode(): SimulationMode {
        return {
            async run(optimizer: Record<string, FrontendOptimizer>) {
                if (submissions >= game!.maxSubmissions) {
                    toast.warning("Submission limit reached", {
                        description: `You can only submit ${game!.maxSubmissions} runs in a battle.`,
                    })
                    return { traces: null }
                }
                const res = await fetch(`/api/battle/${battleID}/run`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ optimizers: optimizer }),
                });
                const resp = await res.json();
                if (typeof resp.submissionCount === "number") setSubmissions(resp.submissionCount)
                const { traces }: { traces: Point[][] } = resp;
                return { traces };
            },
            requiresAuth: true,
            allowedFunctions: [game!.objective],
            allowedOptimizer: game!.optimizers.map((k) => ({ ...k, color: SERIES_COLORS[0] })),
        }
    }

    const submissionsLeft = game ? game.maxSubmissions - submissions : 0

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-sm text-muted-foreground">
                        Signed in as <span className="font-mono text-foreground">{username}</span>
                    </span>

                    <Separator orientation="vertical" className="hidden data-vertical:h-4 data-vertical:self-center sm:block" />

                    <span className="font-mono text-sm tabular-nums">
                        {elo + eloDelta} <span className="text-muted-foreground">elo</span>
                    </span>

                    {phase === "RUNNING" && gameSeconds != null && (
                        <span className="ml-auto flex items-center gap-3">
                            {game && (
                                <Badge variant={submissionsLeft > 0 ? "outline" : "destructive"}>
                                    {submissions}/{game.maxSubmissions} submissions
                                </Badge>
                            )}
                            <span className="flex items-center gap-1.5">
                                <TimerIcon className="size-4 text-muted-foreground" />
                                <Countdown seconds={gameSeconds} className="font-mono text-lg tabular-nums" />
                            </span>
                        </span>
                    )}
                </CardContent>
            </Card>

            {phase === "LOADING" && (
                <Card>
                    <CardContent className="flex flex-col gap-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            )}

            {phase === "ABORTED" && (
                <Alert variant="destructive">
                    <AlertTitle>Battle aborted</AlertTitle>
                    <AlertDescription>A player did not ready up in time.</AlertDescription>
                </Alert>
            )}

            {phase === "BATTLE_ENDED" && (
                <Alert>
                    <AlertTitle className="font-mono text-xl tracking-wide">{resultText}</AlertTitle>
                    <AlertDescription className="font-mono tabular-nums">
                        Elo {elo} → {elo + eloDelta}
                        {eloDelta !== 0 && ` (${eloDelta > 0 ? "+" : ""}${eloDelta})`}
                    </AlertDescription>
                </Alert>
            )}

            {phase === "RUNNING" && game && (
                <div className={submissionsLeft > 0 ? "" : "opacity-50"}>
                    <Simulation mode={buildMode()} />
                </div>
            )}
        </div>
    );
}
