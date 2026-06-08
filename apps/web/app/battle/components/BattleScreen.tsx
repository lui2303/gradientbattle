'use client'
import { useRef, useState } from "react";
import {BattleUser} from '@/server'

const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL ?? "ws://localhost:3001";

type GAME_STATUS = "ABORTED" | null | "READY" | "WAITING_FOR_READY" | "PREP_PHASE"



export default function BattleScreen({ username }: { username: string }) {
    const wsRef = useRef<WebSocket | null>(null)
    const [status, setStatus] = useState("idle")
    const [opponent, setOpponent] = useState<(BattleUser& {elo: number}) | null>(null)
    const [state, setGameState] = useState<GAME_STATUS>(null)

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
                case "abort": { // an abort always comes with a message property
                    setStatus(msg.message)
                    setOpponent(null)
                    setGameState("ABORTED") 
                    break;
                }
                case "enqueued": setStatus("Waiting in queue...");break;
                case "found_opponent": {
                    setStatus("Found opponent")
                    setOpponent({id: msg.id, name: msg.name, elo: msg.elo})
                    setGameState("WAITING_FOR_READY")
                    break;
                }

                case "PREP_PHASE":{
                    setStatus(JSON.stringify(msg))
                    setGameState("PREP_PHASE")
                    break;
                }

                default:
                    console.warn("Unknown message type:", msg.type);
                    break;

            }
        };
        ws.onclose = () => {setStatus("idle"); wsRef.current = null}
    }

    return (
        <main className="min-h-screen p-8">
            <p>1v1 Battle Page. Logged in as {username}</p>
            {
                (state == "ABORTED" || !state) ? <button className="bg-amber-600 px-3 py-1 rounded" onClick={findOpponent}>Find opponent</button> 
                : (!opponent ? <button className="bg-amber-600 px-3 py-1 rounded" onClick={() => {wsRef.current?.close()}}>Abort</button> : "")
            }
            <p className="mt-2 text-sm opacity-70">{status}</p>
            <p>Found opponent {opponent?.name} with elo {opponent?.elo}</p>
            {
                state == "WAITING_FOR_READY" || state=="READY" ? <button className="bg-green-600" onClick={() => { // ready button now dissapears after pressing it
                    if(state === "READY") return
                    
                    setGameState("READY")

                    wsRef.current?.send(JSON.stringify({ type: "READY" }))
                }}>Ready</button> : ""
            }

        </main>
    );
}