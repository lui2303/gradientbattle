import { prisma } from "@/lib/prisma";
import { BattleLeaderboard } from "./BattleLeaderboard";

export default async function Page() {
    const players = await prisma.user.findMany({
      orderBy: { elo: "desc" },
      take: 20,
      select: { id: true, name: true, elo: true},
    });

    return <BattleLeaderboard players={players}/>
}
