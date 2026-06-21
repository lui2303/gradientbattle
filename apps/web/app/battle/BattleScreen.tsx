'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BattleUser } from '@/server'
import { ClientMessageTypes, ServerMessageTypes, ServerResponse } from "@/app/types";
import { useBattleSocket } from "./BattleSocketProvider";

type MatchPhase = "IDLE" | "QUEUED" | "FOUND" | "READY" | "ABORTED"

export default function BattleScreen({ username }: { username: string, userID: string }) {
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
                case ServerMessageTypes.PREP_PHASE:
                    router.push(`/battle/${message.payload.battleID}`)
                    break
            }
        }

        subscribe(handler)
        return () => unsubscribe(handler)
    }, [subscribe, unsubscribe, router])

    const canFind = phase === "IDLE" || phase === "ABORTED"

    return (
        <main className="min-h-screen p-8">
            <p>1v1 Battle Page. Logged in as {username}</p>

            {canFind && (
                <button
                    className="bg-amber-600 px-3 py-1 rounded"
                    onClick={() => send({ type: ClientMessageTypes.FIND_OPPONENT })}
                >
                    Find opponent
                </button>
            )}

            {phase === "QUEUED" && (
                <button
                    className="bg-amber-600 px-3 py-1 rounded"
                    onClick={() => send({ type: ClientMessageTypes.ABORT })}
                >
                    Abort
                </button>
            )}

            <p className="mt-2 text-sm opacity-70">{status}</p>

            {opponent && <p>Found opponent {opponent.name} with elo {opponent.elo}</p>}

            {(phase === "FOUND" || phase === "READY") && (
                <button
                    className="bg-green-600 px-3 py-1 rounded"
                    disabled={phase === "READY"}
                    onClick={() => {
                        setPhase("READY")
                        send({ type: ClientMessageTypes.READY })
                    }}
                >
                    Ready
                </button>
            )}
        </main>
    );
}
