import { prisma } from "@/lib/prisma";
import { functionList } from "@gradientbattle/core/src/functions/function_registry";

export async function getCurrentChallenge() {
    await generateDailyChallenge()
    return (await prisma.challenge.findFirst({ orderBy: { createdAt: "desc"} }))!
}

const CHALLENGES = functionList

export async function generateDailyChallenge() {
    const latest = await prisma.challenge.findFirst({ orderBy: { createdAt: "desc"} });
    const isOlderThanADay = !latest || Date.now() - latest.createdAt.getTime() >= 86_400_000;

    if(isOlderThanADay) {
        await prisma.challenge.create({data: {name: CHALLENGES[0]}})
    }
}

// There is currently a possible bug that if a user submits his run as the days switch it could possibly be registered for the next day which might contain a harder function and therefore could lead to cheats

// fixed step size of 100 for daily challenges
// add optimizer constraints (STARTING POINTS escpecially) to daily challenges