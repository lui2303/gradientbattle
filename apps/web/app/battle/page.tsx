import { auth } from "@/auth";
import BattleScreen from "./FindBattlePage";

export default async function Page() {
    const session = await auth()

    if(!session || !session.user || !session.user.name || !session.user.id) return

    return <BattleScreen username={session.user.name} userID={session.user.id}></BattleScreen>;
}
