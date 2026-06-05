'use client'
import { useRef, useState } from "react";
import {BattleUser} from '@/server'
import { Union } from "@/generated/prisma/internal/prismaNamespace";
const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL ?? "ws://localhost:3001";

export default function BattleScreen({ username }: { username: string }) {
    const wsRef = useRef<WebSocket | null>(null)
    const [status, setStatus] = useState("idle")
    const [opponent, setOpponent] = useState<(BattleUser& {elo: number}) | null>(null)

    function findOpponent() {
        const ws = wsRef.current ?? new WebSocket(WS_URL);
        wsRef.current = ws;

        const queue = () => ws.send(JSON.stringify({ type: "find_opponent" }));
        if (ws.readyState === WebSocket.OPEN) queue();
        else ws.addEventListener("open", queue, { once: true });

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data)

            switch (msg.type) {
                case "connected": break
                case "enqueued": setStatus("Waiting in queue...");break;
                case "found_opponent": {
                    setStatus("Found opponent")
                    setOpponent({id: msg.id, name: msg.name, elo: msg.elo})
                    break;
                }
                default:
                    console.warn("Unknown message type:", msg.type);
                    break;

            }
        };
        ws.onclose = () => setStatus("disconnected");
    }

    return (
        <main className="min-h-screen p-8">
            <p>1v1 Battle Page. Logged in as {username}</p>
            <button className="bg-amber-600 px-3 py-1 rounded" onClick={findOpponent}>
                Find opponent
            </button>
            <p className="mt-2 text-sm opacity-70">{status}</p>
            <p>Found opponent {opponent?.id} with elo {opponent?.elo}</p>
        </main>
    );
}