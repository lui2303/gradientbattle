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
                    console.warn("Max game submissions exceeded")
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
            allowedOptimizer: game!.optimizers.map((k) => ({ ...k, color: "#000000" })),
        }
    }

    return (
        <main className="min-h-screen p-8">
            <p>1v1 Battle Page. Logged in as {username} with current elo of {elo}</p>

            {phase === "LOADING" && <p className="opacity-70">Loading battle…</p>}
            {phase === "ABORTED" && <p className="opacity-70">Battle aborted.</p>}
            {phase === "BATTLE_ENDED" && <p className="text-2xl font-mono">{resultText + ". Elo changed: " + elo + "->" + (elo + eloDelta)}</p>}

            {phase === "RUNNING" && gameSeconds != null && (
                <Countdown seconds={gameSeconds} className="text-2xl font-mono" />
            )}

            {phase === "RUNNING" && game && (
                <>
                    <p>{submissions}/{game.maxSubmissions} Submissions</p>
                    <div className={submissions < game.maxSubmissions ? "" : "opacity-50"}>
                        <Simulation mode={buildMode()} />
                    </div>
                </>
            )}
        </main>
    );
}
