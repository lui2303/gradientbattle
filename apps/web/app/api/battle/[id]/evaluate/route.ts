import { prisma } from "@/lib/prisma";
import { Point } from "@gradientbattle/core";
import { norm } from "@gradientbattle/core/src/math_helper";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { timingSafeEqual } from "node:crypto";
import { MAX_STEPS } from "@/app/constants";
import { calculateEloUpdate } from "./elo";

type BestRun = { iterations: number; distanceToOptimum: number; optimizerID: string; runID: string };

function hasValidServiceToken(request: Request): boolean {
    const expected = process.env.INTERNAL_SERVICE_TOKEN ?? "";
    if (!expected) return false;
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}

type SettledBattle = { player1Id: string; player2Id: string; player1EloDelta: number; player2EloDelta: number };

// The client reads eloDeltas[itsOwnUserId], so every 200 has to carry the same shape —
// including the responses where this request was not the one that did the evaluating.
function eloDeltasOf(battle: SettledBattle): Record<string, number> {
    return { [battle.player1Id]: battle.player1EloDelta, [battle.player2Id]: battle.player2EloDelta };
}

function compareBestRun(a: BestRun, b: BestRun): number {
    if (a.iterations !== b.iterations) return a.iterations - b.iterations;
    return a.distanceToOptimum - b.distanceToOptimum;
}

async function evaluateRuns(battleID: string, playerID: string): Promise<BestRun | undefined> {
    let bestRun: BestRun | undefined = undefined;

    const runs = await prisma.battleRun.findMany({ where: { battleID: battleID, playerId: playerID } });

    runs.forEach((run) => {
        if (run.bestRun) {
            const localBestRun = run.bestRun as { iterations: number; optimizerID: string };
            const candidate: BestRun = { iterations: localBestRun.iterations, optimizerID: localBestRun.optimizerID, distanceToOptimum: 0, runID: run.id };
            if (!bestRun || compareBestRun(candidate, bestRun) < 0) bestRun = candidate;
        } else {
            for (const [optimizerID, iterate] of Object.entries(run.lastIterate as Record<string, Point>)) {
                const candidate: BestRun = { optimizerID, distanceToOptimum: norm(iterate), iterations: MAX_STEPS, runID: run.id };
                if (!bestRun || compareBestRun(candidate, bestRun) < 0) bestRun = candidate;
            }
        }
    });

    return bestRun;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    //TODO: pull time interval from a config file
    //TODO: remove hard coded iteration check because there could be battles in the future with more or less than 100 iterations, where 101 iterations does not indicate no convergence
    //TODO: make user watch the whole animation before registering it or other solution, because otherwise once could bruteforce by starting and stopping really fast.
    
    const { id } = await params;

    const currentBattle = await prisma.battle.findUnique({ where: { id: id } });

    if (!currentBattle) return NextResponse.json({ error: "Battle does not exist in DB" }, { status: 422 });

    if (!hasValidServiceToken(request)) {
        const session = await auth();
        const uid = session?.user?.id;
        if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (uid !== currentBattle.player1Id && uid !== currentBattle.player2Id)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (currentBattle.status === 'evaluated') {
        return NextResponse.json({ winnerId: currentBattle.winnerId, winningRunId: currentBattle.winningRunId, status: 'evaluated', eloDeltas: eloDeltasOf(currentBattle) }, { status: 200 });
    }

    if (Date.now() <= currentBattle.endsAt.getTime()) return NextResponse.json({ error: "Battle has not concluded yet" }, { status: 422 });

    const firstPlayerBestRun = await evaluateRuns(currentBattle.id, currentBattle.player1Id);
    const secondPlayerBestRun = await evaluateRuns(currentBattle.id, currentBattle.player2Id);

    let winnerId: string | null = null;       // null = draw / nobody submitted
    let winningRunId: string | null = null;

    if (firstPlayerBestRun && secondPlayerBestRun) {
        const cmp = compareBestRun(firstPlayerBestRun, secondPlayerBestRun);
        if (cmp < 0) {
            winnerId = currentBattle.player1Id;
            winningRunId = firstPlayerBestRun.runID;
        } else if (cmp > 0) {
            winnerId = currentBattle.player2Id;
            winningRunId = secondPlayerBestRun.runID;
        } // cmp === 0 -> draw, both stay null
    } else if (firstPlayerBestRun) {
        winnerId = currentBattle.player1Id;        // only player 1 submitted
        winningRunId = firstPlayerBestRun.runID;
    } else if (secondPlayerBestRun) {
        winnerId = currentBattle.player2Id;        // only player 2 submitted
        winningRunId = secondPlayerBestRun.runID;
    } // neither submitted -> draw

    // 0 is the honest answer for the "nobody submitted" path below, which changes no elo.
    let deltaA = 0
    let deltaB = 0
    let claimedByUs = true

    await prisma.$transaction(async (tx) => {
        const claimed = await tx.battle.updateMany({ // prevent race conditions
            where: { id: currentBattle.id, status: { not: "evaluated" } },
            data: { status: "evaluated", winnerId, winningRunId },
        });
        if (claimed.count === 0) { claimedByUs = false; return null }

        if(!firstPlayerBestRun && !secondPlayerBestRun) { // no one submitted, remove battle from database
            await tx.battle.delete({
                where: {id: currentBattle.id}
            })
            return
        }

        const users = await tx.user.findMany({ where: { id: { in: [currentBattle.player1Id, currentBattle.player2Id] } } });
        const playerA = users.find(u => u.id === currentBattle.player1Id)!
        const playerB = users.find(u => u.id === currentBattle.player2Id)!

        const scoreA = winnerId == currentBattle.player1Id ? 1 : !winnerId ? 0.5 : 0

        const eloDiff = calculateEloUpdate(playerA, playerB, scoreA)

        deltaA = eloDiff[0]
        deltaB = eloDiff[1]

        await tx.user.update({
            where: { id: currentBattle.player1Id },
            data: {
                elo: playerA.elo + deltaA,
                peakElo: Math.max(playerA.peakElo, playerA.elo + deltaA),
                gamesPlayed: { increment: 1 },
            },
        })
        
        await tx.user.update({
            where: { id: currentBattle.player2Id },
            data: {
                elo: playerB.elo + deltaB,
                peakElo: Math.max(playerB.peakElo, playerB.elo + deltaB),
                gamesPlayed: { increment: 1 },
            },
        })

        await tx.battle.update({
            where: {id: currentBattle.id},
            data: {
                player1EloDelta: deltaA,
                player2EloDelta: deltaB
            }
        })
    });

    if (!claimedByUs) {
        const settled = await prisma.battle.findUnique({ where: { id: currentBattle.id } });
        if (!settled) return NextResponse.json({ error: "Battle does not exist in DB" }, { status: 422 });
        return NextResponse.json({ winnerId: settled.winnerId, winningRunId: settled.winningRunId, status: 'evaluated', eloDeltas: eloDeltasOf(settled) }, { status: 200 });
    }

    return NextResponse.json({ winnerId, winningRunId, status: 'evaluated', eloDeltas: {[currentBattle.player1Id]: deltaA, [currentBattle.player2Id]: deltaB}  }, { status: 200 });
}
