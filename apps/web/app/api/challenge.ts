import { prisma } from "@/lib/prisma";

export async function getCurrentChallenge() {
    await generateDailyChallenge()
    return (await prisma.challenge.findFirst({ orderBy: { createdAt: "desc"} }))!
}

const CHALLENGES = ["quadraticFunction", "matyasFunction"]

export async function generateDailyChallenge() {
    const latest = await prisma.challenge.findFirst({ orderBy: { createdAt: "desc"} });
    const isOlderThanADay = !latest || Date.now() - latest.createdAt.getTime() >= 86_400_000;

    if(isOlderThanADay) {
        await prisma.challenge.create({data: {name: CHALLENGES[0]}})
    }
}
