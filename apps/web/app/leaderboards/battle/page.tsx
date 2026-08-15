import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { BattleLeaderboard } from "./BattleLeaderboard";

export default async function Page() {
    const session = await auth();
    const players = await prisma.user.findMany({
      orderBy: { elo: "desc" },
      take: 20,
      select: { id: true, name: true, elo: true, gamesPlayed: true},
    });

    return <BattleLeaderboard players={players} currentUserId={session?.user?.id} />
}
