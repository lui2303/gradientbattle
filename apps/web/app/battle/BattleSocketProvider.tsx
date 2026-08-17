'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { WS_URL } from "../constants";
import { BattleSocketValue, ClientResponse, ServerResponse } from "../types";

const BattleSocketContext = createContext<BattleSocketValue | null>(null);

export default function BattleSocketProvider({children}: Readonly<{children: React.ReactNode}>) {
    const wsRef = useRef<null | WebSocket>(null)
    const subscriberRef = useRef<Set<(message: ServerResponse) => void>>(new Set());
    const pendingRef = useRef<string[]>([])


    const connect = useCallback(() => {
        if (wsRef.current) return
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            pendingRef.current.forEach((data) => ws.send(data))
            pendingRef.current = []
        }

        ws.onmessage = (e) => {
            const message = JSON.parse(e.data) as ServerResponse
            subscriberRef.current.forEach((subscriber) => subscriber(message))
        }

        ws.onclose = () => {
            if (wsRef.current === ws) wsRef.current = null
        }
    }, [])

    const subscribe = useCallback((subscriber: (message: ServerResponse) => void) => {
        subscriberRef.current.add(subscriber)
    }, [])

    const unsubscribe = useCallback((subscriber: (message: ServerResponse) => void) => {
        subscriberRef.current.delete(subscriber)
    }, [])

    const disconnect = useCallback(() => {
        if(!wsRef.current) return;

        wsRef.current.close()
        wsRef.current = null

        subscriberRef.current.clear()
        pendingRef.current = []
    }, [])

    const send = useCallback((message: ClientResponse) => {
        const data = JSON.stringify(message)
        const ws = wsRef.current
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data)
        else pendingRef.current.push(data)
    }, [])

    useEffect(() => {
        connect()
        return () => disconnect()
    }, [connect, disconnect])

    const value = useMemo(
        () => ({connect, disconnect, send, subscribe, unsubscribe}),
        [connect, disconnect, send, subscribe, unsubscribe]
    )

    return (
        <BattleSocketContext.Provider value={value}>
            {children}
        </BattleSocketContext.Provider>
    )
}

export function useBattleSocket() {
      const ctx = useContext(BattleSocketContext);
      return ctx;
  }
