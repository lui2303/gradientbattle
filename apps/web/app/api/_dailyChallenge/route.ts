import { NextResponse } from "next/server";
import { getCurrentChallenge } from "./challenge";
import { prisma } from "@/lib/prisma";
import { clientIp, enforceRateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
    // returns daily challenge with daily leaderboard, does not need auth

    const limited = await enforceRateLimit("daily_challenge", clientIp(request));
    if (limited) return limited;

    const currentChallenge = await getCurrentChallenge()
    
    const entries = await prisma.challengeRun.findMany({
        where: {challengeID: (currentChallenge.id), iterations: { lte: 100 }}, // daily challenges are limited to 100 steps and not converging ones are set to 101 steps
        orderBy: { iterations: "asc" },
        take: 10
    });

    return NextResponse.json({challengeID: currentChallenge.id, challenge: currentChallenge.name, leaderboard: entries});
}

