import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentChallenge, getCurrentChallengeID } from "../challenge";
import { Leaderboard } from "@/app/components/Leaderboard";

export async function GET(req: Request) {
    const currentChallengeID = getCurrentChallengeID() // central to not get out of sync if run is submitted last second
    const currentChallenge = getCurrentChallenge()
    
    const entries = await prisma.leaderboard.findMany({
        where: {challengeID: currentChallengeID}, 
        orderBy: { iterations: "asc" },
        take: 10
    });

    return NextResponse.json({challenge: currentChallenge.name, leaderboard: entries});
}

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const currentChallengeID = getCurrentChallengeID() // central to not get out of sync if run is submitted last second

    const { runID, name } = body;

    const run = await prisma.run.findUnique({where: { id: runID }})

    if (!run) return NextResponse.json({ error: `Couldn't find a run with ID: ${runID}`})
    
    if (!("challengeID" in run) || run["challengeID"] != currentChallengeID) return NextResponse.json({error: "The submitted run does not match the current challenge ID"})
    
    const entry = await prisma.leaderboard.create({"data": {"name": name, "iterations": run.iterations, challengeID: currentChallengeID}})

    return NextResponse.json({message: `Submitted best run with id ${entry.id}`}, {status: 201})

}