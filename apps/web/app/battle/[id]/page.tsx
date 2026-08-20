import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BattleScreen from "./BattleScreen";
import { BattleSummary } from "./BattleSummary";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth()

    if (!session?.user?.name || !session.user.id) return null

    const battle = await prisma.battle.findUnique({ where: { id: id }, select: { status: true } })

    if (battle?.status === "evaluated") {
        return <BattleSummary battleID={id} userID={session.user.id} />
    }

    return (
        <BattleScreen username={session.user.name} userID={session.user.id} battleID={id} />
    );
}
