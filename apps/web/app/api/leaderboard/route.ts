import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentChallenge } from "../challenge";

export async function GET(req: Request) {
    const currentChallenge = await getCurrentChallenge()
    console.log(currentChallenge)
    
    const entries = await prisma.leaderboard.findMany({
        where: {challengeID: (currentChallenge ? currentChallenge.id : 1)}, 
        orderBy: { iterations: "asc" },
        take: 10
    });
    console.log(entries)
    return NextResponse.json({challenge: currentChallenge.name, leaderboard: entries});
}

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const currentChallenge = await getCurrentChallenge() // central to not get out of sync if run is submitted last second

    const { runID, name } = body;

    const run = await prisma.run.findUnique({where: { id: runID }})

    if (!run) return NextResponse.json({ error: `Couldn't find a run with ID: ${runID}`})
    
    if (!("challengeID" in run) || run["challengeID"] != currentChallenge.id) return NextResponse.json({error: "The submitted run does not match the current challenge ID"})
    
    if(!run.bestRun) return NextResponse.json({error: "Submitted run did not contain a converging run"})
    const iters = (run.bestRun as { optimizerID: string; iterations: number }).iterations

    const entry = await prisma.leaderboard.create({"data": {"name": name, "iterations": iters, challengeID: currentChallenge.id}})

    return NextResponse.json({message: `Submitted best run with id ${entry.id}`}, {status: 201})
}