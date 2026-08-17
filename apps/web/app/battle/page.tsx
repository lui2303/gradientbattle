import { Suspense } from "react";
import { auth } from "@/auth";
import BattleScreen from "./FindBattlePage";
import { MatchHistoryCard, MatchHistoryCardSkeleton } from "./MatchHistoryCard";

export default async function Page() {
    const session = await auth()

    if(!session || !session.user || !session.user.name || !session.user.id) return

    return (
        <BattleScreen
            username={session.user.name}
            historyCard={
                <Suspense fallback={<MatchHistoryCardSkeleton />}>
                    <MatchHistoryCard userId={session.user.id} />
                </Suspense>
            }
        />
    );
}
