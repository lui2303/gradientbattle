import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const entry = await prisma.leaderboardEntry.create({"data": {"name": "Luis", "iterations": 42}})

    const entries = await prisma.leaderboardEntry.findMany({
        orderBy: { iterations: "desc" },
    });

    return NextResponse.json(entries);
}