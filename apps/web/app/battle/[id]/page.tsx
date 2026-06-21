import { auth } from "@/auth";
import BattleScreen from "./BattleScreen";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth()

    if (!session?.user?.name || !session.user.id) return null

    return (
        <BattleScreen username={session.user.name} userID={session.user.id} battleID={id} />
    );
}
